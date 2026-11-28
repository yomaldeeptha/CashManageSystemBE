import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  applyEntityScopeToWhere,
  assertEntityScope,
  getEffectiveScope,
} from '../common/utils/scope.util';
import {
  formatIsoDate,
  parseDateOnly,
  roundMoney,
  toDecimal,
  toNumber,
  toPrismaDecimal,
  toPrismaRate,
} from '../common/utils/decimal.util';
import {
  CreateCashDepositDto,
  CreateCashierPaymentDto,
  CreateCashierSettlementDto,
  CreateCollectionReceiptDto,
  CreateMainCashierSettlementDto,
  CreateOutletBankDepositDto,
  CreatePayoutReimbursementDto,
  ExecuteDepositControlReconciliationDto,
  ImportBankStatementDto,
} from './dto/cash-deposit.dto';
import { ApprovalDecisionDto } from '../approvals/dto/approvals.dto';

@Injectable()
export class CashDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly fxResolver: ExchangeRateResolverService,
    private readonly numberSeries: NumberSeriesGeneratorService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  private async getCurrencyByCode(code: string) {
    const cur = await this.prisma.currency.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!cur) {
      throw new BadRequestException(`Currency "${code}" is not registered in Currency Master.`);
    }
    return cur;
  }

  /**
   * Resolves company/branch/outlet safely when Outlet or Branch fields are hidden on the UI.
   */
  private async resolveScopeWithFallback(
    user: AuthenticatedUser,
    input: { companyId: number; branchId?: number; outletId?: number },
  ) {
    let resolvedBranchId = input.branchId;
    let resolvedOutletId = input.outletId;

    if (!resolvedOutletId) {
      const outletWhere: Prisma.OutletWhereInput = {
        isActive: true,
        branch: { companyId: input.companyId },
      };
      if (resolvedBranchId) {
        outletWhere.branchId = resolvedBranchId;
      }
      const firstOutlet = await this.prisma.outlet.findFirst({
        where: outletWhere,
        orderBy: { id: 'asc' },
      });
      if (firstOutlet) {
        resolvedOutletId = firstOutlet.id;
        resolvedBranchId = resolvedBranchId || firstOutlet.branchId;
      }
    }

    if (!resolvedBranchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { companyId: input.companyId },
        orderBy: { id: 'asc' },
      });
      if (firstBranch) resolvedBranchId = firstBranch.id;
    }

    const scope = await assertEntityScope(this.prisma, user, {
      companyId: input.companyId,
      branchId: resolvedBranchId,
      outletId: resolvedOutletId,
    });

    return {
      companyId: scope.companyId,
      branchId: scope.branchId,
      outletId: scope.outletId || resolvedOutletId || 1,
    };
  }

  // ============================================================================
  // PROCESS 1 HELPERS: PENDING SECURITY ENVELOPES & LIVE BALANCE IN HAND
  // ============================================================================

  async listPendingEnvelopes(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.SalesReconciliationWhereInput = {
      linkedCashDepositId: null,
      status: { notIn: ['Cancelled', 'Reversed'] },
    };
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeBranch: true, includeOutlet: true },
    );

    const recons = await this.prisma.salesReconciliation.findMany({
      where,
      include: {
        company: true,
        branch: true,
        outlet: true,
        cashier: true,
        shift: true,
        lines: { include: { currency: true, paymentType: true } },
      },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
      take: 100,
    });

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const localCur = await this.prisma.currency.findUnique({ where: { code: 'MVR' } });
    const usdToLocalRate = localCur && toNumber(localCur.rateToBase, 6) > 0
      ? new Decimal(1).div(toDecimal(localCur.rateToBase))
      : new Decimal(15.42);

    const envelopes = recons.map((r) => {
      const cashLines = r.lines.filter((l) =>
        String(l.paymentTypeName || l.paymentType?.name || '').toLowerCase().includes('cash'),
      );
      const effectiveLines = cashLines.length > 0 ? cashLines : r.lines;

      const byCurrency = new Map<
        string,
        { currency: string; submittedAmount: Decimal; exRate: Decimal; baseAmount: Decimal }
      >();

      for (const line of effectiveLines) {
        const code = line.currency?.code || r.baseCurrencyCode || baseInfo.code;
        const amt = toDecimal(line.amount);
        const rate = toDecimal(line.exRate || 1);
        const baseAmt = toDecimal(line.baseAmount || amt.times(rate));
        const cur = byCurrency.get(code);
        if (cur) {
          cur.submittedAmount = cur.submittedAmount.plus(amt);
          cur.baseAmount = cur.baseAmount.plus(baseAmt);
        } else {
          byCurrency.set(code, {
            currency: code,
            submittedAmount: amt,
            exRate: rate,
            baseAmount: baseAmt,
          });
        }
      }

      if (byCurrency.size === 0) {
        const fallbackAmt = toDecimal(r.totalCollectionBase || r.netSales || 0);
        byCurrency.set(r.baseCurrencyCode || baseInfo.code, {
          currency: r.baseCurrencyCode || baseInfo.code,
          submittedAmount: fallbackAmt,
          exRate: new Decimal(1),
          baseAmount: fallbackAmt,
        });
      }

      const currencies = Array.from(byCurrency.values()).map((c) => ({
        currency: c.currency,
        submittedAmount: toNumber(c.submittedAmount),
        exRate: toNumber(c.exRate, 6),
        baseAmount: toNumber(c.baseAmount),
      }));

      const totalSubmittedBase = currencies.reduce((s, c) => s + c.baseAmount, 0);

      // Compute suggested default denomination breakdown per currency for quick verification
      const denomSteps: Record<string, number[]> = {
        USD: [100, 50, 20, 10, 5, 1],
        EUR: [100, 50, 20, 10, 5],
        MVR: [1000, 500, 100, 50, 20, 10, 5],
      };
      const denominations: Record<string, Record<string, number>> = {};
      for (const c of currencies) {
        const steps = denomSteps[c.currency] || [100, 50, 20, 10, 5, 1];
        let rem = Math.floor(c.submittedAmount);
        const counts: Record<string, number> = {};
        for (const d of steps) {
          if (rem >= d) {
            counts[String(d)] = Math.floor(rem / d);
            rem = rem % d;
          }
        }
        denominations[c.currency] = counts;
      }

      return {
        envelopeNo: `ENV-${r.docNo}`,
        sourceReconId: r.id,
        reconDocNo: r.docNo,
        docDate: formatIsoDate(r.docDate),
        shiftName: r.shift?.name || r.shiftStatus || 'Day-End Closing',
        companyId: r.companyId,
        company: r.company.name,
        branchId: r.branchId,
        branch: r.branch.name,
        outletId: r.outletId,
        outlet: r.outlet.name,
        submittedCashierId: r.cashierId || null,
        submittedCashier: r.cashier?.name || r.lines[0]?.cashierName || 'Outlet Cashier',
        submittedCashierEmpNo: r.cashier?.empNo || '',
        totalSubmittedBase: Number(totalSubmittedBase.toFixed(2)),
        totalSubmittedLocal: Number(new Decimal(totalSubmittedBase).times(usdToLocalRate).toFixed(2)),
        localCurrencyCode: 'MVR',
        baseCurrency: r.baseCurrencyCode || baseInfo.code,
        currencies,
        denominations,
      };
    });

    return envelopes;
  }

  async getBalanceInHand(
    user: AuthenticatedUser,
    query?: { currency?: string; companyId?: number; floatAccountId?: number; cashierLevel?: string },
  ) {
    const requestedCurrency = (query?.currency || 'USD').trim().toUpperCase();
    const cur = await this.prisma.currency.findUnique({ where: { code: requestedCurrency } });
    const floats = await this.prisma.floatAccount.findMany({
      where: { isActive: true },
      include: { currency: true },
    });

    const isMain = String(query?.cashierLevel || '').toLowerCase().includes('main');

    // Currency-wise available balance in hand
    let matchingFloats = floats.filter((f) => f.currency.code.toUpperCase() === requestedCurrency);
    if (query?.floatAccountId) {
      const exact = floats.find((f) => f.id === query.floatAccountId);
      if (exact && exact.currency.code.toUpperCase() === requestedCurrency) {
        matchingFloats = [exact];
      }
    } else if (matchingFloats.length > 1) {
      const levelFiltered = matchingFloats.filter((f) => {
        const name = f.name.toLowerCase();
        return isMain ? name.includes('main') || name.includes('central') || name.includes('treasury') : !name.includes('central');
      });
      if (levelFiltered.length > 0) matchingFloats = levelFiltered;
    }

    let balanceInCurrency = matchingFloats.reduce(
      (sum, f) => sum.plus(toDecimal(f.currentBalance)),
      new Decimal(0),
    );

    // If no float account exists for this currency, compute net cash collections minus payments in this currency
    if (matchingFloats.length === 0 && cur) {
      const [colAgg, payAgg, mainPayAgg] = await Promise.all([
        this.prisma.cashDepositCurrency.aggregate({
          where: {
            currencyId: cur.id,
            cashDeposit: { status: { in: ['Approved', 'Submitted', 'Posted'] } },
          },
          _sum: { amount: true },
        }),
        this.prisma.cashierPayment.aggregate({
          where: { currencyId: cur.id, approvalStatus: { notIn: ['Rejected', 'Cancelled'] } },
          _sum: { amount: true },
        }),
        this.prisma.mainCashierPayment.aggregate({
          where: { currencyId: cur.id, approvalStatus: { notIn: ['Rejected', 'Cancelled'] } },
          _sum: { amount: true },
        }),
      ]);
      balanceInCurrency = toDecimal(colAgg._sum.amount ?? 0)
        .minus(toDecimal(payAgg._sum.amount ?? 0))
        .minus(toDecimal(mainPayAgg._sum.amount ?? 0));
      if (balanceInCurrency.lt(0)) balanceInCurrency = new Decimal(0);
    }

    // Total across all float accounts converted to Base (USD) and Local (MVR)
    let totalBaseUSD = new Decimal(0);
    for (const f of floats) {
      const { baseAmount } = await this.fxResolver.convertToBase(toDecimal(f.currentBalance), f.currency.code);
      totalBaseUSD = totalBaseUSD.plus(baseAmount);
    }

    const mvrCur = await this.prisma.currency.findUnique({ where: { code: 'MVR' } });
    const usdToMvr = mvrCur && toNumber(mvrCur.rateToBase, 6) > 0
      ? new Decimal(1).div(toDecimal(mvrCur.rateToBase))
      : new Decimal(15.42);
    const totalLocalMVR = roundMoney(totalBaseUSD.times(usdToMvr));

    return {
      currency: requestedCurrency,
      balanceInHand: toNumber(roundMoney(balanceInCurrency)),
      totalBalanceBaseUSD: toNumber(roundMoney(totalBaseUSD)),
      localCurrencyCode: 'MVR',
      totalBalanceLocalMVR: toNumber(totalLocalMVR),
      usdToLocalRate: toNumber(usdToMvr, 6),
    };
  }

  // ============================================================================
  // TAB 1: OUTLET CASH COLLECTION (SCREEN 01)
  // ============================================================================

  private async serializeDeposit(
    d: Prisma.CashDepositGetPayload<{
      include: {
        company: true;
        branch: true;
        outlet: true;
        cashier: true;
        cashCollector: true;
        paymentType: true;
        currencies: { include: { currency: true } };
        denominations: { include: { currency: true } };
      };
    }>,
    preloaded?: {
      attachments?: Array<{ id: number; fileName: string; fileSizeLabel: string; docType: string; remark: string | null; createdAt: Date; uploadedByName: string }>;
      auditLogs?: Array<{ step: string; performedByName: string; createdAt: Date; toStatus: string | null; action: string }>;
    },
  ) {
    const [attachments, auditLogs] = preloaded
      ? [preloaded.attachments || [], preloaded.auditLogs || []]
      : await Promise.all([
          this.prisma.documentAttachment.findMany({
            where: { entityType: 'cash_deposit', entityId: d.id },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.auditLog.findMany({
            where: { entityType: 'cash_deposit', entityId: d.id },
            orderBy: { createdAt: 'asc' },
          }),
        ]);

    const denomMap: Record<string, Record<string, number>> = {};
    for (const dn of d.denominations) {
      const code = dn.currency.code;
      if (!denomMap[code]) denomMap[code] = {};
      const val = toNumber(dn.denominationValue, 2);
      denomMap[code][Number.isInteger(val) ? String(val) : String(val)] = dn.noteCount;
    }

    return {
      id: d.id,
      docNo: d.docNo,
      docDate: formatIsoDate(d.docDate),
      collectionDate: formatIsoDate(d.collectionDate),
      collectionTime: d.collectionTime,
      companyId: d.companyId,
      company: d.company.name,
      branchId: d.branchId,
      branch: d.branch.name,
      outletId: d.outletId,
      outlet: d.outlet.name,
      cashierId: d.cashierId,
      cashier: d.cashier.name,
      cashierEmpNo: d.cashier.empNo,
      cashCollectorId: d.cashCollectorId,
      cashCollector: d.cashCollector.name,
      cashCollectorEmpNo: d.cashCollector.empNo,
      createdById: d.createdById ?? d.createUserId ?? null,
      paymentTypeId: d.paymentTypeId,
      collectionType: d.paymentType.name,
      envelopeNo: d.envelopeNo,
      collectionMode: d.collectionMode || 'envelope',
      sourceReconId: d.sourceReconId || null,
      receiveFrom: d.receiveFrom || '',
      baseCurrency: d.baseCurrencyCode,
      totalSubmittedBase: toNumber(d.totalSubmittedBase),
      totalBaseUSD: toNumber(d.totalBaseAmount),
      totalBaseAmount: toNumber(d.totalBaseAmount),
      totalDifferenceBase: toNumber(d.totalDifferenceBase),
      differenceNarration: d.differenceNarration || '',
      isReconciled: d.isReconciled || false,
      status: d.status,
      remark: d.remark || '',
      currencies: d.currencies.map((c) => ({
        id: c.id,
        currency: c.currency.code,
        submittedAmount: toNumber(c.submittedAmount),
        amount: toNumber(c.amount),
        difference: toNumber(c.difference),
        exRate: toNumber(c.exRate, 6),
        baseAmount: toNumber(c.baseAmount),
      })),
      denominations: denomMap,
      hasAttachment: attachments.length > 0,
      attachmentName: attachments[0]?.fileName || null,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSizeLabel,
        type: a.docType,
        docType: a.docType,
        remark: a.remark,
        uploadDate: formatIsoDate(a.createdAt),
        uploadedBy: a.uploadedByName,
        downloadUrl: `/api/v1/attachments/${a.id}/download`,
      })),
      auditTrail: auditLogs.map((log) => ({
        step: log.step,
        user: log.performedByName,
        time: log.createdAt.toISOString(),
        status: log.toStatus || log.action,
      })),
    };
  }

  async listDeposits(
    user: AuthenticatedUser,
    query?: {
      companyId?: number;
      outletId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 100));

    const where: Prisma.CashDepositWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeBranch: true, includeOutlet: true },
    );
    if (query?.status && query.status !== 'all') {
      where.status = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { envelopeNo: { contains: query.search, mode: 'insensitive' } },
        { outlet: { name: { contains: query.search, mode: 'insensitive' } } },
        { cashier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.cashDeposit.count({ where }),
      this.prisma.cashDeposit.findMany({
        where,
        include: {
          company: true,
          branch: true,
          outlet: true,
          cashier: true,
          cashCollector: true,
          paymentType: true,
          currencies: { include: { currency: true } },
          denominations: { include: { currency: true } },
        },
        orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const [allAttachments, allLogs] =
      ids.length > 0
        ? await Promise.all([
            this.prisma.documentAttachment.findMany({
              where: { entityType: 'cash_deposit', entityId: { in: ids } },
              orderBy: { createdAt: 'desc' },
            }),
            this.prisma.auditLog.findMany({
              where: { entityType: 'cash_deposit', entityId: { in: ids } },
              orderBy: { createdAt: 'asc' },
            }),
          ])
        : [[], []];

    const attById = new Map<number, typeof allAttachments>();
    for (const a of allAttachments) {
      const bucket = attById.get(a.entityId) || [];
      bucket.push(a);
      attById.set(a.entityId, bucket);
    }
    const logById = new Map<number, typeof allLogs>();
    for (const l of allLogs) {
      const bucket = logById.get(l.entityId) || [];
      bucket.push(l);
      logById.set(l.entityId, bucket);
    }

    const items = await Promise.all(
      rows.map((r) =>
        this.serializeDeposit(r, {
          attachments: attById.get(r.id) || [],
          auditLogs: logById.get(r.id) || [],
        }),
      ),
    );
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getDeposit(user: AuthenticatedUser, id: number) {
    const deposit = await this.prisma.cashDeposit.findUnique({
      where: { id },
      include: {
        company: true,
        branch: true,
        outlet: true,
        cashier: true,
        cashCollector: true,
        paymentType: true,
        currencies: { include: { currency: true } },
        denominations: { include: { currency: true } },
      },
    });
    if (!deposit) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, {
      companyId: deposit.companyId,
      branchId: deposit.branchId,
      outletId: deposit.outletId,
    });
    return this.serializeDeposit(deposit);
  }

  async createDeposit(user: AuthenticatedUser, dto: CreateCashDepositDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    if (!scope.outletId) {
      throw new BadRequestException('Outlet is required for Outlet Cash Collection.');
    }

    const [cashier, collector, paymentType] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: dto.cashierId } }),
      this.prisma.employee.findUnique({ where: { id: dto.cashCollectorId } }),
      this.prisma.paymentType.findUnique({ where: { id: dto.paymentTypeId || 1 } }),
    ]);
    if (!cashier) throw new BadRequestException(`Cashier Employee ID ${dto.cashierId} does not exist.`);
    if (!collector) throw new BadRequestException(`Cash Collector Employee ID ${dto.cashCollectorId} does not exist.`);
    if (!paymentType) throw new BadRequestException(`Payment Type ID ${dto.paymentTypeId || 1} does not exist.`);
    if (!dto.currencies || dto.currencies.length === 0) {
      throw new BadRequestException('At least one currency line is required.');
    }

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const resolvedLines: Array<{
      currencyId: number;
      currencyCode: string;
      submittedAmount: Decimal;
      amount: Decimal;
      difference: Decimal;
      rate: Decimal;
      baseAmount: Decimal;
      submittedBaseAmount: Decimal;
    }> = [];

    let totalBase = new Decimal(0);
    let totalSubmittedBase = new Decimal(0);
    let hasRowDifference = false;
    const isEnvelopeMode = (dto.collectionMode || 'envelope') === 'envelope';

    for (const line of dto.currencies) {
      const cur = await this.getCurrencyByCode(line.currency);
      const amount = toDecimal(line.amount);
      const submittedAmount =
        line.submittedAmount !== undefined
          ? toDecimal(line.submittedAmount)
          : isEnvelopeMode
            ? amount
            : new Decimal(0);
      if (amount.lt(0) || submittedAmount.lt(0)) {
        throw new BadRequestException(`Amount for ${cur.code} cannot be negative.`);
      }
      // Difference = Submitted Amount - Receipt Amount (per Process 1 spec)
      const difference = isEnvelopeMode ? roundMoney(submittedAmount.minus(amount)) : new Decimal(0);
      if (difference.abs().gt(0.009)) {
        hasRowDifference = true;
      }
      const { rate, baseAmount } = await this.fxResolver.convertToBase(amount, cur.code);
      const submittedBaseAmount = roundMoney(submittedAmount.times(rate));
      totalBase = totalBase.plus(baseAmount);
      totalSubmittedBase = totalSubmittedBase.plus(submittedBaseAmount);
      resolvedLines.push({
        currencyId: cur.id,
        currencyCode: cur.code,
        submittedAmount,
        amount,
        difference,
        rate,
        baseAmount,
        submittedBaseAmount,
      });
    }

    if (totalBase.lte(0)) {
      throw new BadRequestException('Cash Deposit total amount must be greater than zero.');
    }

    const totalDifferenceBase = isEnvelopeMode
      ? roundMoney(totalSubmittedBase.minus(totalBase))
      : new Decimal(0);
    const hasDifference = hasRowDifference || totalDifferenceBase.abs().gt(0.009);

    if (hasDifference) {
      if (!dto.differenceNarration || !dto.differenceNarration.trim()) {
        throw new BadRequestException(
          'Difference Narration is mandatory when there is a difference between Submitted Amount and Receipt Amount.',
        );
      }
      if (dto.status === 'Handover Verified') {
        throw new BadRequestException(
          'Transactions with a difference cannot be saved directly. Save as Draft or Submit for review and approval.',
        );
      }
    }

    // Prevent client-side status spoofing; newly created deposits may only be Draft or Submitted
    const status = dto.status === 'Draft' ? 'Draft' : 'Submitted';

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.cashDeposit.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-CCD-COLLECT', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'CCD-2026-',
            });

      const dep = await tx.cashDeposit.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          collectionDate: parseDateOnly(dto.collectionDate || dto.docDate),
          collectionTime: dto.collectionTime || '10:00 AM',
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId!,
          cashierId: cashier.id,
          cashCollectorId: collector.id,
          paymentTypeId: paymentType.id,
          envelopeNo: dto.envelopeNo.trim(),
          collectionMode: dto.collectionMode || 'envelope',
          sourceReconId: dto.sourceReconId || null,
          receiveFrom: dto.receiveFrom || `${cashier.name} (${cashier.empNo})`,
          baseCurrencyCode: baseInfo.code,
          totalSubmittedBase: toPrismaDecimal(totalSubmittedBase),
          totalBaseAmount: toPrismaDecimal(totalBase),
          totalDifferenceBase: toPrismaDecimal(totalDifferenceBase),
          differenceNarration: dto.differenceNarration?.trim() || null,
          status,
          remark: dto.remark || '',
          createdById: user.id,
          updatedById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      await tx.cashDepositCurrency.createMany({
        data: resolvedLines.map((l) => ({
          cashDepositId: dep.id,
          currencyId: l.currencyId,
          submittedAmount: toPrismaDecimal(l.submittedAmount),
          amount: toPrismaDecimal(l.amount),
          difference: toPrismaDecimal(l.difference),
          exRate: toPrismaRate(l.rate),
          baseAmount: toPrismaDecimal(l.baseAmount),
          createUserId: user.id,
          updateUserId: user.id,
        })),
      });

      if (dto.sourceReconId) {
        await tx.salesReconciliation.updateMany({
          where: { id: dto.sourceReconId, linkedCashDepositId: null },
          data: { linkedCashDepositId: dep.id, updateUserId: user.id },
        });
      }

      if (dto.denominations) {
        const denomRows: Prisma.CashDepositDenominationCreateManyInput[] = [];
        for (const [curCode, counts] of Object.entries(dto.denominations)) {
          const cur = await tx.currency.findUnique({ where: { code: curCode.toUpperCase() } });
          if (!cur || !counts) continue;
          for (const [denomVal, qty] of Object.entries(counts)) {
            const count = Math.max(0, Math.floor(Number(qty) || 0));
            if (count > 0) {
              denomRows.push({
                cashDepositId: dep.id,
                currencyId: cur.id,
                denominationValue: toPrismaDecimal(denomVal),
                noteCount: count,
                createUserId: user.id,
                updateUserId: user.id,
              });
            }
          }
        }
        if (denomRows.length > 0) {
          await tx.cashDepositDenomination.createMany({ data: denomRows });
        }
      }

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'CashDeposit',
          recordId: dep.id,
          recordCode: dep.docNo,
          newValues: { ...dep, currencies: resolvedLines },
          actor: user,
          tx,
        });
      }

      if (status === 'Submitted') {
        await this.approvalsService.initiateApproval({
          entityType: 'cash_deposit',
          documentKey: 'cashCollectionDeposit',
          entityId: dep.id,
          docNo: dep.docNo,
          title: `Cash Handover: ${dep.envelopeNo}`,
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          submittedById: user.id,
          amountBase: toNumber(totalBase),
          baseCurrencyCode: baseInfo.code,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'cash_deposit',
        entityId: dep.id,
        docNo: dep.docNo,
        action: status === 'Draft' ? 'SAVE_DRAFT' : 'SUBMIT',
        step:
          status === 'Draft'
            ? 'Created & Saved Draft'
            : `Submitted Cash Collection Slip (${dep.envelopeNo})`,
        toStatus: status,
        performedById: user.id,
        performedByName: `${user.fullName}${user.empNo ? ` (${user.empNo})` : ''}`,
        remarks: dto.remark || null,
        tx,
      });

      return dep.id;
    });

    return this.getDeposit(user, createdId);
  }

  async submitDeposit(user: AuthenticatedUser, id: number) {
    const dep = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, dep);
    if (!['Draft', 'Rejected'].includes(dep.status)) {
      throw new BadRequestException(`Cannot submit Cash Deposit in status "${dep.status}".`);
    }

    await this.prisma.$transaction(async (tx) => {
      const next = await tx.cashDeposit.update({
        where: { id },
        data: { status: 'Submitted', updatedById: user.id, updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'STATUS_CHANGE',
          tableName: 'CashDeposit',
          recordId: id,
          recordCode: dep.docNo,
          oldValues: dep,
          newValues: next,
          description: `Submitted Cash Collection Slip ${dep.docNo} for Maker-Checker Review`,
          actor: user,
          tx,
        });
      }
      await this.approvalsService.initiateApproval({
        entityType: 'cash_deposit',
        documentKey: 'cashCollectionDeposit',
        entityId: dep.id,
        docNo: dep.docNo,
        title: `Cash Handover: ${dep.envelopeNo}`,
        companyId: dep.companyId,
        branchId: dep.branchId,
        outletId: dep.outletId,
        submittedById: user.id,
        amountBase: toNumber(dep.totalBaseAmount),
        baseCurrencyCode: dep.baseCurrencyCode,
        tx,
      });
      await this.auditService.log({
        entityType: 'cash_deposit',
        entityId: id,
        docNo: dep.docNo,
        action: 'SUBMIT',
        step: 'Submitted Cash Collection Slip for Maker-Checker Review',
        fromStatus: dep.status,
        toStatus: 'Submitted',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    return this.getDeposit(user, id);
  }

  async cancelDeposit(user: AuthenticatedUser, id: number, reason?: string) {
    const dep = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, dep);
    if (['Approved', 'Posted', 'Cancelled', 'Reversed'].includes(dep.status)) {
      throw new BadRequestException(`Cannot cancel Cash Deposit in status "${dep.status}".`);
    }
    const note = reason?.trim() || 'Cancelled by authorized user';
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.cashDeposit.update({
        where: { id },
        data: {
          status: 'Cancelled',
          remark: `${dep.remark ? `${dep.remark} | ` : ''}Cancelled: ${note}`,
          updatedById: user.id,
          updateUserId: user.id,
        },
      });
      await tx.approvalInstance.updateMany({
        where: {
          entityType: 'cash_deposit',
          entityId: id,
          status: { in: ['Pending', 'In Review'] },
        },
        data: { status: 'Cancelled', completedAt: new Date(), updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'CANCEL',
          tableName: 'CashDeposit',
          recordId: id,
          recordCode: dep.docNo,
          oldValues: dep,
          newValues: next,
          description: `Cancelled Cash Deposit ${dep.docNo}: ${note}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'cash_deposit',
        entityId: id,
        docNo: dep.docNo,
        action: 'CANCEL',
        step: `Cancelled Cash Deposit ${dep.docNo}`,
        fromStatus: dep.status,
        toStatus: 'Cancelled',
        performedById: user.id,
        performedByName: user.fullName,
        remarks: note,
        tx,
      });
    });
    return this.getDeposit(user, id);
  }

  async postDeposit(user: AuthenticatedUser, id: number) {
    const dep = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, dep);
    if (dep.status !== 'Approved') {
      throw new BadRequestException(`Only Approved Cash Deposits can be posted (current: "${dep.status}").`);
    }
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.cashDeposit.update({
        where: { id },
        data: { status: 'Posted', updatedById: user.id, updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'POST',
          tableName: 'CashDeposit',
          recordId: id,
          recordCode: dep.docNo,
          oldValues: dep,
          newValues: next,
          description: `Posted Cash Deposit ${dep.docNo} to General Ledger`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'cash_deposit',
        entityId: id,
        docNo: dep.docNo,
        action: 'POST',
        step: `Posted Cash Deposit ${dep.docNo} to General Ledger`,
        fromStatus: dep.status,
        toStatus: 'Posted',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });
    return this.getDeposit(user, id);
  }

  async reverseDeposit(user: AuthenticatedUser, id: number, reason?: string) {
    const dep = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, dep);
    if (dep.status !== 'Posted') {
      throw new BadRequestException(`Only Posted Cash Deposits can be reversed (current: "${dep.status}").`);
    }
    const linkedBankCount = await this.prisma.outletBankDepositItem.count({
      where: { cashDepositId: id },
    });
    if (linkedBankCount > 0) {
      throw new BadRequestException(
        `Cannot reverse Cash Deposit ${dep.docNo} because it is already included in a posted Bank Deposit batch.`,
      );
    }
    const note = reason?.trim() || 'Reversed by Finance Controller';
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.cashDeposit.update({
        where: { id },
        data: {
          status: 'Reversed',
          remark: `${dep.remark ? `${dep.remark} | ` : ''}Reversed: ${note}`,
          updatedById: user.id,
          updateUserId: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'REVERSE',
          tableName: 'CashDeposit',
          recordId: id,
          recordCode: dep.docNo,
          oldValues: dep,
          newValues: next,
          description: `Reversed Posted Cash Deposit ${dep.docNo}: ${note}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'cash_deposit',
        entityId: id,
        docNo: dep.docNo,
        action: 'REVERSE',
        step: `Reversed Cash Deposit ${dep.docNo}`,
        fromStatus: dep.status,
        toStatus: 'Reversed',
        performedById: user.id,
        performedByName: user.fullName,
        remarks: note,
        tx,
      });
    });
    return this.getDeposit(user, id);
  }

  async decideDeposit(user: AuthenticatedUser, id: number, dto: ApprovalDecisionDto) {
    const dep = await this.prisma.cashDeposit.findUnique({ where: { id } });
    if (!dep) throw new NotFoundException(`Cash Deposit #${id} not found.`);
    await assertEntityScope(this.prisma, user, dep);
    return this.approvalsService.decideByEntity(user, 'cash_deposit', id, dto);
  }

  // ============================================================================
  // TAB 2: CASHIER PAYMENT / SPENDING VOUCHER (CONSOLIDATED ASSISTANT & MAIN)
  // ============================================================================

  async listConsolidatedPayments(
    user: AuthenticatedUser,
    query?: {
      companyId?: number;
      outletId?: string;
      cashierLevel?: string;
      pendingOnly?: boolean;
      status?: string;
      type?: string;
      search?: string;
    },
  ) {
    const [assistantList, mainList] = await Promise.all([
      this.listCashierPayments(user, {
        companyId: query?.companyId,
        outletId: query?.outletId,
        status: query?.status,
        type: query?.type,
        search: query?.search,
      }),
      this.listMainCashierPayments(user, {
        companyId: query?.companyId,
        outletId: query?.outletId,
        search: query?.search,
      }),
    ]);

    let merged = [
      ...assistantList.map((p) => ({
        ...p,
        sourceTable: 'cashier_payment' as const,
        cashierLevel: p.cashierLevel || 'Assistant Cashier',
      })),
      ...mainList.map((p) => ({
        ...p,
        sourceTable: 'main_cashier_payment' as const,
        cashierLevel: p.cashierLevel || 'Main Cashier',
      })),
    ];

    if (query?.cashierLevel && query.cashierLevel !== 'all') {
      const targetLevel = query.cashierLevel.toLowerCase();
      merged = merged.filter((p) => String(p.cashierLevel || '').toLowerCase() === targetLevel);
    }
    if (query?.type && query.type !== 'all') {
      const targetType = query.type.toLowerCase();
      merged = merged.filter((p) => String(p.cashAdvanceType || '').toLowerCase() === targetType);
    }
    if (query?.status && query.status !== 'all') {
      const targetStatus = query.status.toLowerCase();
      merged = merged.filter((p) => String(p.approvalStatus || '').toLowerCase() === targetStatus);
    }
    if (query?.pendingOnly) {
      merged = merged.filter(
        (p) =>
          !p.isReimbursed &&
          ['draft', 'submitted', 'pending', 'in review'].includes(String(p.approvalStatus || '').toLowerCase()),
      );
    }

    merged.sort((a, b) => {
      const da = String(a.paymentDate || a.docDate || '');
      const db = String(b.paymentDate || b.docDate || '');
      if (db !== da) return db.localeCompare(da);
      return Number(b.id) - Number(a.id);
    });

    return merged;
  }

  async listCashierPayments(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; status?: string; type?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashierPaymentWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.status && query.status !== 'all') {
      where.approvalStatus = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.type && query.type !== 'all') {
      where.cashAdvanceType = { equals: query.type, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { paymentVoucherNo: { contains: query.search, mode: 'insensitive' } },
        { vendorName: { contains: query.search, mode: 'insensitive' } },
        { requesterName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.cashierPayment.findMany({
      where,
      include: { company: true, branch: true, outlet: true, currency: true },
      orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((p) => ({
      id: p.id,
      sourceTable: 'cashier_payment' as const,
      docNo: p.docNo,
      docDate: formatIsoDate(p.docDate),
      paymentVoucherNo: p.paymentVoucherNo,
      paymentDate: formatIsoDate(p.paymentDate),
      companyId: p.companyId,
      company: p.company.name,
      branchId: p.branchId,
      branch: p.branch.name,
      outletId: p.outletId,
      outlet: p.outlet.name,
      cashierLevel: p.cashierLevel || 'Assistant Cashier',
      payeeType: p.payeeType || 'Vendor',
      payeeEmployeeId: p.payeeEmployeeId || null,
      isReimbursed: p.isReimbursed || false,
      reimbursedAmount: toNumber(p.reimbursedAmount),
      cashier: p.cashierName,
      requester: p.requesterName,
      vendor: p.vendorName,
      department: p.departmentName,
      floatAccount: p.floatAccountName,
      transactionCurrency: p.currency.code,
      cashAdvanceType: p.cashAdvanceType,
      amount: toNumber(p.amount),
      baseCurrency: p.baseCurrencyCode,
      baseAmount: toNumber(p.baseAmount),
      totalBalanceInHand: toNumber(p.totalBalanceInHand),
      balanceCurrency: p.currency.code,
      receiptNumber: p.receiptNumber || '',
      narration: p.narration || '',
      denominations: p.denominations || {},
      approvalStatus: p.approvalStatus,
      approvedBy: p.approvedByName || 'Pending Checker Audit',
    }));
  }

  async createCashierPayment(user: AuthenticatedUser, dto: CreateCashierPaymentDto) {
    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const cur = await this.getCurrencyByCode(dto.transactionCurrency);
    const { baseCurrency, baseAmount } = await this.fxResolver.convertToBase(dto.amount, cur.code);

    const created = await this.prisma.$transaction(async (tx) => {
      let floatAcc = dto.floatAccountId
        ? await tx.floatAccount.findUnique({ where: { id: dto.floatAccountId } })
        : dto.floatAccount
          ? await tx.floatAccount.findFirst({ where: { name: { equals: dto.floatAccount, mode: 'insensitive' } } })
          : null;

      // If selected float account currency differs, find an active float account matching transaction currency
      if (floatAcc && floatAcc.currencyId !== cur.id) {
        const currencyFloat = await tx.floatAccount.findFirst({
          where: { currencyId: cur.id, isActive: true },
          orderBy: { id: 'asc' },
        });
        floatAcc = currencyFloat;
      }

      let balanceAfter = new Decimal(0);
      if (floatAcc) {
        const deductAmt = toPrismaDecimal(dto.amount);
        const debited = await tx.floatAccount.updateMany({
          where: { id: floatAcc.id, currentBalance: { gte: deductAmt } },
          data: { currentBalance: { decrement: deductAmt }, updateUserId: user.id },
        });
        if (debited.count === 0) {
          throw new BadRequestException(
            `Insufficient float balance in "${floatAcc.name}". Available: ${toNumber(floatAcc.currentBalance)}, Requested: ${dto.amount}.`,
          );
        }
        const updatedFloat = await tx.floatAccount.findUnique({ where: { id: floatAcc.id } });
        balanceAfter = toDecimal(updatedFloat?.currentBalance ?? 0);
        if (this.changeLogService && updatedFloat) {
          await this.changeLogService.logUpdate({
            tableName: 'FloatAccount',
            recordId: floatAcc.id,
            recordCode: floatAcc.code,
            oldValues: floatAcc,
            newValues: updatedFloat,
            description: `Deducted ${cur.code} ${dto.amount} for Cashier Payment`,
            actor: user,
            tx,
          });
        }
      }

      const docNo =
        dto.docNo && !(await tx.cashierPayment.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-CCD-PAY', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'CPAY-2026-',
            });

      const voucherNo =
        dto.paymentVoucherNo &&
        !(await tx.cashierPayment.findUnique({ where: { paymentVoucherNo: dto.paymentVoucherNo } }))
          ? dto.paymentVoucherNo
          : `PV-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const resolvedPayeeType =
        dto.payeeType ||
        (String(dto.cashAdvanceType || '').toLowerCase().includes('employee') ? 'Employee' : 'Vendor');

      const payment = await tx.cashierPayment.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          paymentVoucherNo: voucherNo,
          paymentDate: parseDateOnly(dto.paymentDate || dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          cashierLevel: dto.cashierLevel || 'Assistant Cashier',
          payeeType: resolvedPayeeType,
          payeeEmployeeId: dto.payeeEmployeeId || null,
          cashierId: dto.cashierId || user.employeeId || null,
          cashierName: dto.cashierName || user.fullName,
          requesterId: dto.requesterId || null,
          requesterName: dto.requester || user.fullName,
          vendorId: resolvedPayeeType === 'Vendor' ? dto.vendorId || null : null,
          vendorName: dto.vendor,
          departmentId: dto.departmentId || null,
          departmentName: dto.department || 'Operations',
          floatAccountId: floatAcc?.id || null,
          floatAccountName: floatAcc?.name || dto.floatAccount || 'Primary Float',
          currencyId: cur.id,
          cashAdvanceType: dto.cashAdvanceType,
          amount: toPrismaDecimal(dto.amount),
          baseCurrencyCode: baseCurrency,
          baseAmount: toPrismaDecimal(baseAmount),
          totalBalanceInHand: toPrismaDecimal(balanceAfter),
          receiptNumber: dto.receiptNumber || null,
          narration: dto.narration || '',
          denominations: (dto.denominations || {}) as Prisma.InputJsonValue,
          approvalStatus: dto.approvalStatus === 'Draft' ? 'Draft' : 'Submitted',
          approvedByName: 'Pending Checker Audit',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
        include: { company: true, branch: true, outlet: true, currency: true },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'CashierPayment',
          recordId: payment.id,
          recordCode: payment.docNo,
          newValues: payment,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'cashier_payment',
        entityId: payment.id,
        docNo: payment.docNo,
        action: 'CREATE',
        step: `Created Cashier Payment Voucher ${payment.paymentVoucherNo} (${cur.code} ${dto.amount})`,
        toStatus: payment.approvalStatus,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return payment;
    });

    return {
      id: created.id,
      docNo: created.docNo,
      docDate: formatIsoDate(created.docDate),
      paymentVoucherNo: created.paymentVoucherNo,
      paymentDate: formatIsoDate(created.paymentDate),
      company: created.company.name,
      branch: created.branch.name,
      outlet: created.outlet.name,
      vendor: created.vendorName,
      cashAdvanceType: created.cashAdvanceType,
      department: created.departmentName,
      requester: created.requesterName,
      floatAccount: created.floatAccountName,
      transactionCurrency: created.currency.code,
      amount: toNumber(created.amount),
      totalBalanceInHand: toNumber(created.totalBalanceInHand),
      approvalStatus: created.approvalStatus,
      approvedBy: created.approvedByName,
      narration: created.narration,
      denominations: created.denominations,
    };
  }

  // ============================================================================
  // TAB 3 & 4: CASHIER SETTLEMENT & PENDING QUEUE (SCREENS 03 & 04)
  // ============================================================================

  async listSettlements(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; status?: string; pendingOnly?: boolean; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashierSettlementWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.pendingOnly) {
      where.status = { in: ['Pending', 'Pending Acceptance', 'Submitted', 'Under Review'] };
    } else if (query?.status && query.status !== 'all') {
      where.status = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { fromCashierName: { contains: query.search, mode: 'insensitive' } },
        { toCashierName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.cashierSettlement.findMany({
      where,
      include: {
        company: true,
        branch: true,
        outlet: true,
        lines: { include: { currency: true } },
        receipts: { select: { id: true, docNo: true } },
      },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    const todayMs = Date.now();
    return rows.map((s) => {
      const primary = s.lines[0];
      const daysPending = Math.max(
        0,
        Math.floor((todayMs - s.docDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const denomSummary = s.lines
        .map((l) => {
          const entries = Object.entries((l.denominations as Record<string, number>) || {})
            .filter(([, q]) => Number(q) > 0)
            .map(([d, q]) => `${d}x${q}`)
            .join(', ');
          return entries ? `${l.currency.code} ${entries}` : '';
        })
        .filter(Boolean)
        .join(' | ');

      return {
        id: s.id,
        docNo: s.docNo,
        settlementDocNo: s.docNo,
        docDate: formatIsoDate(s.docDate),
        settlementDate: formatIsoDate(s.docDate),
        fromDate: formatIsoDate(s.fromDate),
        toDate: formatIsoDate(s.toDate),
        companyId: s.companyId,
        company: s.company.name,
        branchId: s.branchId,
        branch: s.branch.name,
        outletId: s.outletId,
        outlet: s.outlet.name,
        fromCashier: s.fromCashierName,
        cashierName: s.fromCashierName,
        cashierId: s.fromCashierId ? `EMP-${s.fromCashierId}` : 'CSH',
        toCashier: s.toCashierName,
        floatAccountName: s.floatAccountName,
        currency: primary?.currency.code || s.baseCurrencyCode,
        openingBalance: primary ? toNumber(primary.openingBalance) : 0,
        collection: primary ? toNumber(primary.collection) : 0,
        cashOut: primary ? toNumber(primary.cashOut) : 0,
        closingBalance: primary ? toNumber(primary.closingBalance) : 0,
        transferAmount: toNumber(s.totalTransferBase),
        settlementAmount: toNumber(s.totalTransferBase),
        baseCurrency: s.baseCurrencyCode,
        localCurrencyCode: s.localCurrencyCode || 'MVR',
        currentBalanceLocal: toNumber(s.currentBalanceLocal),
        transferToValueLocal: toNumber(s.transferToValueLocal),
        hasReceipt: Array.isArray(s.receipts) && s.receipts.length > 0,
        denominationSummary: denomSummary || 'Verified Denominations',
        daysPending,
        narration: s.narration || '',
        remark: s.narration || '',
        status: s.status,
        createdById: s.createdById ?? s.createUserId ?? null,
        lines: s.lines.map((l) => ({
          id: l.id,
          currency: l.currency.code,
          currencyName: l.currency.name,
          symbol: l.currency.symbol,
          openingBalance: toNumber(l.openingBalance),
          collection: toNumber(l.collection),
          cashOut: toNumber(l.cashOut),
          closingBalance: toNumber(l.closingBalance),
          transferAmount: toNumber(l.transferAmount),
          exRate: toNumber(l.exRate, 6),
          baseTransferAmt: toNumber(l.baseTransferAmt),
          denominations: l.denominations || {},
        })),
      };
    });
  }

  async createSettlement(user: AuthenticatedUser, dto: CreateCashierSettlementDto) {
    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });

    const fromDate = parseDateOnly(dto.fromDate);
    const toDate = parseDateOnly(dto.toDate);
    if (toDate.getTime() < fromDate.getTime()) {
      throw new BadRequestException('To Date cannot be earlier than From Date.');
    }

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    let totalTransferBase = new Decimal(0);
    const preparedLines: Array<{
      currencyId: number;
      opening: Decimal;
      collection: Decimal;
      cashOut: Decimal;
      closing: Decimal;
      transfer: Decimal;
      rate: Decimal;
      baseTransfer: Decimal;
      denominations: Prisma.InputJsonValue;
    }> = [];

    for (const row of dto.lines) {
      const cur = await this.getCurrencyByCode(row.currency);
      const opening = toDecimal(row.openingBalance);
      const collection = toDecimal(row.collection);
      const cashOut = toDecimal(row.cashOut);
      // Authoritative server-side closing balance calculation
      const closing = roundMoney(opening.plus(collection).minus(cashOut));
      const transfer = toDecimal(row.transferAmount);
      if (transfer.gt(closing) && closing.gte(0)) {
        throw new BadRequestException(
          `Transfer amount (${toNumber(transfer)} ${cur.code}) exceeds computed Closing Balance (${toNumber(closing)} ${cur.code}).`,
        );
      }
      const { rate, baseAmount } = await this.fxResolver.convertToBase(transfer, cur.code);
      totalTransferBase = totalTransferBase.plus(baseAmount);
      preparedLines.push({
        currencyId: cur.id,
        opening,
        collection,
        cashOut,
        closing,
        transfer,
        rate,
        baseTransfer: baseAmount,
        denominations: (row.denominations || {}) as Prisma.InputJsonValue,
      });
    }

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.cashierSettlement.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-CCD-SETTLE', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'CST-2026-',
            });

      const settlement = await tx.cashierSettlement.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          fromDate,
          toDate,
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          fromCashierId: dto.fromCashierId || user.employeeId || null,
          fromCashierName: dto.fromCashier,
          toCashierId: dto.toCashierId || null,
          toCashierName: dto.toCashier,
          floatAccountId: dto.floatAccountId || null,
          floatAccountName: dto.floatAccountName || 'Primary Float',
          baseCurrencyCode: baseInfo.code,
          localCurrencyCode: dto.localCurrencyCode || 'MVR',
          currentBalanceLocal: toPrismaDecimal(dto.currentBalanceLocal ?? 0),
          transferToValueLocal: toPrismaDecimal(dto.transferToValueLocal ?? 0),
          totalTransferBase: toPrismaDecimal(totalTransferBase),
          narration: dto.narration || '',
          status:
            dto.status === 'Draft'
              ? 'Draft'
              : dto.status === 'Submitted' || dto.status === 'Finalized'
                ? 'Submitted'
                : dto.status || 'Pending Acceptance',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      await tx.cashierSettlementLine.createMany({
        data: preparedLines.map((l) => ({
          settlementId: settlement.id,
          currencyId: l.currencyId,
          openingBalance: toPrismaDecimal(l.opening),
          collection: toPrismaDecimal(l.collection),
          cashOut: toPrismaDecimal(l.cashOut),
          closingBalance: toPrismaDecimal(l.closing),
          transferAmount: toPrismaDecimal(l.transfer),
          exRate: toPrismaRate(l.rate),
          baseTransferAmt: toPrismaDecimal(l.baseTransfer),
          denominations: l.denominations,
          createUserId: user.id,
          updateUserId: user.id,
        })),
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'CashierSettlement',
          recordId: settlement.id,
          recordCode: settlement.docNo,
          newValues: settlement,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'cashier_settlement',
        entityId: settlement.id,
        docNo: settlement.docNo,
        action: 'CREATE',
        step: `Created Cashier Settlement ${settlement.docNo} (${baseInfo.code} ${toNumber(totalTransferBase)})`,
        toStatus: settlement.status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return settlement.id;
    });

    const list = await this.listSettlements(user);
    return list.find((s) => s.id === createdId);
  }

  async acceptSettlement(user: AuthenticatedUser, id: number) {
    const settlement = await this.prisma.cashierSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException(`Cashier Settlement #${id} not found.`);
    await assertEntityScope(this.prisma, user, settlement);
    if (settlement.createdById === user.id) {
      throw new ForbiddenException(
        'Maker-Checker control violation: the cashier who created a settlement cannot accept it.',
      );
    }
    if (settlement.status.includes('Accepted')) {
      throw new BadRequestException('Settlement has already been accepted.');
    }

    await this.prisma.$transaction(async (tx) => {
      const next = await tx.cashierSettlement.update({
        where: { id },
        data: {
          status: 'Accepted & Settled',
          acceptedById: user.id,
          acceptedAt: new Date(),
          updateUserId: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'APPROVE',
          tableName: 'CashierSettlement',
          recordId: id,
          recordCode: settlement.docNo,
          oldValues: settlement,
          newValues: next,
          description: `Treasury accepted & settled handover ${settlement.docNo}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'cashier_settlement',
        entityId: id,
        docNo: settlement.docNo,
        action: 'ACCEPT',
        step: `Treasury accepted & settled handover ${settlement.docNo}`,
        fromStatus: settlement.status,
        toStatus: 'Accepted & Settled',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    const list = await this.listSettlements(user);
    return list.find((s) => s.id === id);
  }

  // ============================================================================
  // TAB 5: MAIN CASH COLLECTION RECEIPT (SCREEN 05)
  // ============================================================================

  async listReceipts(user: AuthenticatedUser, query?: { companyId?: number; outletId?: string; search?: string }) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashCollectionReceiptWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { receiptVoucherNo: { contains: query.search, mode: 'insensitive' } },
        { receivedFromName: { contains: query.search, mode: 'insensitive' } },
        { settledDocNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.cashCollectionReceipt.findMany({
      where,
      include: { company: true, branch: true, outlet: true, lines: { include: { currency: true } } },
      orderBy: [{ receiptDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      docDate: formatIsoDate(r.docDate),
      receiptVoucherNo: r.receiptVoucherNo,
      receiptDate: formatIsoDate(r.receiptDate),
      companyId: r.companyId,
      company: r.company.name,
      branchId: r.branchId,
      branch: r.branch.name,
      outletId: r.outletId,
      outlet: r.outlet.name,
      settledDocNo: r.settledDocNo || '',
      settledDocDate: formatIsoDate(r.settledDocDate),
      cashier: r.receivedFromName,
      receiptType: r.receiptType,
      collectionAccount: r.collectionAccount || '',
      bankAccount: r.bankAccountName,
      cashAccount: r.cashAccountName,
      baseCurrency: r.baseCurrencyCode,
      settlementAmount: toNumber(r.settlementBaseAmt),
      receiptAmount: toNumber(r.receiptBaseAmt),
      difference: toNumber(r.differenceBaseAmt),
      postedStatus: r.postedStatus,
      postedBy: r.postedByName || '',
      narration: r.narration || '',
      lines: r.lines.map((l) => ({
        id: l.id,
        currency: l.currency.code,
        currencyName: l.currency.name,
        symbol: l.currency.symbol,
        settlementAmount: toNumber(l.settlementAmount),
        receiptAmount: toNumber(l.receiptAmount),
        difference: toNumber(l.difference),
        exRate: toNumber(l.exRate, 6),
        remark: l.remark || '',
        denominations: l.denominations || {},
      })),
    }));
  }

  async createReceipt(user: AuthenticatedUser, dto: CreateCollectionReceiptDto) {
    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    let totalSettleBase = new Decimal(0);
    let totalReceiptBase = new Decimal(0);
    const preparedLines: Array<{
      currencyId: number;
      settlementAmount: Decimal;
      receiptAmount: Decimal;
      difference: Decimal;
      rate: Decimal;
      remark: string;
      denominations: Prisma.InputJsonValue;
    }> = [];

    for (const row of dto.lines) {
      const cur = await this.getCurrencyByCode(row.currency);
      const settle = toDecimal(row.settlementAmount);
      const rec = toDecimal(row.receiptAmount);
      const diff = roundMoney(rec.minus(settle));
      const rate = await this.fxResolver.resolveRate(cur.code, baseInfo.code);
      totalSettleBase = totalSettleBase.plus(roundMoney(settle.times(rate)));
      totalReceiptBase = totalReceiptBase.plus(roundMoney(rec.times(rate)));
      preparedLines.push({
        currencyId: cur.id,
        settlementAmount: settle,
        receiptAmount: rec,
        difference: diff,
        rate,
        remark: row.remark || '',
        denominations: (row.denominations || {}) as Prisma.InputJsonValue,
      });
    }

    const totalDiffBase = roundMoney(totalReceiptBase.minus(totalSettleBase));

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.cashCollectionReceipt.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : `REC-2026-${Date.now().toString().slice(-4)}`;
      const voucherNo =
        dto.receiptVoucherNo &&
        !(await tx.cashCollectionReceipt.findUnique({ where: { receiptVoucherNo: dto.receiptVoucherNo } }))
          ? dto.receiptVoucherNo
          : `RV-BNF-${Date.now().toString().slice(-5)}`;

      const receipt = await tx.cashCollectionReceipt.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          receiptVoucherNo: voucherNo,
          receiptDate: parseDateOnly(dto.receiptDate || dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId!,
          settlementId: dto.settlementId || null,
          settledDocNo: dto.settledDocNo || null,
          settledDocDate: dto.settledDocDate ? parseDateOnly(dto.settledDocDate) : null,
          receivedFromName: dto.receivedFrom,
          receiptType: dto.receiptType || 'Main Cash Collection',
          collectionAccount: dto.collectionAccount || 'Outlet Cash Control Clearing A/C',
          bankAccountId: dto.bankAccountId || null,
          bankAccountName: dto.bankAccount || 'Deposit Control Account',
          cashAccountName: dto.cashAccount || 'Central Vault Physical Cash',
          baseCurrencyCode: baseInfo.code,
          settlementBaseAmt: toPrismaDecimal(totalSettleBase),
          receiptBaseAmt: toPrismaDecimal(totalReceiptBase),
          differenceBaseAmt: toPrismaDecimal(totalDiffBase),
          postedStatus: 'Posted to General Ledger',
          postedById: user.id,
          postedByName: user.fullName,
          narration: dto.narration || '',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      await tx.cashCollectionReceiptLine.createMany({
        data: preparedLines.map((l) => ({
          receiptId: receipt.id,
          currencyId: l.currencyId,
          settlementAmount: toPrismaDecimal(l.settlementAmount),
          receiptAmount: toPrismaDecimal(l.receiptAmount),
          difference: toPrismaDecimal(l.difference),
          exRate: toPrismaRate(l.rate),
          remark: l.remark,
          denominations: l.denominations,
          createUserId: user.id,
          updateUserId: user.id,
        })),
      });

      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'POST',
          tableName: 'CashCollectionReceipt',
          recordId: receipt.id,
          recordCode: receipt.receiptVoucherNo,
          newValues: receipt,
          description: `Posted Main Cash Collection Receipt ${receipt.receiptVoucherNo}`,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'cash_collection_receipt',
        entityId: receipt.id,
        docNo: receipt.docNo,
        action: 'POST_RECEIPT',
        step: `Posted Main Cash Collection Receipt ${receipt.receiptVoucherNo} (Variance: ${toNumber(totalDiffBase)} ${baseInfo.code})`,
        toStatus: receipt.postedStatus,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return receipt.id;
    });

    const list = await this.listReceipts(user);
    return list.find((r) => r.id === createdId);
  }

  // ============================================================================
  // TAB 6 (SCREEN 07): MAIN CASHIER PAYMENT
  // ============================================================================

  async listMainCashierPayments(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; pendingOnly?: boolean; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.MainCashierPaymentWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.pendingOnly) {
      where.isReimbursed = false;
      where.approvalStatus = { in: ['Draft', 'Submitted', 'Pending', 'In Review'] };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { paymentVoucherNo: { contains: query.search, mode: 'insensitive' } },
        { vendorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.mainCashierPayment.findMany({
      where,
      include: { company: true, branch: true, outlet: true, currency: true },
      orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((p) => ({
      id: p.id,
      sourceTable: 'main_cashier_payment' as const,
      docNo: p.docNo,
      docDate: formatIsoDate(p.docDate),
      paymentVoucherNo: p.paymentVoucherNo,
      paymentDate: formatIsoDate(p.paymentDate),
      companyId: p.companyId,
      company: p.company.name,
      branchId: p.branchId,
      branch: p.branch.name,
      outletId: p.outletId,
      outlet: p.outlet.name,
      cashierLevel: p.cashierLevel || 'Main Cashier',
      payeeType: p.payeeType || 'Vendor',
      payeeEmployeeId: p.payeeEmployeeId || null,
      isReimbursed: p.isReimbursed || false,
      reimbursedAmount: toNumber(p.reimbursedAmount),
      transactionCurrency: p.currency.code,
      vendor: p.vendorName,
      cashAdvanceType: p.cashAdvanceType,
      amount: toNumber(p.amount),
      baseCurrency: p.baseCurrencyCode,
      baseAmount: toNumber(p.baseAmount),
      department: p.departmentName,
      requester: p.requesterName,
      floatAccount: p.floatAccountName,
      totalBalanceInHand: toNumber(p.totalBalanceInHand),
      balanceCurrency: p.balanceCurrency,
      approvalStatus: p.approvalStatus,
      approvedBy: p.approvedByName || '',
      receiptNumber: p.receiptNumber || '',
      narration: p.narration || '',
      denominations: p.denominations || {},
    }));
  }

  async saveMainCashierPayment(
    user: AuthenticatedUser,
    dto: CreateCashierPaymentDto,
    editId?: number,
  ) {
    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const cur = await this.getCurrencyByCode(dto.transactionCurrency);
    const { baseCurrency, baseAmount } = await this.fxResolver.convertToBase(dto.amount, cur.code);
    const resolvedPayeeType =
      dto.payeeType ||
      (String(dto.cashAdvanceType || '').toLowerCase().includes('employee') ? 'Employee' : 'Vendor');

    const savedId = await this.prisma.$transaction(async (tx) => {
      let floatAcc = dto.floatAccountId
        ? await tx.floatAccount.findUnique({ where: { id: dto.floatAccountId } })
        : dto.floatAccount
          ? await tx.floatAccount.findFirst({ where: { name: { equals: dto.floatAccount, mode: 'insensitive' } } })
          : null;

      if (floatAcc && floatAcc.currencyId !== cur.id) {
        const currencyFloat = await tx.floatAccount.findFirst({
          where: { currencyId: cur.id, isActive: true },
          orderBy: { id: 'asc' },
        });
        floatAcc = currencyFloat;
      }

      let balanceAfter = toDecimal(floatAcc?.currentBalance ?? 0);
      if (!editId && floatAcc) {
        const deductAmt = toPrismaDecimal(dto.amount);
        const debited = await tx.floatAccount.updateMany({
          where: { id: floatAcc.id, currentBalance: { gte: deductAmt } },
          data: { currentBalance: { decrement: deductAmt }, updateUserId: user.id },
        });
        if (debited.count === 0) {
          throw new BadRequestException(
            `Insufficient vault float balance in "${floatAcc.name}". Available: ${toNumber(balanceAfter)}.`,
          );
        }
        const updatedFloat = await tx.floatAccount.findUnique({ where: { id: floatAcc.id } });
        balanceAfter = toDecimal(updatedFloat?.currentBalance ?? 0);
        if (this.changeLogService && updatedFloat) {
          await this.changeLogService.logUpdate({
            tableName: 'FloatAccount',
            recordId: floatAcc.id,
            recordCode: floatAcc.code,
            oldValues: floatAcc,
            newValues: updatedFloat,
            description: `Deducted ${cur.code} ${dto.amount} for Main Cashier Payment`,
            actor: user,
            tx,
          });
        }
      }

      if (editId) {
        const oldMainPay = await tx.mainCashierPayment.findUnique({ where: { id: editId } });
        if (!oldMainPay) {
          throw new NotFoundException(`Main Cashier Payment #${editId} not found.`);
        }
        await assertEntityScope(this.prisma, user, oldMainPay);
        if (['Approved', 'Posted', 'Locked'].includes(oldMainPay.approvalStatus)) {
          throw new ForbiddenException(
            `Cannot modify Main Cashier Payment ${oldMainPay.docNo} once status is "${oldMainPay.approvalStatus}".`,
          );
        }
        const delta = toDecimal(dto.amount).minus(toDecimal(oldMainPay.amount));
        if (floatAcc && !delta.eq(0)) {
          if (delta.gt(0)) {
            const debited = await tx.floatAccount.updateMany({
              where: { id: floatAcc.id, currentBalance: { gte: toPrismaDecimal(delta) } },
              data: { currentBalance: { decrement: toPrismaDecimal(delta) }, updateUserId: user.id },
            });
            if (debited.count === 0) {
              throw new BadRequestException(`Insufficient vault float balance for increased payment amount.`);
            }
          } else {
            await tx.floatAccount.update({
              where: { id: floatAcc.id },
              data: { currentBalance: { increment: toPrismaDecimal(delta.abs()) }, updateUserId: user.id },
            });
          }
        }
        const updated = await tx.mainCashierPayment.update({
          where: { id: editId },
          data: {
            docDate: parseDateOnly(dto.docDate),
            paymentDate: parseDateOnly(dto.paymentDate || dto.docDate),
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId,
            currencyId: cur.id,
            cashierLevel: dto.cashierLevel || 'Main Cashier',
            payeeType: resolvedPayeeType,
            payeeEmployeeId: dto.payeeEmployeeId || null,
            vendorId: resolvedPayeeType === 'Vendor' ? dto.vendorId || null : null,
            vendorName: dto.vendor,
            cashAdvanceType: dto.cashAdvanceType,
            amount: toPrismaDecimal(dto.amount),
            baseCurrencyCode: baseCurrency,
            baseAmount: toPrismaDecimal(baseAmount),
            departmentName: dto.department || 'Treasury Operations',
            requesterName: dto.requester || user.fullName,
            floatAccountId: floatAcc?.id || null,
            floatAccountName: floatAcc?.name || dto.floatAccount || 'Main Float',
            balanceCurrency: cur.code,
            approvalStatus: dto.approvalStatus === 'Draft' ? 'Draft' : 'Submitted',
            receiptNumber: dto.receiptNumber || null,
            narration: dto.narration || '',
            denominations: (dto.denominations || {}) as Prisma.InputJsonValue,
            updateUserId: user.id,
          },
        });
        if (this.changeLogService && oldMainPay) {
          await this.changeLogService.logUpdate({
            tableName: 'MainCashierPayment',
            recordId: updated.id,
            recordCode: updated.docNo,
            oldValues: oldMainPay,
            newValues: updated,
            actor: user,
            tx,
          });
        }
        await this.auditService.log({
          entityType: 'main_cashier_payment',
          entityId: updated.id,
          docNo: updated.docNo,
          action: 'UPDATE',
          step: `Updated Main Cashier Payment ${updated.docNo}`,
          toStatus: updated.approvalStatus,
          performedById: user.id,
          performedByName: user.fullName,
          tx,
        });
        return updated.id;
      }

      const docNo =
        dto.docNo && !(await tx.mainCashierPayment.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-MAIN-PAY', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'MPAY-2026-',
            });
      const voucherNo =
        dto.paymentVoucherNo &&
        !(await tx.mainCashierPayment.findUnique({ where: { paymentVoucherNo: dto.paymentVoucherNo } }))
          ? dto.paymentVoucherNo
          : `MPV-TREAS-${Date.now().toString().slice(-4)}`;

      const created = await tx.mainCashierPayment.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          paymentVoucherNo: voucherNo,
          paymentDate: parseDateOnly(dto.paymentDate || dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          currencyId: cur.id,
          cashierLevel: dto.cashierLevel || 'Main Cashier',
          payeeType: resolvedPayeeType,
          payeeEmployeeId: dto.payeeEmployeeId || null,
          vendorId: resolvedPayeeType === 'Vendor' ? dto.vendorId || null : null,
          vendorName: dto.vendor,
          cashAdvanceType: dto.cashAdvanceType,
          amount: toPrismaDecimal(dto.amount),
          baseCurrencyCode: baseCurrency,
          baseAmount: toPrismaDecimal(baseAmount),
          departmentId: dto.departmentId || null,
          departmentName: dto.department || 'Treasury Operations',
          requesterId: dto.requesterId || null,
          requesterName: dto.requester || user.fullName,
          floatAccountId: floatAcc?.id || null,
          floatAccountName: floatAcc?.name || dto.floatAccount || 'Main Float',
          totalBalanceInHand: toPrismaDecimal(balanceAfter),
          balanceCurrency: cur.code,
          approvalStatus: dto.approvalStatus === 'Draft' ? 'Draft' : 'Submitted',
          approvedByName: 'Pending Sign-off',
          receiptNumber: dto.receiptNumber || `RCT-TREAS-${Date.now().toString().slice(-4)}`,
          narration: dto.narration || '',
          denominations: (dto.denominations || {}) as Prisma.InputJsonValue,
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'MainCashierPayment',
          recordId: created.id,
          recordCode: created.docNo,
          newValues: created,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'main_cashier_payment',
        entityId: created.id,
        docNo: created.docNo,
        action: 'CREATE',
        step: `Created Main Cashier Payment ${created.docNo} (${cur.code} ${dto.amount})`,
        toStatus: created.approvalStatus,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return created.id;
    });

    const list = await this.listMainCashierPayments(user);
    return list.find((p) => p.id === savedId);
  }

  // ============================================================================
  // TAB 7 (SCREEN 08): MAIN CASHIER SETTLEMENT
  // ============================================================================

  async listMainCashierSettlements(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; status?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.MainCashierSettlementWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.status && query.status !== 'all') {
      where.status = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { fromCashierName: { contains: query.search, mode: 'insensitive' } },
        { toBankName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.mainCashierSettlement.findMany({
      where,
      include: {
        company: true,
        branch: true,
        outlet: true,
        lines: { include: { currency: true } },
      },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((s) => ({
      id: s.id,
      docNo: s.docNo,
      docDate: formatIsoDate(s.docDate),
      fromDate: formatIsoDate(s.fromDate),
      toDate: formatIsoDate(s.toDate),
      companyId: s.companyId,
      company: s.company.name,
      branchId: s.branchId,
      branch: s.branch.name,
      outletId: s.outletId,
      outlet: s.outlet.name,
      fromCashier: s.fromCashierName,
      toBank: s.toBankName,
      currency: s.primaryCurrencyCode,
      baseCurrency: s.baseCurrencyCode,
      totalTransferBase: toNumber(s.totalTransferBase),
      narration: s.narration || '',
      status: s.status,
      isReconciled: s.isReconciled || false,
      rows: s.lines.map((l) => ({
        id: l.id,
        currency: l.currency.code,
        openingBalance: toNumber(l.openingBalance),
        collection: toNumber(l.collection),
        cashOut: toNumber(l.cashOut),
        closingBalance: toNumber(l.closingBalance),
        transferAmount: toNumber(l.transferAmount),
        exRate: toNumber(l.exRate, 6),
        baseTransferAmt: toNumber(l.baseTransferAmt),
        denominations: l.denominations || {},
      })),
    }));
  }

  async saveMainCashierSettlement(
    user: AuthenticatedUser,
    dto: CreateMainCashierSettlementDto,
    editId?: number,
  ) {
    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('At least one currency settlement row is required.');
    }

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    let totalTransferBase = new Decimal(0);
    const preparedLines: Array<{
      currencyId: number;
      opening: Decimal;
      collection: Decimal;
      cashOut: Decimal;
      closing: Decimal;
      transfer: Decimal;
      rate: Decimal;
      baseTransfer: Decimal;
      denominations: Prisma.InputJsonValue;
    }> = [];

    for (const row of dto.rows) {
      const cur = await this.getCurrencyByCode(row.currency);
      const opening = toDecimal(row.openingBalance);
      const collection = toDecimal(row.collection);
      const cashOut = toDecimal(row.cashOut);
      const closing = roundMoney(opening.plus(collection).minus(cashOut));
      const transfer = toDecimal(row.transferAmount);
      const { rate, baseAmount } = await this.fxResolver.convertToBase(transfer, cur.code);
      totalTransferBase = totalTransferBase.plus(baseAmount);
      preparedLines.push({
        currencyId: cur.id,
        opening,
        collection,
        cashOut,
        closing,
        transfer,
        rate,
        baseTransfer: baseAmount,
        denominations: (row.denominations || {}) as Prisma.InputJsonValue,
      });
    }

    const finalStatus = dto.status === 'Draft' ? 'Draft' : dto.status || 'Submitted';

    const savedId = await this.prisma.$transaction(async (tx) => {
      let settlementId = editId;
      let docNo = dto.docNo || '';

      if (editId) {
        const oldMainSet = await tx.mainCashierSettlement.findUnique({ where: { id: editId } });
        const updated = await tx.mainCashierSettlement.update({
          where: { id: editId },
          data: {
            docDate: parseDateOnly(dto.docDate),
            fromDate: parseDateOnly(dto.fromDate),
            toDate: parseDateOnly(dto.toDate),
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId,
            fromCashierName: dto.fromCashier,
            toBankAccountId: dto.toBankAccountId || null,
            toBankName: dto.toBank,
            primaryCurrencyCode: dto.currency || dto.rows[0].currency,
            baseCurrencyCode: baseInfo.code,
            totalTransferBase: toPrismaDecimal(totalTransferBase),
            narration: dto.narration || '',
            status: finalStatus,
            updateUserId: user.id,
          },
        });
        docNo = updated.docNo;
        await tx.mainCashierSettlementLine.deleteMany({ where: { settlementId: editId } });
        if (this.changeLogService && oldMainSet) {
          await this.changeLogService.logUpdate({
            tableName: 'MainCashierSettlement',
            recordId: updated.id,
            recordCode: updated.docNo,
            oldValues: oldMainSet,
            newValues: updated,
            actor: user,
            tx,
          });
        }
      } else {
        docNo =
          dto.docNo && !(await tx.mainCashierSettlement.findUnique({ where: { docNo: dto.docNo } }))
            ? dto.docNo
            : await this.numberSeries.allocateNextNumber('FRM-MAIN-SETTLE', {
                branchId: scope.branchId,
                tx,
                fallbackPrefix: 'MSET-2026-',
              });
        const created = await tx.mainCashierSettlement.create({
          data: {
            docNo,
            docDate: parseDateOnly(dto.docDate),
            fromDate: parseDateOnly(dto.fromDate),
            toDate: parseDateOnly(dto.toDate),
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId,
            fromCashierName: dto.fromCashier,
            toBankAccountId: dto.toBankAccountId || null,
            toBankName: dto.toBank,
            primaryCurrencyCode: dto.currency || dto.rows[0].currency,
            baseCurrencyCode: baseInfo.code,
            totalTransferBase: toPrismaDecimal(totalTransferBase),
            narration: dto.narration || '',
            status: finalStatus,
            createdById: user.id,
            createUserId: user.id,
            updateUserId: user.id,
          },
        });
        settlementId = created.id;
        if (this.changeLogService) {
          await this.changeLogService.logCreate({
            tableName: 'MainCashierSettlement',
            recordId: created.id,
            recordCode: created.docNo,
            newValues: created,
            actor: user,
            tx,
          });
        }
      }

      await tx.mainCashierSettlementLine.createMany({
        data: preparedLines.map((l) => ({
          settlementId: settlementId!,
          currencyId: l.currencyId,
          openingBalance: toPrismaDecimal(l.opening),
          collection: toPrismaDecimal(l.collection),
          cashOut: toPrismaDecimal(l.cashOut),
          closingBalance: toPrismaDecimal(l.closing),
          transferAmount: toPrismaDecimal(l.transfer),
          exRate: toPrismaRate(l.rate),
          baseTransferAmt: toPrismaDecimal(l.baseTransfer),
          denominations: l.denominations,
        })),
      });

      await this.auditService.log({
        entityType: 'main_cashier_settlement',
        entityId: settlementId!,
        docNo,
        action: editId ? 'UPDATE' : 'CREATE',
        step: `${editId ? 'Updated' : finalStatus === 'Draft' ? 'Saved Draft' : 'Submitted'} Main Cashier Settlement ${docNo} (${baseInfo.code} ${toNumber(totalTransferBase)})`,
        toStatus: finalStatus,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return settlementId!;
    });

    const list = await this.listMainCashierSettlements(user);
    return list.find((s) => s.id === savedId);
  }

  // ============================================================================
  // TAB 8 (SCREEN 06): OUTLET CASH SALES - BANK SETTLEMENT & CARRY FORWARD
  // ============================================================================

  async listUnsettledCollections(
    user: AuthenticatedUser,
    query?: { fromDate?: string; toDate?: string; companyId?: number; outletId?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashDepositWhereInput = {
      status: { in: ['Approved', 'Submitted'] },
    };
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeBranch: true, includeOutlet: true },
    );
    if (query?.fromDate || query?.toDate) {
      where.collectionDate = {};
      if (query.fromDate) where.collectionDate.gte = parseDateOnly(query.fromDate);
      if (query.toDate) where.collectionDate.lte = parseDateOnly(query.toDate);
    }

    const deposits = await this.prisma.cashDeposit.findMany({
      where,
      include: {
        outlet: true,
        cashier: true,
        bankDepositItems: true,
      },
      orderBy: [{ collectionDate: 'asc' }, { id: 'asc' }],
    });

    return deposits
      .map((d) => {
        const collectionAmount = toNumber(d.totalBaseAmount);
        const previouslySettled = d.bankDepositItems.reduce(
          (sum, i) => sum + toNumber(i.settledAmount),
          0,
        );
        const remainingBalance = Number(Math.max(0, collectionAmount - previouslySettled).toFixed(2));
        return {
          id: d.id,
          cashDepositId: d.id,
          docNo: d.docNo,
          collectionDate: formatIsoDate(d.collectionDate),
          outletId: d.outletId,
          outlet: d.outlet.name,
          cashier: d.cashier.name,
          envelopeNo: d.envelopeNo,
          currency: d.baseCurrencyCode || 'USD',
          collectionAmount,
          previouslySettled: Number(previouslySettled.toFixed(2)),
          remainingBalance,
          settledAmount: remainingBalance,
          status: d.status,
        };
      })
      .filter((d) => d.remainingBalance > 0.009);
  }

  async listBankDeposits(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.OutletBankDepositWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeBranch: true, includeOutlet: true, allowNullOutlet: true },
    );
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { depositBankRefNo: { contains: query.search, mode: 'insensitive' } },
        { depositAccountName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.outletBankDeposit.findMany({
      where,
      include: { company: true, branch: true, outlet: true, currency: true, collectionItems: true },
      orderBy: [{ depositDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((d) => ({
      id: d.id,
      docNo: d.docNo,
      docDate: formatIsoDate(d.docDate),
      fromDate: formatIsoDate(d.fromDate),
      toDate: formatIsoDate(d.toDate),
      depositDate: formatIsoDate(d.depositDate),
      companyId: d.companyId,
      company: d.company.name,
      branchId: d.branchId,
      branch: d.branch.name,
      outletId: d.outletId,
      outlet: d.outlet?.name || '',
      depositBankRefNo: d.depositBankRefNo,
      currency: d.currency.code,
      depositAccount: d.depositAccountName,
      processFlowDecision: d.processFlowDecision,
      totalCollectionAmount: toNumber(d.totalCollectionAmount),
      settledAmount: toNumber(d.settledAmount),
      balance: toNumber(d.balance),
      glAccounting: d.glAccounting || [],
      status: d.status,
      remark: d.remark || '',
      collectionDocs: d.collectionItems.map((i) => ({
        docNo: i.collectionDocNo,
        date: formatIsoDate(i.collectionDate),
        collectionAmount: toNumber(i.collectionAmount),
        settledAmount: toNumber(i.settledAmount),
        balance: toNumber(i.balance),
      })),
    }));
  }

  async createBankDeposit(user: AuthenticatedUser, dto: CreateOutletBankDepositDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const cur = await this.getCurrencyByCode(dto.currency || baseInfo.code);

    const requestedIds =
      dto.items && dto.items.length > 0
        ? dto.items.map((i) => Number(i.cashDepositId))
        : dto.cashDepositIds || [];

    const settledMap = new Map<number, Decimal>();
    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        settledMap.set(Number(item.cashDepositId), toDecimal(item.settledAmount));
      }
    }

    const linkedDeposits =
      requestedIds.length > 0
        ? await this.prisma.cashDeposit.findMany({
            where: {
              id: { in: requestedIds },
              companyId: scope.companyId,
              branchId: scope.branchId,
              ...(scope.outletId ? { outletId: scope.outletId } : {}),
            },
          })
        : [];

    if (requestedIds.length > 0) {
      if (linkedDeposits.length !== new Set(requestedIds).size) {
        throw new BadRequestException(
          'One or more selected Cash Deposit slips were not found in your authorized entity scope.',
        );
      }
      const unapproved = linkedDeposits.filter((d) => d.status !== 'Approved');
      if (unapproved.length > 0) {
        throw new BadRequestException(
          `Only Approved Cash Deposits may be deposited to bank. Invalid slips: ${unapproved.map((d) => `${d.docNo} (${d.status})`).join(', ')}.`,
        );
      }
    }

    const totalCollectionAmt =
      linkedDeposits.length > 0
        ? linkedDeposits.reduce((sum, d) => sum.plus(toDecimal(d.totalBaseAmount)), new Decimal(0))
        : toDecimal(dto.totalCollectionAmount ?? 0);

    const totalSettledAmt =
      linkedDeposits.length > 0
        ? linkedDeposits.reduce((sum, d) => {
            const manual = settledMap.get(d.id);
            return sum.plus(manual !== undefined ? manual : toDecimal(d.totalBaseAmount));
          }, new Decimal(0))
        : toDecimal(dto.totalCollectionAmount ?? 0);

    const totalAmount = totalSettledAmt;
    const totalRemainingBalance = roundMoney(totalCollectionAmt.minus(totalSettledAmt));

    if (totalAmount.lte(0)) {
      throw new BadRequestException('Deposit total amount must be greater than 0.');
    }

    const isBank = dto.processFlowDecision === 'bank';
    const bankRefNo = (dto.depositBankRefNo || '').trim() || (isBank ? '' : `CF-${Date.now().toString().slice(-6)}`);
    if (isBank && !bankRefNo) {
      throw new BadRequestException('Bank deposit slip reference number is required for Bank Deposit.');
    }
    const depositAccountName = isBank
      ? dto.depositAccount || 'Corporate General Bank Account'
      : 'Carried Forward Next Day Vault Float';
    const status = isBank ? 'Completed Deposit' : 'Carried Forward Opening';

    const glAccounting = isBank
      ? [
          {
            account: 'Common Bank Clearing Account #1015-00',
            type: 'Credit (-)',
            amount: toNumber(totalAmount),
          },
          {
            account: `${depositAccountName} #1020-01`,
            type: 'Debit (+)',
            amount: toNumber(totalAmount),
          },
        ]
      : [
          {
            account: 'Outlet Daily Cash Collection #1010-01',
            type: 'Credit (-)',
            amount: toNumber(totalAmount),
          },
          {
            account: 'Next Day Opening Vault Float #1010-02',
            type: 'Debit (+)',
            amount: toNumber(totalAmount),
          },
        ];

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.outletBankDeposit.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-CCD-BANK', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'BD-2026-',
            });

      const bankDep = await tx.outletBankDeposit.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          fromDate: parseDateOnly(dto.fromDate || dto.docDate),
          toDate: parseDateOnly(dto.toDate || dto.docDate),
          depositDate: parseDateOnly(dto.depositDate || dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          depositBankRefNo: bankRefNo,
          currencyId: cur.id,
          bankAccountId: dto.bankAccountId || null,
          depositAccountName,
          processFlowDecision: dto.processFlowDecision,
          totalCollectionAmount: toPrismaDecimal(totalCollectionAmt),
          settledAmount: toPrismaDecimal(totalSettledAmt),
          balance: toPrismaDecimal(totalRemainingBalance.lt(0) ? new Decimal(0) : totalRemainingBalance),
          glAccounting: glAccounting as Prisma.InputJsonValue,
          status,
          remark: dto.remark || '',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'POST',
          tableName: 'OutletBankDeposit',
          recordId: bankDep.id,
          recordCode: bankDep.docNo,
          newValues: bankDep,
          description: `Posted ${status} ${bankDep.docNo} (${cur.code} ${toNumber(totalAmount)})`,
          actor: user,
          tx,
        });
      }

      if (linkedDeposits.length > 0) {
        const fullySettledIds: number[] = [];
        await tx.outletBankDepositItem.createMany({
          data: linkedDeposits.map((ld) => {
            const colAmt = toDecimal(ld.totalBaseAmount);
            const setAmt = settledMap.has(ld.id) ? settledMap.get(ld.id)! : colAmt;
            const bal = roundMoney(colAmt.minus(setAmt));
            if (bal.lte(0.009)) fullySettledIds.push(ld.id);
            return {
              bankDepositId: bankDep.id,
              cashDepositId: ld.id,
              collectionDocNo: ld.docNo,
              collectionDate: ld.collectionDate,
              collectionAmount: toPrismaDecimal(colAmt),
              settledAmount: toPrismaDecimal(setAmt),
              balance: toPrismaDecimal(bal.lt(0) ? new Decimal(0) : bal),
              createUserId: user.id,
              updateUserId: user.id,
            };
          }),
        });
        if (isBank && fullySettledIds.length > 0) {
          const postedResult = await tx.cashDeposit.updateMany({
            where: {
              id: { in: fullySettledIds },
              status: 'Approved',
            },
            data: { status: 'Posted', updateUserId: user.id },
          });
          if (postedResult.count !== fullySettledIds.length) {
            throw new BadRequestException(
              'One or more selected Cash Deposits were already posted or changed status concurrently.',
            );
          }
          if (this.changeLogService) {
            for (const ld of linkedDeposits.filter((x) => fullySettledIds.includes(x.id))) {
              await this.changeLogService.logAction({
                action: 'POST',
                tableName: 'CashDeposit',
                recordId: ld.id,
                recordCode: ld.docNo,
                oldValues: { status: ld.status },
                newValues: { status: 'Posted' },
                description: `Posted via Outlet Cash Sales - Bank Settlement ${bankDep.docNo}`,
                actor: user,
                tx,
              });
            }
          }
        }
      }

      if (isBank && scope.outletId) {
        const brecSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const brec = await tx.bankReconciliation.create({
          data: {
            docCode: `BREC-${new Date().getUTCFullYear()}-${brecSuffix}`,
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId,
            bankDepositId: bankDep.id,
            depositBankRefNo: bankDep.depositBankRefNo,
            depositDate: bankDep.depositDate,
            settledAmount: bankDep.totalCollectionAmount,
            currencyId: cur.id,
            depositBankName: depositAccountName,
            statementAmount: toPrismaDecimal(0),
            variance: toPrismaDecimal(totalAmount.negated()),
            status: 'Pending Statement Match',
            matchingMethod: 'Awaiting Bank Statement',
            createUserId: user.id,
            updateUserId: user.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logCreate({
            tableName: 'BankReconciliation',
            recordId: brec.id,
            recordCode: brec.docCode,
            newValues: brec,
            actor: user,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: 'outlet_bank_deposit',
        entityId: bankDep.id,
        docNo: bankDep.docNo,
        action: isBank ? 'BANK_DEPOSIT' : 'CARRY_FORWARD',
        step: `Posted ${status} (${cur.code} ${toNumber(totalAmount)})`,
        toStatus: status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return bankDep.id;
    });

    const list = await this.listBankDeposits(user);
    return list.find((d) => d.id === createdId);
  }

  // ============================================================================
  // TAB 9: BANK RECONCILIATION
  // ============================================================================

  async listBankReconciliations(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; status?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.BankReconciliationWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeBranch: true, includeOutlet: true },
    );
    if (query?.status && query.status !== 'all') {
      where.status = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docCode: { contains: query.search, mode: 'insensitive' } },
        { depositBankRefNo: { contains: query.search, mode: 'insensitive' } },
        { statementRef: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.bankReconciliation.findMany({
      where,
      include: { outlet: true, branch: true, currency: true },
      orderBy: [{ depositDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      docCode: r.docCode,
      outlet: r.outlet.name,
      branch: r.branch.name,
      depositBankRefNo: r.depositBankRefNo,
      date: formatIsoDate(r.depositDate),
      settledAmount: toNumber(r.settledAmount),
      currency: r.currency.code,
      depositBank: r.depositBankName,
      statementDate: formatIsoDate(r.statementDate),
      statementRef: r.statementRef || '-',
      statementAmount: toNumber(r.statementAmount),
      variance: toNumber(r.variance),
      status: r.status,
      method: r.matchingMethod,
    }));
  }

  async importBankStatements(user: AuthenticatedUser, dto: ImportBankStatementDto) {
    const scope = await getEffectiveScope(this.prisma, user);
    let matchedCount = 0;
    let varianceCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of dto.rows) {
        const existing = await tx.bankReconciliation.findFirst({
          where: {
            depositBankRefNo: row.depositBankRefNo.trim(),
            ...(!scope.unrestricted
              ? { companyId: { in: scope.companyIds }, outletId: { in: scope.outletIds } }
              : {}),
          },
        });
        if (!existing) continue;

        const stmtAmt = toDecimal(row.statementAmount);
        const variance = roundMoney(stmtAmt.minus(toDecimal(existing.settledAmount)));
        const isMatched = variance.abs().lt(0.01);

        const nextBrec = await tx.bankReconciliation.update({
          where: { id: existing.id },
          data: {
            statementDate: parseDateOnly(row.statementDate),
            statementRef: row.statementRef.trim(),
            statementAmount: toPrismaDecimal(stmtAmt),
            variance: toPrismaDecimal(variance),
            status: isMatched ? 'Auto-Matched & Cleared' : 'Variance Flagged',
            matchingMethod: 'Statement Import Auto-Match',
            reconciledById: user.id,
            updateUserId: user.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logUpdate({
            tableName: 'BankReconciliation',
            recordId: existing.id,
            recordCode: existing.docCode,
            oldValues: existing,
            newValues: nextBrec,
            actor: user,
            tx,
          });
        }

        if (isMatched) matchedCount += 1;
        else varianceCount += 1;
      }

      await this.auditService.log({
        entityType: 'bank_reconciliation',
        entityId: 0,
        action: 'IMPORT_STATEMENT',
        step: `Imported ${dto.rows.length} bank statement rows (${matchedCount} matched, ${varianceCount} variances)`,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    return {
      processed: dto.rows.length,
      matchedCount,
      varianceCount,
      items: await this.listBankReconciliations(user),
    };
  }

  // ============================================================================
  // CASHIER PAYOUT ADVANCE — REIMBURSEMENT PROCESS
  // ============================================================================

  async listPendingPayoutsForReimbursement(
    user: AuthenticatedUser,
    query?: { fromDate?: string; toDate?: string; companyId?: number },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query?.fromDate) dateFilter.gte = parseDateOnly(query.fromDate);
    if (query?.toDate) dateFilter.lte = parseDateOnly(query.toDate);
    const hasDate = Boolean(query?.fromDate || query?.toDate);

    const cpWhere: Prisma.CashierPaymentWhereInput = {
      isReimbursed: false,
      approvalStatus: { notIn: ['Rejected', 'Cancelled'] },
      ...(hasDate ? { paymentDate: dateFilter } : {}),
    };
    const mpWhere: Prisma.MainCashierPaymentWhereInput = {
      isReimbursed: false,
      approvalStatus: { notIn: ['Rejected', 'Cancelled'] },
      ...(hasDate ? { paymentDate: dateFilter } : {}),
    };

    applyEntityScopeToWhere(
      cpWhere as Record<string, unknown>,
      scope,
      { companyId: query?.companyId },
      { includeOutlet: true },
    );
    applyEntityScopeToWhere(
      mpWhere as Record<string, unknown>,
      scope,
      { companyId: query?.companyId },
      { includeOutlet: true },
    );

    const [cpRows, mpRows] = await Promise.all([
      this.prisma.cashierPayment.findMany({
        where: cpWhere,
        include: { currency: true, company: true, branch: true },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.mainCashierPayment.findMany({
        where: mpWhere,
        include: { currency: true, company: true, branch: true },
        orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const items = [
      ...cpRows.map((p) => ({
        key: `cashier_payment:${p.id}`,
        sourceTable: 'cashier_payment' as const,
        sourcePaymentId: p.id,
        cashierName: p.cashierName || p.requesterName,
        cashierLevel: p.cashierLevel || 'Assistant Cashier',
        cashierAccount: p.floatAccountName || 'Cash Control Account',
        currencyCode: p.currency.code,
        paymentDocNo: p.paymentVoucherNo || p.docNo,
        docNo: p.docNo,
        paymentDate: formatIsoDate(p.paymentDate),
        cashAdvanceType: p.cashAdvanceType,
        vendor: p.vendorName,
        amount: toNumber(p.amount),
        baseAmount: toNumber(p.baseAmount),
        settleAmount: toNumber(p.amount),
        remark: p.narration || '',
        companyId: p.companyId,
        branchId: p.branchId,
      })),
      ...mpRows.map((p) => ({
        key: `main_cashier_payment:${p.id}`,
        sourceTable: 'main_cashier_payment' as const,
        sourcePaymentId: p.id,
        cashierName: p.requesterName,
        cashierLevel: p.cashierLevel || 'Main Cashier',
        cashierAccount: p.floatAccountName || 'Main Cash Control Account',
        currencyCode: p.currency.code,
        paymentDocNo: p.paymentVoucherNo || p.docNo,
        docNo: p.docNo,
        paymentDate: formatIsoDate(p.paymentDate),
        cashAdvanceType: p.cashAdvanceType,
        vendor: p.vendorName,
        amount: toNumber(p.amount),
        baseAmount: toNumber(p.baseAmount),
        settleAmount: toNumber(p.amount),
        remark: p.narration || '',
        companyId: p.companyId,
        branchId: p.branchId,
      })),
    ];

    items.sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')));
    return items;
  }

  async listPayoutReimbursements(
    user: AuthenticatedUser,
    query?: { companyId?: number; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashierPayoutReimbursementWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId },
      { includeBranch: true },
    );
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { bankAccountName: { contains: query.search, mode: 'insensitive' } },
        { remark: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.cashierPayoutReimbursement.findMany({
      where,
      include: { company: true, branch: true, items: true },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      docDate: formatIsoDate(r.docDate),
      fromDate: formatIsoDate(r.fromDate),
      toDate: formatIsoDate(r.toDate),
      companyId: r.companyId,
      company: r.company.name,
      branchId: r.branchId,
      branch: r.branch.name,
      bankAccountId: r.bankAccountId,
      bankAccountName: r.bankAccountName,
      baseCurrency: r.baseCurrencyCode,
      totalAmount: toNumber(r.totalAmount),
      totalSettledAmount: toNumber(r.totalSettledAmount),
      status: r.status,
      isReconciled: r.isReconciled,
      remark: r.remark || '',
      items: r.items.map((i) => ({
        id: i.id,
        sourceTable: i.sourceTable,
        sourcePaymentId: i.sourcePaymentId,
        cashierName: i.cashierName,
        cashierAccount: i.cashierAccount,
        currencyCode: i.currencyCode,
        paymentDocNo: i.paymentDocNo,
        paymentDate: formatIsoDate(i.paymentDate),
        cashAdvanceType: i.cashAdvanceType,
        amount: toNumber(i.amount),
        settleAmount: toNumber(i.settleAmount),
        remark: i.remark || '',
      })),
    }));
  }

  async createPayoutReimbursement(
    user: AuthenticatedUser,
    dto: CreatePayoutReimbursementDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Select at least one pending Cashier Payout Advance to reimburse.');
    }

    const scope = await this.resolveScopeWithFallback(user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
    });
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    const createdId = await this.prisma.$transaction(async (tx) => {
      const preparedItems: Array<{
        sourceTable: 'cashier_payment' | 'main_cashier_payment';
        sourcePaymentId: number;
        cashierName: string;
        cashierAccount: string;
        currencyCode: string;
        paymentDocNo: string;
        paymentDate: Date;
        cashAdvanceType: string;
        amount: Decimal;
        settleAmount: Decimal;
        settleBaseAmount: Decimal;
        amountBaseAmount: Decimal;
        floatAccountId: number | null;
        remark: string;
      }> = [];

      let totalAmountBase = new Decimal(0);
      let totalSettledBase = new Decimal(0);

      for (const item of dto.items) {
        if (item.sourceTable === 'cashier_payment') {
          const p = await tx.cashierPayment.findUnique({
            where: { id: item.sourcePaymentId },
            include: { currency: true },
          });
          if (!p) {
            throw new NotFoundException(`Cashier Payment #${item.sourcePaymentId} not found.`);
          }
          if (p.isReimbursed) {
            throw new BadRequestException(
              `Cashier Payment ${p.paymentVoucherNo} has already been reimbursed and cannot be selected again.`,
            );
          }
          const settleDec = toDecimal(item.settleAmount);
          const { baseAmount: settleBase } = await this.fxResolver.convertToBase(settleDec, p.currency.code);
          const { baseAmount: amtBase } = await this.fxResolver.convertToBase(toDecimal(p.amount), p.currency.code);
          totalAmountBase = totalAmountBase.plus(amtBase);
          totalSettledBase = totalSettledBase.plus(settleBase);

          preparedItems.push({
            sourceTable: 'cashier_payment',
            sourcePaymentId: p.id,
            cashierName: p.cashierName || p.requesterName,
            cashierAccount: p.floatAccountName || 'Cash Control Account',
            currencyCode: p.currency.code,
            paymentDocNo: p.paymentVoucherNo || p.docNo,
            paymentDate: p.paymentDate,
            cashAdvanceType: p.cashAdvanceType,
            amount: toDecimal(p.amount),
            settleAmount: settleDec,
            settleBaseAmount: settleBase,
            amountBaseAmount: amtBase,
            floatAccountId: p.floatAccountId,
            remark: item.remark || p.narration || '',
          });
        } else {
          const p = await tx.mainCashierPayment.findUnique({
            where: { id: item.sourcePaymentId },
            include: { currency: true },
          });
          if (!p) {
            throw new NotFoundException(`Main Cashier Payment #${item.sourcePaymentId} not found.`);
          }
          if (p.isReimbursed) {
            throw new BadRequestException(
              `Main Cashier Payment ${p.paymentVoucherNo} has already been reimbursed and cannot be selected again.`,
            );
          }
          const settleDec = toDecimal(item.settleAmount);
          const { baseAmount: settleBase } = await this.fxResolver.convertToBase(settleDec, p.currency.code);
          const { baseAmount: amtBase } = await this.fxResolver.convertToBase(toDecimal(p.amount), p.currency.code);
          totalAmountBase = totalAmountBase.plus(amtBase);
          totalSettledBase = totalSettledBase.plus(settleBase);

          preparedItems.push({
            sourceTable: 'main_cashier_payment',
            sourcePaymentId: p.id,
            cashierName: p.requesterName,
            cashierAccount: p.floatAccountName || 'Main Cash Control Account',
            currencyCode: p.currency.code,
            paymentDocNo: p.paymentVoucherNo || p.docNo,
            paymentDate: p.paymentDate,
            cashAdvanceType: p.cashAdvanceType,
            amount: toDecimal(p.amount),
            settleAmount: settleDec,
            settleBaseAmount: settleBase,
            amountBaseAmount: amtBase,
            floatAccountId: p.floatAccountId,
            remark: item.remark || p.narration || '',
          });
        }
      }

      const docNo =
        dto.docNo && !(await tx.cashierPayoutReimbursement.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : `PRD-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-5)}`;

      const reimb = await tx.cashierPayoutReimbursement.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          fromDate: parseDateOnly(dto.fromDate),
          toDate: parseDateOnly(dto.toDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          bankAccountId: dto.bankAccountId || null,
          bankAccountName: dto.bankAccountName,
          baseCurrencyCode: baseInfo.code,
          totalAmount: toPrismaDecimal(totalAmountBase),
          totalSettledAmount: toPrismaDecimal(totalSettledBase),
          status: 'Completed',
          remark: dto.remark || '',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      await tx.cashierPayoutReimbursementItem.createMany({
        data: preparedItems.map((i) => ({
          reimbursementId: reimb.id,
          sourceTable: i.sourceTable,
          sourcePaymentId: i.sourcePaymentId,
          cashierName: i.cashierName,
          cashierAccount: i.cashierAccount,
          currencyCode: i.currencyCode,
          paymentDocNo: i.paymentDocNo,
          paymentDate: i.paymentDate,
          cashAdvanceType: i.cashAdvanceType,
          amount: toPrismaDecimal(i.amount),
          settleAmount: toPrismaDecimal(i.settleAmount),
          remark: i.remark,
          createUserId: user.id,
          updateUserId: user.id,
        })),
      });

      // Atomically mark each source payment reimbursed & replenish float account
      for (const i of preparedItems) {
        if (i.sourceTable === 'cashier_payment') {
          const upd = await tx.cashierPayment.updateMany({
            where: { id: i.sourcePaymentId, isReimbursed: false },
            data: {
              isReimbursed: true,
              reimbursedAmount: toPrismaDecimal(i.settleAmount),
              reimbursementId: reimb.id,
              approvalStatus: 'Reimbursed',
              updateUserId: user.id,
            },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Duplicate reimbursement blocked for ${i.paymentDocNo}.`);
          }
        } else {
          const upd = await tx.mainCashierPayment.updateMany({
            where: { id: i.sourcePaymentId, isReimbursed: false },
            data: {
              isReimbursed: true,
              reimbursedAmount: toPrismaDecimal(i.settleAmount),
              reimbursementId: reimb.id,
              approvalStatus: 'Reimbursed',
              updateUserId: user.id,
            },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Duplicate reimbursement blocked for ${i.paymentDocNo}.`);
          }
        }

        if (i.floatAccountId) {
          await tx.floatAccount.update({
            where: { id: i.floatAccountId },
            data: {
              currentBalance: { increment: toPrismaDecimal(i.settleAmount) },
              updateUserId: user.id,
            },
          });
        }
      }

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'CashierPayoutReimbursement',
          recordId: reimb.id,
          recordCode: reimb.docNo,
          newValues: { ...reimb, itemCount: preparedItems.length },
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'cashier_payout_reimbursement',
        entityId: reimb.id,
        docNo: reimb.docNo,
        action: 'REIMBURSE',
        step: `Settled ${preparedItems.length} Cashier Payout Advance(s) to ${dto.bankAccountName} (${baseInfo.code} ${toNumber(totalSettledBase)})`,
        toStatus: 'Completed',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return reimb.id;
    });

    const list = await this.listPayoutReimbursements(user);
    return list.find((r) => r.id === createdId);
  }

  // ============================================================================
  // TAB 9: BANK RECONCILIATION — DEPOSIT CONTROL ACCOUNT (SAP B1 STYLE)
  // ============================================================================

  async getDepositControlTransactions(
    user: AuthenticatedUser,
    query?: { fromDate?: string; toDate?: string; companyId?: number; accountName?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query?.fromDate) dateFilter.gte = parseDateOnly(query.fromDate);
    if (query?.toDate) dateFilter.lte = parseDateOnly(query.toDate);
    const hasDate = Boolean(query?.fromDate || query?.toDate);

    const mcsWhere: Prisma.MainCashierSettlementWhereInput = {
      isReconciled: false,
      status: { notIn: ['Draft', 'Cancelled', 'Reversed'] },
      ...(hasDate ? { docDate: dateFilter } : {}),
    };
    const prWhere: Prisma.CashierPayoutReimbursementWhereInput = {
      isReconciled: false,
      ...(hasDate ? { docDate: dateFilter } : {}),
    };
    const srWhere: Prisma.SalesReconciliationWhereInput = {
      isDepositReconciled: false,
      status: { notIn: ['Cancelled', 'Reversed'] },
      totalCollectionBase: { gt: 0 },
      ...(hasDate ? { docDate: dateFilter } : {}),
    };
    const obdWhere: Prisma.OutletBankDepositWhereInput = {
      isReconciled: false,
      processFlowDecision: 'bank',
      ...(hasDate ? { depositDate: dateFilter } : {}),
    };

    applyEntityScopeToWhere(mcsWhere as Record<string, unknown>, scope, { companyId: query?.companyId }, { includeOutlet: true });
    applyEntityScopeToWhere(prWhere as Record<string, unknown>, scope, { companyId: query?.companyId }, { includeBranch: true });
    applyEntityScopeToWhere(srWhere as Record<string, unknown>, scope, { companyId: query?.companyId }, { includeOutlet: true });
    applyEntityScopeToWhere(obdWhere as Record<string, unknown>, scope, { companyId: query?.companyId }, { includeBranch: true, allowNullOutlet: true });

    const [mainSettlements, payoutReimbs, salesRecons, outletBankDeps] = await Promise.all([
      this.prisma.mainCashierSettlement.findMany({
        where: mcsWhere,
        include: { outlet: true },
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.cashierPayoutReimbursement.findMany({
        where: prWhere,
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.salesReconciliation.findMany({
        where: srWhere,
        include: { outlet: true },
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.outletBankDeposit.findMany({
        where: obdWhere,
        include: { outlet: true, currency: true },
        orderBy: [{ depositDate: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const receive = [
      ...mainSettlements.map((s) => ({
        key: `cashier_deposit:${s.id}`,
        side: 'receive' as const,
        sourceType: 'cashier_deposit' as const,
        sourceId: s.id,
        documentDate: formatIsoDate(s.docDate),
        documentType: 'Cashier Deposit',
        documentNo: s.docNo,
        description: s.narration || `Cash Direct Deposit (${s.fromCashierName} → ${s.toBankName})`,
        currencyCode: s.baseCurrencyCode || 'USD',
        amount: toNumber(s.totalTransferBase),
        reconciled: false,
      })),
      ...payoutReimbs.map((r) => ({
        key: `payout_reimbursement:${r.id}`,
        side: 'receive' as const,
        sourceType: 'payout_reimbursement' as const,
        sourceId: r.id,
        documentDate: formatIsoDate(r.docDate),
        documentType: 'Pay Out Reimbursement Deposit',
        documentNo: r.docNo,
        description: r.remark || `Cashier Reimbursement (${r.bankAccountName})`,
        currencyCode: r.baseCurrencyCode || 'USD',
        amount: toNumber(r.totalSettledAmount),
        reconciled: false,
      })),
      ...salesRecons.map((sr) => ({
        key: `direct_sales_deposit:${sr.id}`,
        side: 'receive' as const,
        sourceType: 'direct_sales_deposit' as const,
        sourceId: sr.id,
        documentDate: formatIsoDate(sr.docDate),
        documentType: 'Direct Sales Deposit',
        documentNo: sr.docNo,
        description: sr.remark || `Direct Sales Deposit — ${sr.outlet.name}`,
        currencyCode: sr.baseCurrencyCode || 'USD',
        amount: toNumber(sr.totalCollectionBase),
        reconciled: false,
      })),
    ].sort((a, b) => String(b.documentDate || '').localeCompare(String(a.documentDate || '')));

    const pay = outletBankDeps
      .map((d) => ({
        key: `outlet_bank_settlement:${d.id}`,
        side: 'pay' as const,
        sourceType: 'outlet_bank_settlement' as const,
        sourceId: d.id,
        documentDate: formatIsoDate(d.depositDate),
        documentType: 'Outlet Cash Sales – Bank Settlement',
        documentNo: d.docNo,
        description: d.remark || `${d.outlet?.name || 'Outlet'} Settlement (${d.depositBankRefNo})`,
        currencyCode: d.currency?.code || 'USD',
        amount: toNumber(d.settledAmount || d.totalCollectionAmount),
        reconciled: false,
      }))
      .sort((a, b) => String(b.documentDate || '').localeCompare(String(a.documentDate || '')));

    return {
      accountName: query?.accountName || 'Deposit Control Account',
      fromDate: query?.fromDate || '',
      toDate: query?.toDate || '',
      receive,
      pay,
      totalReceiveAmount: Number(receive.reduce((s, x) => s + x.amount, 0).toFixed(2)),
      totalPayAmount: Number(pay.reduce((s, x) => s + x.amount, 0).toFixed(2)),
    };
  }

  async executeDepositControlReconciliation(
    user: AuthenticatedUser,
    dto: ExecuteDepositControlReconciliationDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Select at least one Receive or Pay transaction to reconcile.');
    }
    const scope = await this.resolveScopeWithFallback(user, { companyId: dto.companyId });
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    const totalReceive = dto.items
      .filter((i) => i.side === 'receive')
      .reduce((sum, i) => sum.plus(toDecimal(i.amount)), new Decimal(0));
    const totalPay = dto.items
      .filter((i) => i.side === 'pay')
      .reduce((sum, i) => sum.plus(toDecimal(i.amount)), new Decimal(0));
    const balance = roundMoney(totalReceive.minus(totalPay));

    const createdId = await this.prisma.$transaction(async (tx) => {
      // Mark every selected source record reconciled atomically (rejecting duplicates)
      for (const item of dto.items) {
        if (item.sourceType === 'cashier_deposit') {
          const upd = await tx.mainCashierSettlement.updateMany({
            where: { id: item.sourceId, isReconciled: false },
            data: { isReconciled: true, updateUserId: user.id },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Transaction ${item.documentNo} is already reconciled.`);
          }
        } else if (item.sourceType === 'payout_reimbursement') {
          const upd = await tx.cashierPayoutReimbursement.updateMany({
            where: { id: item.sourceId, isReconciled: false },
            data: { isReconciled: true, updateUserId: user.id },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Transaction ${item.documentNo} is already reconciled.`);
          }
        } else if (item.sourceType === 'direct_sales_deposit') {
          const upd = await tx.salesReconciliation.updateMany({
            where: { id: item.sourceId, isDepositReconciled: false },
            data: { isDepositReconciled: true, updateUserId: user.id },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Transaction ${item.documentNo} is already reconciled.`);
          }
        } else if (item.sourceType === 'outlet_bank_settlement') {
          const upd = await tx.outletBankDeposit.updateMany({
            where: { id: item.sourceId, isReconciled: false },
            data: { isReconciled: true, updateUserId: user.id },
          });
          if (upd.count === 0) {
            throw new BadRequestException(`Transaction ${item.documentNo} is already reconciled.`);
          }
        }
      }

      const docNo = `DCR-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const recon = await tx.depositControlReconciliation.create({
        data: {
          docNo,
          reconciliationDate: parseDateOnly(dto.reconciliationDate),
          fromDate: parseDateOnly(dto.fromDate),
          toDate: parseDateOnly(dto.toDate),
          companyId: scope.companyId,
          reconciliationAccountName: dto.reconciliationAccountName || 'Deposit Control Account',
          currencyCode: dto.currencyCode || baseInfo.code,
          totalReceiveAmount: toPrismaDecimal(totalReceive),
          totalPayAmount: toPrismaDecimal(totalPay),
          balanceAmount: toPrismaDecimal(balance),
          remarks: dto.remarks || '',
          status: 'Reconciled',
          reconciledById: user.id,
          reconciledByName: user.fullName,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      await tx.depositControlReconciliationItem.createMany({
        data: dto.items.map((item) => ({
          reconciliationId: recon.id,
          side: item.side,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          documentType: item.documentType,
          documentNo: item.documentNo,
          documentDate: parseDateOnly(item.documentDate),
          description: item.description || '',
          currencyCode: item.currencyCode,
          amount: toPrismaDecimal(item.amount),
        })),
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'DepositControlReconciliation',
          recordId: recon.id,
          recordCode: recon.docNo,
          newValues: { ...recon, itemCount: dto.items.length },
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'deposit_control_reconciliation',
        entityId: recon.id,
        docNo: recon.docNo,
        action: 'RECONCILE',
        step: `Reconciled ${dto.items.length} transaction(s) in ${recon.reconciliationAccountName} (Receive: ${toNumber(totalReceive)}, Pay: ${toNumber(totalPay)}, Balance: ${toNumber(balance)})`,
        toStatus: 'Reconciled',
        performedById: user.id,
        performedByName: user.fullName,
        remarks: dto.remarks || null,
        tx,
      });

      return recon.id;
    });

    const history = await this.listDepositControlHistory(user, { companyId: scope.companyId });
    return history.find((h) => h.id === createdId);
  }

  async listDepositControlHistory(
    user: AuthenticatedUser,
    query?: { companyId?: number },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.DepositControlReconciliationWhereInput = {};
    if (query?.companyId) {
      where.companyId = query.companyId;
    } else if (!scope.unrestricted && scope.companyIds.length > 0) {
      where.companyId = { in: scope.companyIds };
    }

    const rows = await this.prisma.depositControlReconciliation.findMany({
      where,
      include: { company: true, items: true },
      orderBy: [{ reconciliationDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      reconciliationDate: formatIsoDate(r.reconciliationDate),
      fromDate: formatIsoDate(r.fromDate),
      toDate: formatIsoDate(r.toDate),
      companyId: r.companyId,
      company: r.company.name,
      reconciliationAccountName: r.reconciliationAccountName,
      currencyCode: r.currencyCode,
      totalReceiveAmount: toNumber(r.totalReceiveAmount),
      totalPayAmount: toNumber(r.totalPayAmount),
      balanceAmount: toNumber(r.balanceAmount),
      remarks: r.remarks || '',
      status: r.status,
      reconciledByName: r.reconciledByName || '',
      items: r.items.map((i) => ({
        id: i.id,
        side: i.side,
        sourceType: i.sourceType,
        sourceId: i.sourceId,
        documentType: i.documentType,
        documentNo: i.documentNo,
        documentDate: formatIsoDate(i.documentDate),
        description: i.description || '',
        currencyCode: i.currencyCode,
        amount: toNumber(i.amount),
      })),
    }));
  }
}
