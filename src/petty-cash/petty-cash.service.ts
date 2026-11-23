import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { assertEntityScope, getEffectiveScope } from '../common/utils/scope.util';
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
  CreateBillSubmissionDto,
  CreateFloatReimbursementDto,
  CreatePettyCashAdvanceDto,
  CreatePettyCashRequestDto,
  CreatePettyCashReturnDto,
  FloatVoucherInputDto,
} from './dto/petty-cash.dto';

@Injectable()
export class PettyCashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly approvalsService: ApprovalsService,
    private readonly notificationsService: NotificationsService,
    private readonly fxResolver: ExchangeRateResolverService,
    private readonly numberSeries: NumberSeriesGeneratorService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) { }

  private isApproverRole(user: AuthenticatedUser): boolean {
    if (user.roleCode === 'ADM') return true;
    const role = user.roleName.toLowerCase();
    return (
      role.includes('checker') ||
      role.includes('manager') ||
      role.includes('admin') ||
      Boolean(user.permissions?.pettyCash?.approve)
    );
  }

  private async resolveCurrency(currencyId?: number, currencyCode?: string) {
    if (currencyId) {
      const c = await this.prisma.currency.findUnique({ where: { id: currencyId } });
      if (c) return c;
    }
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const code = (currencyCode || baseInfo.code).trim().toUpperCase();
    const c = await this.prisma.currency.findUnique({ where: { code } });
    if (!c) throw new BadRequestException(`Currency "${code}" not found.`);
    return c;
  }

  // ============================================================================
  // P1: PETTY CASH REQUESTS
  // ============================================================================

  private async serializeRequest(
    r: Prisma.PettyCashRequestGetPayload<{
      include: {
        company: true;
        branch: true;
        outlet: true;
        department: true;
        requestedBy: true;
        expenseCategory: true;
        currency: true;
      };
    }>,
    budgetMap: Map<number, { allocated: number; monthlyLimit: number; consumed: number; available: number }>,
  ) {
    const [attachments, logs] = await Promise.all([
      this.prisma.documentAttachment.findMany({
        where: { entityType: 'petty_cash_request', entityId: r.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'petty_cash_request', entityId: r.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const deptBudget = budgetMap.get(r.departmentId) || {
      allocated: 36000,
      monthlyLimit: 3000,
      consumed: 0,
      available: 3000,
    };

    return {
      id: r.id,
      requestId: r.requestId,
      requestDate: formatIsoDate(r.requestDate),
      companyId: r.companyId,
      company: r.company.name,
      branchId: r.branchId,
      branch: r.branch.name,
      outletId: r.outletId,
      outlet: r.outlet?.name || '',
      departmentId: r.departmentId,
      department: r.department.name,
      requestedById: r.requestedById,
      requestedBy: r.requestedBy.name,
      employeeId: r.requestedBy.empNo,
      requesterTitle: r.requesterTitle || `${r.requestedBy.name} (${r.requestedBy.empNo})`,
      expenseCategoryId: r.expenseCategoryId,
      expenseCategory: r.expenseCategory.name,
      currencyId: r.currencyId,
      currency: r.currency.code,
      requestAmount: toNumber(r.requestAmount),
      baseCurrency: r.baseCurrencyCode,
      baseAmount: toNumber(r.baseAmount),
      approvedAmount: r.approvedAmount !== null ? toNumber(r.approvedAmount) : null,
      paidAmount: toNumber(r.paidAmount),
      settledAmount: toNumber(r.settledAmount),
      refundAmount: toNumber(r.refundAmount),
      settledDate: formatIsoDate(r.settledDate),
      refundDate: formatIsoDate(r.refundDate),
      approvedBy: r.approvedByName || '',
      approvedDate: formatIsoDate(r.approvedDate),
      purpose: r.purpose,
      remark: r.remark || '',
      status: r.status,
      budget: {
        total: deptBudget.monthlyLimit,
        consumed: deptBudget.consumed,
        available: deptBudget.available,
      },
      hasAttachment: attachments.length > 0,
      attachmentName: attachments[0]?.fileName || null,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSizeLabel,
        type: a.docType,
        remark: a.remark,
        uploadDate: formatIsoDate(a.createdAt),
        downloadUrl: `/api/v1/attachments/${a.id}/download`,
      })),
      auditTrail: logs.map((l) => ({
        step: l.step,
        user: l.performedByName,
        time: l.createdAt.toISOString(),
        status: l.toStatus || l.action,
      })),
    };
  }

  async listRequests(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; category?: string; status?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.PettyCashRequestWhereInput = {};
    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      where.branchId = { in: scope.branchIds };
    }
    if (query?.companyId) where.companyId = Number(query.companyId);
    if (query?.outletId && query.outletId !== 'all') where.outletId = Number(query.outletId);
    if (query?.category && query.category !== 'all') {
      where.expenseCategory = { name: { equals: query.category, mode: 'insensitive' } };
    }
    if (query?.status && query.status !== 'all') {
      where.status = { equals: query.status, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { requestId: { contains: query.search, mode: 'insensitive' } },
        { purpose: { contains: query.search, mode: 'insensitive' } },
        { requestedBy: { name: { contains: query.search, mode: 'insensitive' } } },
        { department: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, budgets] = await Promise.all([
      this.prisma.pettyCashRequest.findMany({
        where,
        include: {
          company: true,
          branch: true,
          outlet: true,
          department: true,
          requestedBy: true,
          expenseCategory: true,
          currency: true,
        },
        orderBy: [{ requestDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.budget.findMany({ where: { isActive: true } }),
    ]);

    const budgetMap = new Map(
      budgets.map((b) => [
        b.departmentId,
        {
          allocated: toNumber(b.allocatedAmount),
          monthlyLimit: toNumber(b.monthlyLimit),
          consumed: toNumber(b.consumedAmount),
          available: toNumber(b.availableAmount),
        },
      ]),
    );

    return Promise.all(rows.map((r) => this.serializeRequest(r, budgetMap)));
  }

  async createRequest(user: AuthenticatedUser, dto: CreatePettyCashRequestDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const [dept, emp, expCat, cur] = await Promise.all([
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
      this.prisma.employee.findUnique({ where: { id: dto.requestedById } }),
      this.prisma.expenseCategory.findUnique({ where: { id: dto.expenseCategoryId } }),
      this.resolveCurrency(dto.currencyId, dto.currency),
    ]);
    if (!dept) throw new BadRequestException(`Department ID ${dto.departmentId} does not exist.`);
    if (!emp) throw new BadRequestException(`Employee ID ${dto.requestedById} does not exist.`);
    if (!expCat) throw new BadRequestException(`Expense Category ID ${dto.expenseCategoryId} does not exist.`);

    const { baseCurrency, baseAmount } = await this.fxResolver.convertToBase(dto.requestAmount, cur.code);
    const status = dto.status || 'Submitted';

    const createdId = await this.prisma.$transaction(async (tx) => {
      const requestId =
        dto.requestId && !(await tx.pettyCashRequest.findUnique({ where: { requestId: dto.requestId } }))
          ? dto.requestId
          : await this.numberSeries.allocateNextNumber('FRM-PCR-REQ', {
            branchId: scope.branchId,
            tx,
            fallbackPrefix: 'REQ-',
          });

      const created = await tx.pettyCashRequest.create({
        data: {
          requestId,
          requestDate: parseDateOnly(dto.requestDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          departmentId: dept.id,
          requestedById: emp.id,
          requesterTitle: dto.requesterTitle || `${emp.name} (${emp.empNo}) - ${emp.designation}`,
          expenseCategoryId: expCat.id,
          currencyId: cur.id,
          requestAmount: toPrismaDecimal(dto.requestAmount),
          baseCurrencyCode: baseCurrency,
          baseAmount: toPrismaDecimal(baseAmount),
          purpose: dto.purpose.trim(),
          remark: dto.remark || '',
          status,
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'PettyCashRequest',
          recordId: created.id,
          recordCode: created.requestId,
          newValues: created,
          actor: user,
          tx,
        });
      }

      if (status === 'Submitted') {
        await this.approvalsService.initiateApproval({
          entityType: 'petty_cash_request',
          documentKey: 'pettyCashAdvance',
          entityId: created.id,
          docNo: created.requestId,
          title: `Advance: ${created.purpose.slice(0, 80)}`,
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          submittedById: user.id,
          amountBase: toNumber(baseAmount),
          baseCurrencyCode: baseCurrency,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'petty_cash_request',
        entityId: created.id,
        docNo: created.requestId,
        action: status === 'Draft' ? 'SAVE_DRAFT' : 'SUBMIT',
        step: status === 'Draft' ? 'Saved Petty Cash Request Draft' : 'Submitted Petty Cash Request for Approval',
        toStatus: status,
        performedById: user.id,
        performedByName: user.fullName,
        remarks: dto.remark || null,
        tx,
      });

      return created.id;
    });

    const list = await this.listRequests(user);
    return list.find((r) => r.id === createdId);
  }

  async approveRequest(
    user: AuthenticatedUser,
    id: number,
    body?: { approvedAmount?: number; comment?: string },
  ) {
    const req = await this.prisma.pettyCashRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Petty Cash Request #${id} not found.`);
    await assertEntityScope(this.prisma, user, req);

    if (body?.approvedAmount !== undefined) {
      if (body.approvedAmount <= 0 || body.approvedAmount > toNumber(req.requestAmount)) {
        throw new BadRequestException('Approved amount must be greater than 0 and not exceed requested amount.');
      }
      await this.prisma.$transaction(async (tx) => {
        const next = await tx.pettyCashRequest.update({
          where: { id },
          data: { approvedAmount: toPrismaDecimal(body.approvedAmount!), updateUserId: user.id },
        });
        if (this.changeLogService) {
          await this.changeLogService.logUpdate({
            tableName: 'PettyCashRequest',
            recordId: id,
            recordCode: req.requestId,
            oldValues: req,
            newValues: next,
            actor: user,
            tx,
          });
        }
      });
    }

    return this.approvalsService.decideByEntity(user, 'petty_cash_request', id, {
      decision: 'approve',
      comment: body?.comment,
    });
  }

  async rejectRequest(user: AuthenticatedUser, id: number, body: { reason?: string; comment?: string }) {
    const req = await this.prisma.pettyCashRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Petty Cash Request #${id} not found.`);
    await assertEntityScope(this.prisma, user, req);

    return this.approvalsService.decideByEntity(user, 'petty_cash_request', id, {
      decision: 'reject',
      comment: body?.reason || body?.comment,
    });
  }

  async cancelRequest(user: AuthenticatedUser, id: number, reason?: string) {
    const req = await this.prisma.pettyCashRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Petty Cash Request #${id} not found.`);
    await assertEntityScope(this.prisma, user, req);
    if (['Paid', 'Settled', 'Cancelled'].includes(req.status)) {
      throw new BadRequestException(`Cannot cancel Petty Cash Request in status "${req.status}".`);
    }
    const note = reason?.trim() || 'Cancelled by requester/finance';
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.pettyCashRequest.update({
        where: { id },
        data: {
          status: 'Cancelled',
          remark: `${req.remark ? `${req.remark} | ` : ''}Cancelled: ${note}`,
          updateUserId: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'CANCEL',
          tableName: 'PettyCashRequest',
          recordId: id,
          recordCode: req.requestId,
          oldValues: req,
          newValues: next,
          description: `Cancelled Petty Cash Request ${req.requestId}: ${note}`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'petty_cash_request',
        entityId: id,
        docNo: req.requestId,
        action: 'CANCEL',
        step: `Cancelled Petty Cash Request ${req.requestId}`,
        fromStatus: req.status,
        toStatus: 'Cancelled',
        performedById: user.id,
        performedByName: user.fullName,
        remarks: note,
        tx,
      });
    });
    const list = await this.listRequests(user);
    return list.find((r) => r.id === id);
  }

  // ============================================================================
  // P2: PETTY CASH ADVANCES (DISBURSEMENT VOUCHER)
  // ============================================================================

  async listAdvances(user: AuthenticatedUser, query?: { companyId?: number; category?: string; search?: string }) {
    const scope = await getEffectiveScope(this.prisma, user);
    const canSeeHiddenApproved = this.isApproverRole(user);

    const where: Prisma.PettyCashAdvanceWhereInput = {};
    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      where.branchId = { in: scope.branchIds };
    }
    if (query?.companyId) where.companyId = Number(query.companyId);
    if (query?.category && query.category !== 'all') {
      where.expenseCategory = { equals: query.category, mode: 'insensitive' };
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { requesterName: { contains: query.search, mode: 'insensitive' } },
        { departmentName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.pettyCashAdvance.findMany({
      where,
      include: { company: true, branch: true, outlet: true, currency: true, request: true },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((a) => ({
      id: a.id,
      docNo: a.docNo,
      docDate: formatIsoDate(a.docDate),
      requestId: a.requestId,
      reqNoDate: a.requestRefLabel || (a.request ? `${a.request.requestId} / ${formatIsoDate(a.request.requestDate)}` : ''),
      companyId: a.companyId,
      company: a.company.name,
      branchId: a.branchId,
      branch: a.branch.name,
      outletId: a.outletId,
      outlet: a.outlet?.name || '',
      requester: a.requesterName,
      employeeNo: a.employeeNo,
      department: a.departmentName,
      expenseCategory: a.expenseCategory,
      requestedAmount: toNumber(a.requestedAmount),
      approvedAmount: canSeeHiddenApproved ? toNumber(a.approvedAmount) : null,
      amountPaid: toNumber(a.amountPaid),
      settledAmount: toNumber(a.settledAmount),
      refundAmount: toNumber(a.refundAmount),
      refundDate: formatIsoDate(a.refundDate),
      balanceDue: toNumber(a.balanceDue),
      paymentType: a.paymentType,
      bankOrCash: a.bankOrCashAccount,
      currency: a.currency.code,
      exRate: toNumber(a.exRate, 6),
      baseCurrency: a.baseCurrencyCode,
      baseAmountPaid: toNumber(a.baseAmountPaid),
      amountInWords: a.amountInWords || '',
      narration: a.narration || '',
      settledStatus: a.settledStatus,
      status: a.status,
    }));
  }

  async createAdvance(user: AuthenticatedUser, dto: CreatePettyCashAdvanceDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const cur = await this.resolveCurrency(undefined, dto.currency);
    const { baseCurrency, rate, baseAmount } = await this.fxResolver.convertToBase(dto.amountPaid, cur.code);

    const createdId = await this.prisma.$transaction(async (tx) => {
      let linkedReq = null;
      if (dto.requestId) {
        linkedReq = await tx.pettyCashRequest.findUnique({ where: { id: dto.requestId } });
        if (!linkedReq) throw new BadRequestException(`Petty Cash Request #${dto.requestId} not found.`);
        if (!['Approved', 'Paid'].includes(linkedReq.status)) {
          throw new BadRequestException(
            `Petty Cash Request ${linkedReq.requestId} must be Approved before issuing an advance (current status: ${linkedReq.status}).`,
          );
        }
        const cap = toDecimal(linkedReq.approvedAmount ?? linkedReq.requestAmount);
        if (toDecimal(dto.amountPaid).gt(cap)) {
          throw new BadRequestException(
            `Paid advance amount (${dto.amountPaid}) cannot exceed approved request amount (${toNumber(cap)}).`,
          );
        }
      }

      // Deduct from float account if matched
      const floatAcc = dto.floatAccountId
        ? await tx.floatAccount.findUnique({ where: { id: dto.floatAccountId } })
        : dto.bankOrCash
          ? await tx.floatAccount.findFirst({ where: { name: { contains: dto.bankOrCash.split('-')[0].trim(), mode: 'insensitive' } } })
          : null;

      if (floatAcc) {
        const currentBal = toDecimal(floatAcc.currentBalance);
        if (currentBal.lt(toDecimal(dto.amountPaid))) {
          throw new BadRequestException(
            `Insufficient float balance in "${floatAcc.name}". Available: ${toNumber(currentBal)}.`,
          );
        }
        await tx.floatAccount.update({
          where: { id: floatAcc.id },
          data: { currentBalance: toPrismaDecimal(currentBal.minus(toDecimal(dto.amountPaid))) },
        });
      }

      // Update Department Budget consumed/available atomically
      const deptId = dto.departmentId || linkedReq?.departmentId || null;
      if (deptId) {
        const budget = await tx.budget.findFirst({
          where: { departmentId: deptId, isActive: true },
          orderBy: { fiscalYear: 'desc' },
        });
        if (budget) {
          const nextConsumed = toDecimal(budget.consumedAmount).plus(baseAmount);
          const nextAvailable = Decimal.max(0, toDecimal(budget.monthlyLimit).minus(nextConsumed));
          await tx.budget.update({
            where: { id: budget.id },
            data: {
              consumedAmount: toPrismaDecimal(nextConsumed),
              availableAmount: toPrismaDecimal(nextAvailable),
            },
          });
        }
      }

      const docNo =
        dto.docNo && !(await tx.pettyCashAdvance.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-PCA-ADV', {
            branchId: scope.branchId,
            tx,
            fallbackPrefix: 'PCA-2026-',
          });

      const approvedAmt = linkedReq
        ? toDecimal(linkedReq.approvedAmount ?? linkedReq.requestAmount)
        : toDecimal(dto.approvedAmount ?? dto.requestedAmount);

      const adv = await tx.pettyCashAdvance.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          requestId: linkedReq?.id || null,
          requestRefLabel: dto.reqNoDate || (linkedReq ? `${linkedReq.requestId} / ${formatIsoDate(linkedReq.requestDate)}` : null),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          departmentId: deptId,
          departmentName: dto.department || 'Operations',
          expenseCategoryId: dto.expenseCategoryId || linkedReq?.expenseCategoryId || null,
          expenseCategory: dto.expenseCategory || 'Operational Expense',
          requesterId: dto.requesterId || linkedReq?.requestedById || null,
          requesterName: dto.requester,
          employeeNo: dto.employeeNo || 'EMP',
          requestedAmount: toPrismaDecimal(dto.requestedAmount),
          approvedAmount: toPrismaDecimal(approvedAmt),
          amountPaid: toPrismaDecimal(dto.amountPaid),
          balanceDue: toPrismaDecimal(dto.amountPaid),
          paymentType: dto.paymentType || 'Cash Handover',
          floatAccountId: floatAcc?.id || null,
          bankOrCashAccount: dto.bankOrCash || floatAcc?.name || 'Central Vault Petty Cash Float',
          currencyId: cur.id,
          exRate: toPrismaRate(rate),
          baseCurrencyCode: baseCurrency,
          baseAmountPaid: toPrismaDecimal(baseAmount),
          amountInWords: dto.amountInWords || null,
          narration: dto.narration || '',
          settledStatus: 'Unsettled (Active Advance)',
          status: dto.status || 'Paid',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'PettyCashAdvance',
          recordId: adv.id,
          recordCode: adv.docNo,
          newValues: adv,
          actor: user,
          tx,
        });
      }

      if (linkedReq) {
        const nextReq = await tx.pettyCashRequest.update({
          where: { id: linkedReq.id },
          data: {
            paidAmount: toPrismaDecimal(toDecimal(linkedReq.paidAmount).plus(toDecimal(dto.amountPaid))),
            status: 'Paid',
            updateUserId: user.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logUpdate({
            tableName: 'PettyCashRequest',
            recordId: linkedReq.id,
            recordCode: linkedReq.requestId,
            oldValues: linkedReq,
            newValues: nextReq,
            actor: user,
            tx,
          });
        }
      }

      // Create corresponding live IOU ledger row
      const iou = await tx.pettyCashIOU.create({
        data: {
          docId: adv.docNo,
          docDate: adv.docDate,
          advanceId: adv.id,
          employeeId: adv.requesterId,
          employeeName: adv.requesterName,
          employeeNo: adv.employeeNo,
          departmentName: adv.departmentName,
          purpose: adv.narration || adv.expenseCategory,
          baseCurrencyCode: baseCurrency,
          advAmount: toPrismaDecimal(baseAmount),
          settledAmount: toPrismaDecimal(0),
          settledVfApproved: 'Pending Verification',
          returnAmount: toPrismaDecimal(0),
          pendingAmount: toPrismaDecimal(baseAmount),
          status: 'Active Advance',
          createUserId: user.id,
          updateUserId: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'PettyCashIOU',
          recordId: iou.id,
          recordCode: iou.docId,
          newValues: iou,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'petty_cash_advance',
        entityId: adv.id,
        docNo: adv.docNo,
        action: 'DISBURSE',
        step: `Disbursed Petty Cash Advance ${adv.docNo} (${cur.code} ${dto.amountPaid})`,
        toStatus: adv.status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return adv.id;
    });

    const list = await this.listAdvances(user);
    return list.find((a) => a.id === createdId);
  }

  // ============================================================================
  // P3: BILL SUBMISSION & EXPENSE SETTLEMENT
  // ============================================================================

  async listBillSubmissions(
    user: AuthenticatedUser,
    query?: { companyId?: number; submissionType?: string; search?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.PettyCashBillSubmissionWhereInput = {};
    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      where.branchId = { in: scope.branchIds };
    }
    if (query?.companyId) where.companyId = Number(query.companyId);
    if (query?.submissionType && query.submissionType !== 'all') {
      where.submissionType = query.submissionType;
    }
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { employeeName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.pettyCashBillSubmission.findMany({
      where,
      include: {
        company: true,
        branch: true,
        outlet: true,
        request: true,
        advance: true,
        lines: { include: { currency: true } },
        adjustments: true,
      },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((b) => ({
      id: b.id,
      docNo: b.docNo,
      docDate: formatIsoDate(b.docDate),
      companyId: b.companyId,
      company: b.company.name,
      branchId: b.branchId,
      branch: b.branch.name,
      outletId: b.outletId,
      outlet: b.outlet?.name || '',
      department: b.departmentName,
      employeeName: b.employeeName,
      employeeId: b.employeeNo,
      submissionType: b.submissionType,
      requestId: b.requestId,
      pettyCashRequestNo: b.request?.requestId || 'N/A (Direct Bill)',
      advanceId: b.advanceId,
      pettyVoucherNo: b.advance?.docNo || 'DIR-EXP',
      baseCurrency: b.baseCurrencyCode,
      totalAdvanceBalance: toNumber(b.totalAdvanceBalance),
      advanceAmount: toNumber(b.totalAdvanceBalance),
      totalBillAmount: toNumber(b.totalBillAmount),
      taxTotal: toNumber(b.taxTotal),
      balanceToReturn: toNumber(b.balanceToReturn),
      dueDays: b.dueDays,
      cashierNotified: b.cashierNotified,
      approverAction: b.approverAction,
      approverRemark: b.approverRemark || '',
      status: b.status,
      expenseItems: b.lines.map((l) => ({
        id: l.id,
        billDate: formatIsoDate(l.billDate),
        billNo: l.billNo,
        supplier: l.supplierName,
        expenseCategory: l.expenseCategoryName,
        location: l.location || '',
        description: l.description,
        currency: l.currency.code,
        amount: toNumber(l.amount),
        exRate: toNumber(l.exRate, 6),
        baseAmount: toNumber(l.baseAmount),
        taxRate: toNumber(l.taxRate),
        tax: toNumber(l.taxAmount),
        attachmentName: l.attachmentName || '',
      })),
      adjustments: b.adjustments.map((adj) => ({
        id: adj.id,
        paymentNo: adj.paymentNo,
        paymentDate: formatIsoDate(adj.paymentDate),
        balanceAmount: toNumber(adj.balanceAmount),
        adjustedAmount: toNumber(adj.adjustedAmount),
        adjustedAmountLocal: toNumber(adj.adjustedAmountLocal),
        localCurrencyCode: adj.localCurrencyCode,
        remark: adj.remark || '',
      })),
    }));
  }

  async createBillSubmission(user: AuthenticatedUser, dto: CreateBillSubmissionDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    if (!dto.expenseItems || dto.expenseItems.length === 0) {
      throw new BadRequestException('At least one supplier bill / expense line is required.');
    }

    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const localRate = await this.fxResolver.resolveRate(baseInfo.code, baseInfo.operationalCurrency);

    const advance = dto.advanceId
      ? await this.prisma.pettyCashAdvance.findUnique({ where: { id: dto.advanceId } })
      : dto.pettyVoucherNo
        ? await this.prisma.pettyCashAdvance.findUnique({ where: { docNo: dto.pettyVoucherNo } })
        : null;

    const advanceBalanceBase =
      dto.submissionType === 'Advance Settlement Direct'
        ? toDecimal(advance ? advance.balanceDue : dto.totalAdvanceBalance ?? 0)
        : new Decimal(0);

    let totalBillBase = new Decimal(0);
    let totalTaxBase = new Decimal(0);
    const preparedLines: Array<{
      billDate: Date;
      billNo: string;
      supplierName: string;
      expenseCategoryId: number | null;
      expenseCategoryName: string;
      location: string;
      description: string;
      currencyId: number;
      amount: Decimal;
      rate: Decimal;
      baseAmount: Decimal;
      taxRate: Decimal;
      taxAmount: Decimal;
      attachmentName: string | null;
    }> = [];

    for (const item of dto.expenseItems) {
      const cur = await this.resolveCurrency(undefined, item.currency || baseInfo.code);
      const { rate, baseAmount } = await this.fxResolver.convertToBase(item.amount, cur.code);
      const taxRate = item.taxRate !== undefined ? toDecimal(item.taxRate) : baseInfo.pettyCashGstRate;
      const taxAmount = roundMoney(baseAmount.times(taxRate).div(100), baseInfo.decimalPrecision, baseInfo.roundingMethod);
      totalBillBase = totalBillBase.plus(baseAmount);
      totalTaxBase = totalTaxBase.plus(taxAmount);

      preparedLines.push({
        billDate: parseDateOnly(item.billDate),
        billNo: item.billNo.trim(),
        supplierName: item.supplier.trim(),
        expenseCategoryId: item.expenseCategoryId || null,
        expenseCategoryName: item.expenseCategory || 'General Expense',
        location: item.location || '',
        description: item.description.trim(),
        currencyId: cur.id,
        amount: toDecimal(item.amount),
        rate,
        baseAmount,
        taxRate,
        taxAmount,
        attachmentName: item.attachmentName || null,
      });
    }

    const balance = roundMoney(advanceBalanceBase.minus(totalBillBase));
    const returnAmount = dto.submissionType === 'Advance Settlement Direct' && balance.gt(0) ? balance : new Decimal(0);

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.pettyCashBillSubmission.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-BSUB-BILL', {
            branchId: scope.branchId,
            tx,
            fallbackPrefix: 'BSUB-2026-',
          });

      const sub = await tx.pettyCashBillSubmission.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          departmentId: dto.departmentId || advance?.departmentId || null,
          departmentName: dto.department || advance?.departmentName || 'Operations',
          employeeId: dto.employeeId || advance?.requesterId || null,
          employeeName: dto.employeeName,
          employeeNo: dto.employeeNo || advance?.employeeNo || 'EMP',
          submissionType: dto.submissionType,
          requestId: dto.requestId || advance?.requestId || null,
          advanceId: advance?.id || null,
          baseCurrencyCode: baseInfo.code,
          totalAdvanceBalance: toPrismaDecimal(advanceBalanceBase),
          totalBillAmount: toPrismaDecimal(totalBillBase),
          taxTotal: toPrismaDecimal(totalTaxBase),
          balanceToReturn: toPrismaDecimal(returnAmount),
          dueDays: advance
            ? Math.max(0, Math.floor((Date.now() - advance.docDate.getTime()) / (1000 * 60 * 60 * 24)))
            : 0,
          approverRemark: dto.approverRemark || '',
          status: 'Pending Verification',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'PettyCashBillSubmission',
          recordId: sub.id,
          recordCode: sub.docNo,
          newValues: { ...sub, lineCount: preparedLines.length },
          actor: user,
          tx,
        });
      }

      await tx.pettyCashBillLine.createMany({
        data: preparedLines.map((l) => ({
          billSubmissionId: sub.id,
          billDate: l.billDate,
          billNo: l.billNo,
          supplierName: l.supplierName,
          expenseCategoryId: l.expenseCategoryId,
          expenseCategoryName: l.expenseCategoryName,
          location: l.location,
          description: l.description,
          currencyId: l.currencyId,
          amount: toPrismaDecimal(l.amount),
          exRate: toPrismaRate(l.rate),
          baseAmount: toPrismaDecimal(l.baseAmount),
          taxRate: toPrismaDecimal(l.taxRate, 2),
          taxAmount: toPrismaDecimal(l.taxAmount),
          attachmentName: l.attachmentName,
        })),
      });

      const adjustments =
        dto.adjustments && dto.adjustments.length > 0
          ? dto.adjustments
          : advance
            ? [
              {
                paymentNo: advance.docNo,
                paymentDate: formatIsoDate(advance.docDate) || undefined,
                balanceAmount: toNumber(advanceBalanceBase),
                adjustedAmount: toNumber(totalBillBase),
                remark: 'Auto-linked settlement adjustment',
              },
            ]
            : [];

      if (adjustments.length > 0) {
        await tx.pettyCashBillAdjustment.createMany({
          data: adjustments.map((a) => ({
            billSubmissionId: sub.id,
            paymentNo: a.paymentNo,
            paymentDate: a.paymentDate ? parseDateOnly(a.paymentDate) : null,
            balanceAmount: toPrismaDecimal(a.balanceAmount),
            adjustedAmount: toPrismaDecimal(a.adjustedAmount),
            adjustedAmountLocal: toPrismaDecimal(toDecimal(a.adjustedAmount).times(localRate)),
            localCurrencyCode: baseInfo.operationalCurrency,
            remark: a.remark || '',
          })),
        });
      }

      await this.auditService.log({
        entityType: 'petty_cash_bill_submission',
        entityId: sub.id,
        docNo: sub.docNo,
        action: 'CREATE',
        step: `Submitted ${preparedLines.length} expense bill(s) totaling ${baseInfo.code} ${toNumber(totalBillBase)} (GST: ${toNumber(totalTaxBase)})`,
        toStatus: sub.status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return sub.id;
    });

    const list = await this.listBillSubmissions(user);
    return list.find((b) => b.id === createdId);
  }

  async verifyBillSubmission(
    user: AuthenticatedUser,
    id: number,
    body?: { decision?: 'approve' | 'reject'; remark?: string },
  ) {
    const bill = await this.prisma.pettyCashBillSubmission.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException(`Bill Submission #${id} not found.`);
    await assertEntityScope(this.prisma, user, bill);

    const decision = body?.decision || 'approve';
    const nextStatus = decision === 'approve' ? 'Verified & Settled' : 'Rejected';

    await this.prisma.$transaction(async (tx) => {
      const nextBill = await tx.pettyCashBillSubmission.update({
        where: { id },
        data: {
          status: nextStatus,
          approverAction: decision === 'approve' ? 'Approved' : 'Rejected',
          approverRemark: body?.remark || bill.approverRemark,
          verifiedById: user.id,
          verifiedAt: new Date(),
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: decision === 'approve' ? 'APPROVE' : 'REJECT',
          tableName: 'PettyCashBillSubmission',
          recordId: id,
          recordCode: bill.docNo,
          oldValues: bill,
          newValues: nextBill,
          description: `${nextStatus} by ${user.roleName}`,
          actor: user,
          tx,
        });
      }

      if (decision === 'approve' && bill.advanceId) {
        const adv = await tx.pettyCashAdvance.findUnique({ where: { id: bill.advanceId } });
        if (adv) {
          const nextSettled = toDecimal(adv.settledAmount).plus(toDecimal(bill.totalBillAmount));
          const nextDue = Decimal.max(
            0,
            toDecimal(adv.amountPaid).minus(nextSettled).minus(toDecimal(adv.refundAmount)),
          );
          const fullyClosed = nextDue.lt(0.01);
          await tx.pettyCashAdvance.update({
            where: { id: adv.id },
            data: {
              settledAmount: toPrismaDecimal(nextSettled),
              balanceDue: toPrismaDecimal(nextDue),
              settledStatus: fullyClosed ? 'Settled via Bills' : 'Partially Settled (Return Due)',
              status: fullyClosed ? 'Settled' : 'Paid',
            },
          });

          await tx.pettyCashIOU.updateMany({
            where: { advanceId: adv.id },
            data: {
              settledAmount: toPrismaDecimal(nextSettled),
              pendingAmount: toPrismaDecimal(nextDue),
              settledVfApproved: fullyClosed ? 'Verified' : 'Pending Return',
              status: fullyClosed ? 'Fully Closed' : 'Active Advance',
            },
          });

          if (adv.requestId) {
            await tx.pettyCashRequest.update({
              where: { id: adv.requestId },
              data: {
                settledAmount: toPrismaDecimal(nextSettled),
                settledDate: new Date(),
                status: fullyClosed ? 'Settled' : 'Paid',
              },
            });
          }
        }
      }

      await this.auditService.log({
        entityType: 'petty_cash_bill_submission',
        entityId: id,
        docNo: bill.docNo,
        action: decision === 'approve' ? 'VERIFY_SETTLE' : 'REJECT',
        step: `${nextStatus} by ${user.roleName}`,
        fromStatus: bill.status,
        toStatus: nextStatus,
        performedById: user.id,
        performedByName: user.fullName,
        remarks: body?.remark || null,
        tx,
      });
    });

    const list = await this.listBillSubmissions(user);
    return list.find((b) => b.id === id);
  }

  async notifyCashierForBill(user: AuthenticatedUser, id: number) {
    const bill = await this.prisma.pettyCashBillSubmission.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException(`Bill Submission #${id} not found.`);
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.pettyCashBillSubmission.update({
        where: { id },
        data: { cashierNotified: true, updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'PettyCashBillSubmission',
          recordId: id,
          recordCode: bill.docNo,
          oldValues: bill,
          newValues: next,
          actor: user,
          tx,
        });
      }
    });
    await this.notificationsService.createSystemAlert({
      title: `Cashier Notification: ${bill.docNo}`,
      message: `Bill submission ${bill.docNo} by ${bill.employeeName} has balance to return of ${bill.baseCurrencyCode} ${toNumber(bill.balanceToReturn).toFixed(2)}.`,
      severity: 'info',
      entityType: 'petty_cash_bill_submission',
      entityId: id,
    });
    return { notified: true, id };
  }

  // ============================================================================
  // STEP 4: EMPLOYEE ADVANCE RETURN RECEIPT
  // ============================================================================

  async listReturns(user: AuthenticatedUser, query?: { companyId?: number; search?: string }) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.PettyCashReturnWhereInput = {};
    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      where.branchId = { in: scope.branchIds };
    }
    if (query?.companyId) where.companyId = Number(query.companyId);
    if (query?.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { requesterName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.pettyCashReturn.findMany({
      where,
      include: { company: true, branch: true, request: true, advance: true, billSubmission: true, currency: true },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      docNo: r.docNo,
      docDate: formatIsoDate(r.docDate),
      pettyCashRequestNo: r.request?.requestId || '-',
      pettyCashVoucherNo: r.advance?.docNo || '-',
      billSubmissionNo: r.billSubmission?.docNo || '-',
      company: r.company.name,
      branch: r.branch.name,
      department: r.departmentName,
      requester: r.requesterName,
      employeeNo: r.employeeNo,
      receivedBy: r.receivedByName,
      advanceAmount: toNumber(r.advanceAmount),
      settledAmount: toNumber(r.settledAmount),
      balance: toNumber(r.balance),
      receiptType: r.receiptType,
      bankOrCash: r.bankOrCashAccount,
      returnAmount: toNumber(r.returnAmount),
      currency: r.currency.code,
      amountInWords: r.amountInWords || '',
      narration: r.narration || '',
      status: r.status,
    }));
  }

  async createReturn(user: AuthenticatedUser, dto: CreatePettyCashReturnDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const cur = await this.resolveCurrency(undefined, dto.currency);
    const { baseCurrency, rate, baseAmount } = await this.fxResolver.convertToBase(dto.returnAmount, cur.code);

    const createdId = await this.prisma.$transaction(async (tx) => {
      const adv = dto.advanceId
        ? await tx.pettyCashAdvance.findUnique({ where: { id: dto.advanceId } })
        : dto.pettyCashVoucherNo
          ? await tx.pettyCashAdvance.findUnique({ where: { docNo: dto.pettyCashVoucherNo } })
          : null;

      const docNo =
        dto.docNo && !(await tx.pettyCashReturn.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-RET-CASH', {
            branchId: scope.branchId,
            tx,
            fallbackPrefix: 'RET-2026-',
          });

      const advAmt = toDecimal(dto.advanceAmount ?? adv?.amountPaid ?? 0);
      const settledAmt = toDecimal(dto.settledAmount ?? adv?.settledAmount ?? 0);
      const balance = Decimal.max(0, advAmt.minus(settledAmt));

      const ret = await tx.pettyCashReturn.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          requestId: dto.requestId || adv?.requestId || null,
          advanceId: adv?.id || null,
          billSubmissionId: dto.billSubmissionId || null,
          departmentName: dto.department || adv?.departmentName || 'Operations',
          requesterName: dto.requester,
          employeeNo: dto.employeeNo || adv?.employeeNo || 'EMP',
          receivedByName: dto.receivedBy || user.fullName,
          advanceAmount: toPrismaDecimal(advAmt),
          settledAmount: toPrismaDecimal(settledAmt),
          balance: toPrismaDecimal(balance),
          receiptType: dto.receiptType,
          bankOrCashAccount: dto.bankOrCash || 'Treasury Counter Physical Vault',
          returnAmount: toPrismaDecimal(dto.returnAmount),
          currencyId: cur.id,
          exRate: toPrismaRate(rate),
          baseCurrencyCode: baseCurrency,
          baseReturnAmount: toPrismaDecimal(baseAmount),
          amountInWords: dto.amountInWords || null,
          narration: dto.narration || '',
          status: 'Receipt Issued & Settled',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'PettyCashReturn',
          recordId: ret.id,
          recordCode: ret.docNo,
          newValues: ret,
          actor: user,
          tx,
        });
      }

      // Credit float account & close advance/IOU atomically
      if (adv?.floatAccountId) {
        await tx.floatAccount.update({
          where: { id: adv.floatAccountId },
          data: { currentBalance: { increment: toPrismaDecimal(dto.returnAmount) } },
        });
      }

      if (adv) {
        const nextRefund = toDecimal(adv.refundAmount).plus(toDecimal(dto.returnAmount));
        const nextDue = Decimal.max(
          0,
          toDecimal(adv.amountPaid).minus(toDecimal(adv.settledAmount)).minus(nextRefund),
        );
        const closed = nextDue.lt(0.01);
        await tx.pettyCashAdvance.update({
          where: { id: adv.id },
          data: {
            refundAmount: toPrismaDecimal(nextRefund),
            refundDate: parseDateOnly(dto.docDate),
            balanceDue: toPrismaDecimal(nextDue),
            settledStatus: closed ? 'Settled & Refunded' : 'Partially Refunded',
            status: closed ? 'Settled' : adv.status,
          },
        });
        await tx.pettyCashIOU.updateMany({
          where: { advanceId: adv.id },
          data: {
            returnAmount: toPrismaDecimal(nextRefund),
            pendingAmount: toPrismaDecimal(nextDue),
            settledVfApproved: closed ? 'Verified' : 'Partially Refunded',
            status: closed ? 'Fully Closed' : 'Active Advance',
          },
        });
        if (adv.requestId) {
          await tx.pettyCashRequest.update({
            where: { id: adv.requestId },
            data: {
              refundAmount: toPrismaDecimal(nextRefund),
              refundDate: parseDateOnly(dto.docDate),
              ...(closed ? { status: 'Settled' } : {}),
            },
          });
        }
      }

      await this.auditService.log({
        entityType: 'petty_cash_return',
        entityId: ret.id,
        docNo: ret.docNo,
        action: 'RETURN_RECEIPT',
        step: `Issued Advance Return Receipt ${ret.docNo} (${cur.code} ${dto.returnAmount})`,
        toStatus: ret.status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return ret.id;
    });

    const list = await this.listReturns(user);
    return list.find((r) => r.id === createdId);
  }

  // ============================================================================
  // STEP 5: FLOAT REIMBURSEMENT & RECONCILIATION
  // ============================================================================

  async listReimbursements(user: AuthenticatedUser) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.FloatReimbursementWhereInput = {};
    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      where.branchId = { in: scope.branchIds };
    }

    const rows = await this.prisma.floatReimbursement.findMany({
      where,
      include: { company: true, branch: true, outlet: true, vouchers: { orderBy: { id: 'asc' } } },
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
      outletId: r.outletId,
      outlet: r.outlet?.name || '',
      location: r.locationName || '',
      floatAccountName: r.floatAccountName,
      baseCurrency: r.baseCurrencyCode,
      floatAmount: toNumber(r.floatAmount),
      reimburseAmount: toNumber(r.reimburseAmount),
      settledAmount: toNumber(r.settledAmount),
      balanceCashInHand: toNumber(r.balanceCashInHand),
      narration: r.narration || '',
      formula: `Float Amount (${toNumber(r.floatAmount).toFixed(2)}) = Reimbursement (${toNumber(r.reimburseAmount).toFixed(2)}) + Settlement (${toNumber(r.settledAmount).toFixed(2)}) + Cash in Hand (${toNumber(r.balanceCashInHand).toFixed(2)})`,
      status: r.status,
      vouchers: r.vouchers.map((v) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        pcrNo: v.requestRef || '',
        date: v.voucherDate,
        expense: v.expenseCategoryName,
        emp: v.employeeName,
        remark: v.remark || '',
        amount: toNumber(v.amount),
        runningTotal: toNumber(v.runningTotal),
      })),
    }));
  }

  async createReimbursement(user: AuthenticatedUser, dto: CreateFloatReimbursementDto) {
    const scope = await assertEntityScope(this.prisma, user, {
      companyId: dto.companyId,
      branchId: dto.branchId,
      outletId: dto.outletId,
    });
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    let running = new Decimal(0);
    const vouchers = (dto.vouchers || []).map((v) => {
      running = running.plus(toDecimal(v.amount));
      return {
        billSubmissionId: v.billSubmissionId || null,
        requestRef: v.pcrNo || null,
        voucherNo: v.voucherNo,
        voucherDate: v.date || formatIsoDate(new Date())!,
        employeeName: v.emp,
        expenseCategoryName: v.expense,
        remark: v.remark || '',
        amount: toPrismaDecimal(v.amount),
        runningTotal: toPrismaDecimal(running),
      };
    });

    const createdId = await this.prisma.$transaction(async (tx) => {
      const docNo =
        dto.docNo && !(await tx.floatReimbursement.findUnique({ where: { docNo: dto.docNo } }))
          ? dto.docNo
          : await this.numberSeries.allocateNextNumber('FRM-FLT-REIMB', {
            branchId: scope.branchId,
            tx,
            fallbackPrefix: 'REIMB-2026-',
          });

      const created = await tx.floatReimbursement.create({
        data: {
          docNo,
          docDate: parseDateOnly(dto.docDate),
          fromDate: parseDateOnly(dto.fromDate),
          toDate: parseDateOnly(dto.toDate),
          companyId: scope.companyId,
          branchId: scope.branchId,
          outletId: scope.outletId,
          floatAccountId: dto.floatAccountId || null,
          floatAccountName: dto.floatAccountName,
          baseCurrencyCode: baseInfo.code,
          floatAmount: toPrismaDecimal(dto.floatAmount),
          reimburseAmount: toPrismaDecimal(running),
          settledAmount: toPrismaDecimal(dto.settledAmount),
          balanceCashInHand: toPrismaDecimal(dto.balanceCashInHand),
          narration: dto.narration || '',
          status: 'Draft',
          createdById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
          vouchers: { create: vouchers },
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'FloatReimbursement',
          recordId: created.id,
          recordCode: created.docNo,
          newValues: created,
          actor: user,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'float_reimbursement',
        entityId: created.id,
        docNo: created.docNo,
        action: 'CREATE',
        step: `Created Float Reimbursement Claim ${created.docNo} (${baseInfo.code} ${toNumber(running)})`,
        toStatus: created.status,
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return created.id;
    });

    const list = await this.listReimbursements(user);
    return list.find((r) => r.id === createdId);
  }

  async addReimbursementVoucher(
    user: AuthenticatedUser,
    reimbursementId: number,
    dto: FloatVoucherInputDto,
  ) {
    const existing = await this.prisma.floatReimbursement.findUnique({
      where: { id: reimbursementId },
      include: { vouchers: { orderBy: { id: 'asc' } } },
    });
    if (!existing) throw new NotFoundException(`Float Reimbursement #${reimbursementId} not found.`);
    await assertEntityScope(this.prisma, user, existing);

    const prevTotal = existing.vouchers.reduce(
      (sum, v) => sum.plus(toDecimal(v.amount)),
      new Decimal(0),
    );
    const nextTotal = prevTotal.plus(toDecimal(dto.amount));

    await this.prisma.$transaction(async (tx) => {
      await tx.floatReimbursementVoucher.create({
        data: {
          reimbursementId,
          billSubmissionId: dto.billSubmissionId || null,
          requestRef: dto.pcrNo || null,
          voucherNo: dto.voucherNo,
          voucherDate: dto.date || formatIsoDate(new Date())!,
          employeeName: dto.emp,
          expenseCategoryName: dto.expense,
          remark: dto.remark || '',
          amount: toPrismaDecimal(dto.amount),
          runningTotal: toPrismaDecimal(nextTotal),
          createUserId: user.id,
          updateUserId: user.id,
        },
      });
      const updated = await tx.floatReimbursement.update({
        where: { id: reimbursementId },
        data: { reimburseAmount: toPrismaDecimal(nextTotal), updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'FloatReimbursement',
          recordId: reimbursementId,
          recordCode: existing.docNo,
          oldValues: existing,
          newValues: updated,
          actor: user,
          tx,
        });
      }
    });

    const list = await this.listReimbursements(user);
    return list.find((r) => r.id === reimbursementId);
  }

  async submitReimbursement(user: AuthenticatedUser, id: number) {
    const existing = await this.prisma.floatReimbursement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Float Reimbursement #${id} not found.`);
    await assertEntityScope(this.prisma, user, existing);

    await this.prisma.$transaction(async (tx) => {
      const next = await tx.floatReimbursement.update({
        where: { id },
        data: { status: 'Submitted for Treasury Clearing', updateUserId: user.id },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'STATUS_CHANGE',
          tableName: 'FloatReimbursement',
          recordId: id,
          recordCode: existing.docNo,
          oldValues: existing,
          newValues: next,
          description: `Submitted Float Reimbursement ${existing.docNo} for Treasury Clearing`,
          actor: user,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'float_reimbursement',
        entityId: id,
        docNo: existing.docNo,
        action: 'SUBMIT',
        step: `Submitted Float Reimbursement ${existing.docNo} for Treasury Clearing`,
        fromStatus: existing.status,
        toStatus: 'Submitted for Treasury Clearing',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });
    });

    const list = await this.listReimbursements(user);
    return list.find((r) => r.id === id);
  }

  // ============================================================================
  // STEP 6: DYNAMIC SERVER-COMPUTED IOU AGING MATRIX
  // ============================================================================

  async getIouAging() {
    const [ious, baseInfo] = await Promise.all([
      this.prisma.pettyCashIOU.findMany({ orderBy: { docDate: 'asc' } }),
      this.fxResolver.getSystemBaseCurrency(),
    ]);

    const todayMs = Date.now();
    return ious.map((iou) => {
      const adv = toDecimal(iou.advAmount);
      const settled = toDecimal(iou.settledAmount);
      const ret = toDecimal(iou.returnAmount);
      const pending = Decimal.max(0, adv.minus(settled).minus(ret));
      const ageDays = Math.max(
        0,
        Math.floor((todayMs - iou.docDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const pendingNum = toNumber(pending);

      // Place strictly the open pending balance into the single matching bucket
      const bucket0_30 = pendingNum > 0 && ageDays <= 30 ? pendingNum : 0;
      const bucket30_60 = pendingNum > 0 && ageDays > 30 && ageDays <= 60 ? pendingNum : 0;
      const bucket60_90 = pendingNum > 0 && ageDays > 60 && ageDays <= 90 ? pendingNum : 0;
      const bucket90_120 = pendingNum > 0 && ageDays > 90 && ageDays <= 120 ? pendingNum : 0;
      const bucket120Plus = pendingNum > 0 && ageDays > 120 ? pendingNum : 0;

      const agingBucket =
        pendingNum === 0
          ? 'Settled'
          : ageDays <= 15
            ? '0-15 Days'
            : ageDays <= 30
              ? '16-30 Days'
              : ageDays <= 60
                ? '31-60 Days'
                : '>60 Days Overdue';

      return {
        id: iou.id,
        docId: iou.docId,
        docDate: formatIsoDate(iou.docDate),
        name: iou.employeeName,
        employeeId: iou.employeeNo,
        department: iou.departmentName || 'Operations',
        purpose: iou.purpose || '',
        baseCurrency: iou.baseCurrencyCode || baseInfo.code,
        advAmount: toNumber(adv),
        settledAmount: toNumber(settled),
        settledVfApproved: iou.settledVfApproved,
        returnAmount: toNumber(ret),
        pending: pendingNum,
        ageDays,
        agingBucket,
        bucket0_30,
        bucket30_60,
        bucket60_90,
        bucket90_120,
        bucket120Plus,
        status: pendingNum === 0 ? 'Fully Closed' : iou.status,
      };
    });
  }
}
