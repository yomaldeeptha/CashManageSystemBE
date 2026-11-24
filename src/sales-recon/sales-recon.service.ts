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
  CreateSalesReconDto,
  ImportSalesReconBatchDto,
  UnblockSalesReconDto,
} from './dto/sales-recon.dto';

@Injectable()
export class SalesReconService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly fxResolver: ExchangeRateResolverService,
    private readonly numberSeries: NumberSeriesGeneratorService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) { }

  private computeVarianceStatus(variance: Decimal, symbol: string): string {
    if (variance.abs().lt(0.01)) {
      return 'Matched (Zero Variance)';
    }
    const formatted = Math.abs(toNumber(variance)).toFixed(2);
    return variance.lt(0)
      ? `Shortage Exception (-${symbol}${formatted})`
      : `Overage (+${symbol}${formatted})`;
  }

  private async serialize(
    r: Prisma.SalesReconciliationGetPayload<{
      include: {
        company: true;
        branch: true;
        outlet: true;
        shift: true;
        cashier: true;
        linkedCashDeposit: true;
        lines: { include: { currency: true } };
      };
    }>,
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType: 'sales_reconciliation', entityId: r.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: r.id,
      docNo: r.docNo,
      docDate: formatIsoDate(r.docDate),
      companyId: r.companyId,
      company: r.company.name,
      branchId: r.branchId,
      branch: r.branch.name,
      outletId: r.outletId,
      outlet: r.outlet.name,
      shiftId: r.shiftId,
      shift: r.shift?.name || 'Shift 1 - Morning',
      cashierId: r.cashierId,
      cashier: r.cashier?.name || 'Unassigned',
      shiftStatus: r.shiftStatus,
      baseCurrency: r.baseCurrencyCode,
      posGrossSales: toNumber(r.posGrossSales),
      returns: toNumber(r.returnsAmount),
      netSales: toNumber(r.netSales),
      totalCollectionBase: toNumber(r.totalCollectionBase),
      variance: toNumber(r.varianceAmount),
      varianceStatus: r.varianceStatus,
      rootCauseCategory: r.rootCauseCategory || '',
      overrideReason: r.overrideReason || '',
      isPeriodLocked: r.isPeriodLocked,
      lockedAt: r.lockedAt?.toISOString() || null,
      unblockReason: r.unblockReason || null,
      status: r.status,
      remark: r.remark || '',
      approverName: r.approverName || '',
      approverRemarks: r.approverRemarks || '',
      approvedAt: r.approvedAt?.toISOString() || null,
      linkedCashDepositId: r.linkedCashDepositId,
      linkedEnvelopeNo: r.linkedCashDeposit?.envelopeNo || null,
      settlementModes: r.lines.map((l) => ({
        id: l.id,
        shift: l.shiftName,
        cashier: l.cashierName,
        shiftTotalSales: toNumber(l.shiftTotalSales),
        bank: l.bankOrSafe,
        mode: l.paymentTypeName,
        paymentType: l.paymentTypeName,
        subType: l.subTypeName,
        currency: l.currency.code,
        amount: toNumber(l.amount),
        exRate: toNumber(l.exRate, 6),
        baseAmount: toNumber(l.baseAmount),
        autoFilled: Boolean(l.autoFilledFromDepositId),
        diffType: l.diffType || '',
        remarks: l.remarks || '',
      })),
      auditTrail: logs.map((l) => ({
        step: l.step,
        user: l.performedByName,
        time: l.createdAt.toISOString(),
        status: l.toStatus || l.action,
      })),
    };
  }

  async list(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; status?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.SalesReconciliationWhereInput = {};
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { companyId: query?.companyId, outletId: query?.outletId },
      { includeOutlet: true },
    );
    if (query?.status && query.status !== 'all') {
      if (query.status === 'shortage') {
        where.varianceAmount = { lt: 0 };
      } else if (query.status === 'matched') {
        where.varianceAmount = { equals: 0 };
      } else if (query.status === 'in-review') {
        where.status = 'In Review';
      } else {
        where.status = { equals: query.status, mode: 'insensitive' };
      }
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { outlet: { name: { contains: query.search, mode: 'insensitive' } } },
        { cashier: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.salesReconciliation.findMany({
      where,
      include: {
        company: true,
        branch: true,
        outlet: true,
        shift: true,
        cashier: true,
        linkedCashDeposit: true,
        lines: { include: { currency: true } },
      },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return Promise.all(rows.map((r) => this.serialize(r)));
  }

  async getOne(user: AuthenticatedUser, id: number) {
    const recon = await this.prisma.salesReconciliation.findUnique({
      where: { id },
      include: {
        company: true,
        branch: true,
        outlet: true,
        shift: true,
        cashier: true,
        linkedCashDeposit: true,
        lines: { include: { currency: true } },
      },
    });
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${id} not found.`);
    await assertEntityScope(this.prisma, user, recon);
    return this.serialize(recon);
  }

  async save(user: AuthenticatedUser, dto: CreateSalesReconDto, editId?: number) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    if (!scope.outletId) {
      throw new BadRequestException('Outlet is required for Sales Reconciliation.');
    }

    if (editId) {
      const existing = await this.prisma.salesReconciliation.findUnique({ where: { id: editId } });
      if (!existing) throw new NotFoundException(`Sales Reconciliation #${editId} not found.`);
      await assertEntityScope(this.prisma, user, existing);
      if (existing.isPeriodLocked || existing.status === 'Locked') {
        throw new ForbiddenException(
          `Period is locked for ${existing.docNo}. Unblock the period with Document Unblocking Authority before making edits.`,
        );
      }
      if (['Approved', 'Posted'].includes(existing.status)) {
        throw new ForbiddenException(
          `Cannot modify ${existing.docNo} once it has been "${existing.status}".`,
        );
      }
    }

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const posGross = toDecimal(dto.posGrossSales);
    const returnsAmt = toDecimal(dto.returns || 0);
    const netSales = roundMoney(posGross.minus(returnsAmt));

    let totalCollectionBase = new Decimal(0);
    const preparedLines: Array<{
      shiftId: number | null;
      shiftName: string;
      cashierName: string;
      shiftTotalSales: Decimal;
      bankOrSafe: string;
      paymentTypeName: string;
      subTypeName: string;
      currencyId: number;
      amount: Decimal;
      rate: Decimal;
      baseAmount: Decimal;
      diffType: string;
      remarks: string;
    }> = [];

    for (const line of dto.lines || []) {
      const cur = await this.prisma.currency.findUnique({
        where: { code: line.currency.trim().toUpperCase() },
      });
      if (!cur) throw new BadRequestException(`Currency "${line.currency}" not found.`);
      const { rate, baseAmount } = await this.fxResolver.convertToBase(line.amount, cur.code);
      totalCollectionBase = totalCollectionBase.plus(baseAmount);
      preparedLines.push({
        shiftId: line.shiftId || null,
        shiftName: line.shift,
        cashierName: line.cashier,
        shiftTotalSales: toDecimal(line.shiftTotalSales ?? 0),
        bankOrSafe: line.bank,
        paymentTypeName: line.paymentType,
        subTypeName: line.subType || 'Standard',
        currencyId: cur.id,
        amount: toDecimal(line.amount),
        rate,
        baseAmount,
        diffType: line.diffType || '',
        remarks: line.remarks || '',
      });
    }

    const variance = roundMoney(totalCollectionBase.minus(netSales));
    const varianceStatus = this.computeVarianceStatus(variance, baseInfo.symbol);
    // Prevent client-controlled status spoofing (never accept Approved/Locked/Posted on save)
    const nextStatus =
      dto.status === 'Draft'
        ? 'Draft'
        : variance.abs().gte(0.01)
          ? 'In Review'
          : 'Submitted';

    const savedId = await this.prisma.$transaction(async (tx) => {
      let reconId = editId;
      let docNo = dto.docNo || '';

      if (editId) {
        const oldRecon = await tx.salesReconciliation.findUnique({ where: { id: editId } });
        const updated = await tx.salesReconciliation.update({
          where: { id: editId },
          data: {
            docDate: parseDateOnly(dto.docDate),
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId!,
            shiftId: dto.shiftId || 1,
            cashierId: dto.cashierId || user.employeeId || 1,
            shiftStatus: dto.shiftStatus || 'Closed',
            baseCurrencyCode: baseInfo.code,
            posGrossSales: toPrismaDecimal(posGross),
            returnsAmount: toPrismaDecimal(returnsAmt),
            netSales: toPrismaDecimal(netSales),
            totalCollectionBase: toPrismaDecimal(totalCollectionBase),
            varianceAmount: toPrismaDecimal(variance),
            varianceStatus,
            rootCauseCategory: dto.rootCauseCategory || null,
            overrideReason: dto.overrideReason || null,
            linkedCashDepositId: dto.linkedCashDepositId || null,
            status: nextStatus,
            remark: dto.remark || '',
            updatedById: user.id,
            updateUserId: user.id,
          },
        });
        docNo = updated.docNo;
        if (dto.lines) {
          await tx.salesReconciliationLine.deleteMany({ where: { reconciliationId: editId } });
        }
        if (this.changeLogService && oldRecon) {
          await this.changeLogService.logUpdate({
            tableName: 'SalesReconciliation',
            recordId: updated.id,
            recordCode: updated.docNo,
            oldValues: oldRecon,
            newValues: updated,
            actor: user,
            tx,
          });
        }
      } else {
        docNo =
          dto.docNo && !(await tx.salesReconciliation.findUnique({ where: { docNo: dto.docNo } }))
            ? dto.docNo
            : await this.numberSeries.allocateNextNumber('FRM-SREC-DAYEND', {
              branchId: scope.branchId,
              tx,
              fallbackPrefix: 'SREC-2026-',
            });
        const created = await tx.salesReconciliation.create({
          data: {
            docNo,
            docDate: parseDateOnly(dto.docDate),
            companyId: scope.companyId,
            branchId: scope.branchId,
            outletId: scope.outletId!,
            shiftId: dto.shiftId || 1,
            cashierId: dto.cashierId || user.employeeId || 1,
            shiftStatus: dto.shiftStatus || 'Closed',
            baseCurrencyCode: baseInfo.code,
            posGrossSales: toPrismaDecimal(posGross),
            returnsAmount: toPrismaDecimal(returnsAmt),
            netSales: toPrismaDecimal(netSales),
            totalCollectionBase: toPrismaDecimal(totalCollectionBase),
            varianceAmount: toPrismaDecimal(variance),
            varianceStatus,
            rootCauseCategory: dto.rootCauseCategory || null,
            overrideReason: dto.overrideReason || null,
            linkedCashDepositId: dto.linkedCashDepositId || null,
            status: nextStatus,
            remark: dto.remark || '',
            createdById: user.id,
            updatedById: user.id,
            createUserId: user.id,
            updateUserId: user.id,
          },
        });
        reconId = created.id;
        if (this.changeLogService) {
          await this.changeLogService.logCreate({
            tableName: 'SalesReconciliation',
            recordId: created.id,
            recordCode: created.docNo,
            newValues: created,
            actor: user,
            tx,
          });
        }
      }

      if (preparedLines.length > 0) {
        await tx.salesReconciliationLine.createMany({
          data: preparedLines.map((l) => ({
            reconciliationId: reconId!,
            shiftId: l.shiftId,
            shiftName: l.shiftName,
            cashierName: l.cashierName,
            shiftTotalSales: toPrismaDecimal(l.shiftTotalSales),
            bankOrSafe: l.bankOrSafe,
            paymentTypeName: l.paymentTypeName,
            subTypeName: l.subTypeName,
            currencyId: l.currencyId,
            amount: toPrismaDecimal(l.amount),
            exRate: toPrismaRate(l.rate),
            baseAmount: toPrismaDecimal(l.baseAmount),
            diffType: l.diffType,
            remarks: l.remarks,
            createUserId: user.id,
            updateUserId: user.id,
          })),
        });
      }

      // Log VarianceIncident automatically when variance != 0
      if (variance.abs().gte(0.01)) {
        const existingIncident = await tx.varianceIncident.findFirst({
          where: { reconciliationId: reconId! },
        });
        if (!existingIncident) {
          const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
          const inc = await tx.varianceIncident.create({
            data: {
              incidentCode: `VAR-${new Date().getUTCFullYear()}-${suffix}`,
              reconciliationId: reconId!,
              incidentDate: parseDateOnly(dto.docDate),
              shiftTime: 'Shift Close',
              companyId: scope.companyId,
              branchId: scope.branchId,
              outletId: scope.outletId!,
              cashierId: dto.cashierId || user.employeeId || null,
              cashierName: preparedLines[0]?.cashierName || user.fullName,
              type: variance.lt(0) ? 'Shortage' : 'Overage',
              posExpectedAmount: toPrismaDecimal(netSales),
              actualCountAmount: toPrismaDecimal(totalCollectionBase),
              varianceAmount: toPrismaDecimal(variance),
              rootCause: dto.rootCauseCategory || 'Reconciliation Discrepancy Pending Review',
              cashierExplanation: dto.remark || dto.overrideReason || '',
              auditStatus: 'Investigating',
              createUserId: user.id,
              updateUserId: user.id,
            },
          });
          if (this.changeLogService) {
            await this.changeLogService.logCreate({
              tableName: 'VarianceIncident',
              recordId: inc.id,
              recordCode: inc.incidentCode,
              newValues: inc,
              actor: user,
              tx,
            });
          }
        }
      }

      if (['Submitted', 'In Review'].includes(nextStatus)) {
        await this.approvalsService.initiateApproval({
          entityType: 'sales_reconciliation',
          documentKey: 'salesReconciliation',
          entityId: reconId!,
          docNo,
          title: `Shift Recon: ${docNo}`,
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          submittedById: user.id,
          amountBase: toNumber(netSales),
          baseCurrencyCode: baseInfo.code,
          varianceBase: toNumber(variance),
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'sales_reconciliation',
        entityId: reconId!,
        docNo,
        action: editId ? 'UPDATE' : 'CREATE',
        step: `${editId ? 'Updated' : 'Created'} Sales Reconciliation (${varianceStatus})`,
        toStatus: nextStatus,
        performedById: user.id,
        performedByName: user.fullName,
        remarks: dto.remark || null,
        tx,
      });

      return reconId!;
    });

    return this.getOne(user, savedId);
  }

  async getProcess01Envelopes(user: AuthenticatedUser, outletId?: number) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.CashDepositWhereInput = {
      status: { in: ['Submitted', 'Handover Verified', 'In Review', 'Approved', 'Posted'] },
    };
    applyEntityScopeToWhere(
      where as Record<string, unknown>,
      scope,
      { outletId },
      { includeOutlet: true },
    );

    const deposits = await this.prisma.cashDeposit.findMany({
      where,
      include: { outlet: true, cashCollector: true },
      orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
      take: 50,
    });

    return deposits.map((d) => ({
      id: d.id,
      docNo: d.docNo,
      envelope: d.envelopeNo,
      envelopeNo: d.envelopeNo,
      outletId: d.outletId,
      outlet: d.outlet.name,
      collectionDate: formatIsoDate(d.collectionDate),
      amountUSD: toNumber(d.totalBaseAmount),
      amountBase: toNumber(d.totalBaseAmount),
      baseCurrency: d.baseCurrencyCode,
      collector: `${d.cashCollector.name} (${d.cashCollector.empNo})`,
      receiptVoucher: `REC-${d.docNo}`,
      status: d.status,
    }));
  }

  async syncEnvelope(user: AuthenticatedUser, reconId: number, cashDepositId: number) {
    const [recon, dep] = await Promise.all([
      this.prisma.salesReconciliation.findUnique({
        where: { id: reconId },
        include: { lines: true },
      }),
      this.prisma.cashDeposit.findUnique({ where: { id: cashDepositId } }),
    ]);
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${reconId} not found.`);
    if (!dep) throw new NotFoundException(`Process 01 Cash Deposit #${cashDepositId} not found.`);
    if (recon.isPeriodLocked || ['Locked', 'Approved', 'Posted'].includes(recon.status)) {
      throw new ForbiddenException(
        `Cannot sync envelope into a "${recon.status}" or period-locked reconciliation.`,
      );
    }
    await assertEntityScope(this.prisma, user, recon);
    await assertEntityScope(this.prisma, user, dep);

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const cashLine = recon.lines.find((l) => l.paymentTypeName.toLowerCase().includes('cash'));

    await this.prisma.$transaction(async (tx) => {
      if (cashLine) {
        const baseCurrencyRec = await tx.currency.findUnique({ where: { code: baseInfo.code } });
        await tx.salesReconciliationLine.update({
          where: { id: cashLine.id },
          data: {
            ...(baseCurrencyRec ? { currencyId: baseCurrencyRec.id } : {}),
            amount: dep.totalBaseAmount,
            exRate: toPrismaRate(1),
            baseAmount: dep.totalBaseAmount,
            autoFilledFromDepositId: dep.id,
            remarks: `Auto-filled from Process 01 ${dep.docNo} (${dep.envelopeNo})`,
            updateUserId: user.id,
          },
        });
      }
      const updatedLines = await tx.salesReconciliationLine.findMany({
        where: { reconciliationId: reconId },
      });
      const totalColl = updatedLines.reduce((s, l) => s.plus(toDecimal(l.baseAmount)), new Decimal(0));
      const variance = roundMoney(totalColl.minus(toDecimal(recon.netSales)));

      const updatedRecon = await tx.salesReconciliation.update({
        where: { id: reconId },
        data: {
          linkedCashDepositId: dep.id,
          totalCollectionBase: toPrismaDecimal(totalColl),
          varianceAmount: toPrismaDecimal(variance),
          varianceStatus: this.computeVarianceStatus(variance, baseInfo.symbol),
          updateUserId: user.id,
          updatedById: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'SalesReconciliation',
          recordId: reconId,
          recordCode: recon.docNo,
          oldValues: recon,
          newValues: updatedRecon,
          description: `Synced physical cash from Process 01 ${dep.docNo} (${dep.envelopeNo})`,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'sales_reconciliation',
        entityId: reconId,
        docNo: recon.docNo,
        action: 'SYNC_PROCESS01',
        step: `Synced physical cash from Process 01 ${dep.docNo} (${dep.envelopeNo})`,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    return this.getOne(user, reconId);
  }

  async autoReconcileAll(user: AuthenticatedUser) {
    const scope = await getEffectiveScope(this.prisma, user);
    const candidates = await this.prisma.salesReconciliation.findMany({
      where: {
        status: { in: ['Submitted', 'In Review'] },
        isPeriodLocked: false,
        ...(scope.unrestricted ? {} : { companyId: { in: scope.companyIds }, outletId: { in: scope.outletIds } }),
      },
    });

    let matchedCount = 0;
    let skippedSelfAuthored = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const r of candidates) {
        // Strict Maker != Checker control: never auto-approve caller's own submissions
        if (r.createdById === user.id) {
          skippedSelfAuthored += 1;
          continue;
        }
        if (toDecimal(r.varianceAmount).abs().lt(0.01)) {
          const next = await tx.salesReconciliation.update({
            where: { id: r.id },
            data: {
              status: 'Approved',
              varianceStatus: 'Matched (Zero Variance)',
              approvedById: user.id,
              approverName: user.fullName,
              approvedAt: new Date(),
              updateUserId: user.id,
              updatedById: user.id,
            },
          });
          await tx.approvalInstance.updateMany({
            where: {
              entityType: 'sales_reconciliation',
              entityId: r.id,
              status: { in: ['Pending', 'In Review'] },
            },
            data: { status: 'Approved', completedAt: new Date(), updateUserId: user.id },
          });
          if (this.changeLogService) {
            await this.changeLogService.logAction({
              action: 'APPROVE',
              tableName: 'SalesReconciliation',
              recordId: r.id,
              recordCode: r.docNo,
              oldValues: r,
              newValues: next,
              description: 'Auto-reconciled zero-variance shift close',
              actor: user,
              tx,
            });
          }
          await this.auditService.log({
            entityType: 'sales_reconciliation',
            entityId: r.id,
            docNo: r.docNo,
            action: 'AUTO_RECONCILE',
            step: 'Auto-reconciled zero-variance shift close',
            fromStatus: r.status,
            toStatus: 'Approved',
            performedById: user.id,
            performedByName: user.fullName,
            tx,
          });
          matchedCount += 1;
        }
      }
    });

    return { matchedCount, skippedSelfAuthored, totalChecked: candidates.length };
  }

  async importBatch(user: AuthenticatedUser, dto: ImportSalesReconBatchDto) {
    // Deduplicate shiftTotalSales per unique shift so multiple tender rows do not multiply gross sales
    const shiftSalesMap = new Map<string, Decimal>();
    let fallbackSum = new Decimal(0);
    for (const r of dto.rows) {
      const shiftKey = (r.shift || 'Default').trim().toLowerCase();
      if (r.shiftTotalSales !== undefined && Number(r.shiftTotalSales) > 0) {
        if (!shiftSalesMap.has(shiftKey)) {
          shiftSalesMap.set(shiftKey, toDecimal(r.shiftTotalSales));
        }
      } else {
        fallbackSum = fallbackSum.plus(toDecimal(r.amount || 0));
      }
    }
    const shiftSalesSum = Array.from(shiftSalesMap.values()).reduce(
      (sum, val) => sum.plus(val),
      new Decimal(0),
    );
    const totalSales = toNumber(shiftSalesSum.gt(0) ? shiftSalesSum : fallbackSum);
    return this.save(user, {
      companyId: dto.companyId,
      outletId: dto.outletId,
      docDate: dto.docDate,
      posGrossSales: totalSales,
      returns: 0,
      status: 'Submitted',
      remark: `Imported batch of ${dto.rows.length} POS tender rows`,
      lines: dto.rows,
    });
  }

  async approve(user: AuthenticatedUser, id: number, body?: { comment?: string }) {
    const recon = await this.prisma.salesReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${id} not found.`);
    await assertEntityScope(this.prisma, user, recon);

    return this.approvalsService.decideByEntity(user, 'sales_reconciliation', id, {
      decision: 'approve',
      comment: body?.comment,
    });
  }

  async reject(user: AuthenticatedUser, id: number, body: { reason?: string; comment?: string }) {
    const recon = await this.prisma.salesReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${id} not found.`);
    await assertEntityScope(this.prisma, user, recon);

    return this.approvalsService.decideByEntity(user, 'sales_reconciliation', id, {
      decision: 'reject',
      comment: body?.reason || body?.comment,
    });
  }

  async lockPeriod(user: AuthenticatedUser, id: number) {
    const recon = await this.prisma.salesReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${id} not found.`);
    await assertEntityScope(this.prisma, user, recon);
    if (recon.status !== 'Approved' && recon.status !== 'Posted') {
      throw new BadRequestException(
        `Only Approved or Posted reconciliations can be period-locked (current: ${recon.status}).`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const next = await tx.salesReconciliation.update({
        where: { id },
        data: {
          isPeriodLocked: true,
          status: 'Locked',
          lockedById: user.id,
          lockedAt: new Date(),
          updateUserId: user.id,
          updatedById: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'CLOSE',
          tableName: 'SalesReconciliation',
          recordId: id,
          recordCode: recon.docNo,
          oldValues: recon,
          newValues: next,
          description: `Enforced End-of-Day Period Lock on ${recon.docNo}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'sales_reconciliation',
        entityId: id,
        docNo: recon.docNo,
        action: 'PERIOD_LOCK',
        step: `Enforced End-of-Day Period Lock on ${recon.docNo}`,
        fromStatus: recon.status,
        toStatus: 'Locked',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    return this.getOne(user, id);
  }

  async unblockPeriod(user: AuthenticatedUser, id: number, dto: UnblockSalesReconDto) {
    const recon = await this.prisma.salesReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException(`Sales Reconciliation #${id} not found.`);
    await assertEntityScope(this.prisma, user, recon);
    if (!recon.isPeriodLocked && recon.status !== 'Locked') {
      throw new BadRequestException('Reconciliation is not currently period-locked.');
    }

    await this.prisma.$transaction(async (tx) => {
      const next = await tx.salesReconciliation.update({
        where: { id },
        data: {
          isPeriodLocked: false,
          status: 'In Review',
          unblockedById: user.id,
          unblockedAt: new Date(),
          unblockReason: dto.reason.trim(),
          updateUserId: user.id,
          updatedById: user.id,
        },
      });
      await this.approvalsService.initiateApproval({
        entityType: 'sales_reconciliation',
        documentKey: 'salesReconciliation',
        entityId: id,
        docNo: recon.docNo,
        title: `Re-Approval (Unblocked): ${recon.docNo}`,
        companyId: recon.companyId,
        branchId: recon.branchId,
        outletId: recon.outletId,
        submittedById: recon.createdById || user.id,
        amountBase: toNumber(recon.netSales),
        baseCurrencyCode: recon.baseCurrencyCode,
        varianceBase: toNumber(recon.varianceAmount),
        tx,
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'REOPEN',
          tableName: 'SalesReconciliation',
          recordId: id,
          recordCode: recon.docNo,
          oldValues: recon,
          newValues: next,
          description: `Unblocked locked period ${recon.docNo}: ${dto.reason.trim()}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'sales_reconciliation',
        entityId: id,
        docNo: recon.docNo,
        action: 'PERIOD_UNBLOCK',
        step: `Unblocked locked period ${recon.docNo}: ${dto.reason.trim()}`,
        fromStatus: 'Locked',
        toStatus: 'In Review',
        performedById: user.id,
        performedByName: user.fullName,
        remarks: dto.reason.trim(),
        tx,
      });
    });

    return this.getOne(user, id);
  }

  async getFinalReport(user: AuthenticatedUser, id: number) {
    const recon = await this.getOne(user, id);
    const glAccounts = await this.prisma.glAccount.findMany({ where: { isActive: true } });

    const cashGl = glAccounts.find((g) => g.code === '1010-01') || {
      code: '1010-01',
      name: 'Treasury Cash In-Transit',
    };
    const cardGl = glAccounts.find((g) => g.code === '1020-05') || {
      code: '1020-05',
      name: 'POS Card Merchant Clearing Account',
    };
    const qrGl = glAccounts.find((g) => g.code === '1030-02') || {
      code: '1030-02',
      name: 'QR & Electronic Settlement Gateway',
    };
    const revGl = glAccounts.find((g) => g.code === '4000-10') || {
      code: '4000-10',
      name: 'Outlet Daily Gross Sales Revenue',
    };
    const varGl = glAccounts.find((g) => g.code === '5090-00') || {
      code: '5090-00',
      name: 'Cash Over / Short Variance Account',
    };

    let cashTotal = new Decimal(0);
    let cardTotal = new Decimal(0);
    let digitalTotal = new Decimal(0);

    for (const line of recon.settlementModes) {
      const mode = line.paymentType.toLowerCase();
      if (mode.includes('cash')) {
        cashTotal = cashTotal.plus(line.baseAmount);
      } else if (mode.includes('card') || mode.includes('terminal')) {
        cardTotal = cardTotal.plus(line.baseAmount);
      } else {
        digitalTotal = digitalTotal.plus(line.baseAmount);
      }
    }

    const journalLines: Array<{
      glCode: string;
      accountName: string;
      debit: number;
      credit: number;
    }> = [];

    if (cashTotal.gt(0)) {
      journalLines.push({ glCode: cashGl.code, accountName: cashGl.name, debit: toNumber(cashTotal), credit: 0 });
    }
    if (cardTotal.gt(0)) {
      journalLines.push({ glCode: cardGl.code, accountName: cardGl.name, debit: toNumber(cardTotal), credit: 0 });
    }
    if (digitalTotal.gt(0)) {
      journalLines.push({ glCode: qrGl.code, accountName: qrGl.name, debit: toNumber(digitalTotal), credit: 0 });
    }

    const variance = toDecimal(recon.variance);
    if (variance.lt(0)) {
      journalLines.push({
        glCode: varGl.code,
        accountName: `${varGl.name} (Shortage)`,
        debit: toNumber(variance.abs()),
        credit: 0,
      });
    } else if (variance.gt(0)) {
      journalLines.push({
        glCode: varGl.code,
        accountName: `${varGl.name} (Overage)`,
        debit: 0,
        credit: toNumber(variance),
      });
    }

    journalLines.push({
      glCode: revGl.code,
      accountName: revGl.name,
      debit: 0,
      credit: recon.netSales,
    });

    const totalDebit = toNumber(
      journalLines.reduce((s, l) => s.plus(toDecimal(l.debit)), new Decimal(0)),
    );
    const totalCredit = toNumber(
      journalLines.reduce((s, l) => s.plus(toDecimal(l.credit)), new Decimal(0)),
    );

    return {
      reconciliation: recon,
      journalVoucher: {
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        totalDebit,
        totalCredit,
        baseCurrency: recon.baseCurrency,
        lines: journalLines,
      },
    };
  }
}
