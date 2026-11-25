import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { toDecimal, toNumber, toPrismaDecimal } from '../common/utils/decimal.util';
import { CreateAuditCommentDto, GenerateAuditExportDto } from './dto/audit.dto';

export interface LogAuditInput {
  entityType: string;
  entityId: number;
  docNo?: string | null;
  action: string;
  step: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedById?: number | null;
  performedByName: string;
  remarks?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxResolver: ExchangeRateResolverService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) { }

  async log(input: LogAuditInput): Promise<void> {
    const db = input.tx || this.prisma;
    await db.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        docNo: input.docNo || null,
        action: input.action,
        step: input.step,
        fromStatus: input.fromStatus || null,
        toStatus: input.toStatus || null,
        performedById: input.performedById || null,
        performedByName: input.performedByName,
        remarks: input.remarks || null,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress || null,
      },
    });
  }

  async getLogs(
    user: AuthenticatedUser,
    query: {
      entityType?: string;
      entityId?: number;
      docNo?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const isGlobalAuditor =
      user.roleCode === 'ADM' || Boolean(user.permissions?.auditExport?.read);
    if (!isGlobalAuditor) {
      if (!query.entityType || !query.entityId) {
        throw new ForbiddenException(
          'Global audit log access requires auditExport:read permission.',
        );
      }
      await this.assertAuditTargetAccess(user, query.entityType, Number(query.entityId));
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));

    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = Number(query.entityId);
    if (query.docNo) where.docNo = query.docNo;
    if (query.search) {
      where.OR = [
        { docNo: { contains: query.search, mode: 'insensitive' } },
        { step: { contains: query.search, mode: 'insensitive' } },
        { performedByName: { contains: query.search, mode: 'insensitive' } },
        { remarks: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        docNo: r.docNo,
        action: r.action,
        step: r.step,
        user: r.performedByName,
        time: r.createdAt.toISOString(),
        status: r.toStatus || r.action,
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        remarks: r.remarks,
        metadata: r.metadata,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async assertAuditTargetAccess(
    user: AuthenticatedUser,
    entityType: string,
    entityId: number,
  ): Promise<void> {
    const scope = await getEffectiveScope(this.prisma, user);
    let doc: { companyId?: number | null; branchId?: number | null; outletId?: number | null } | null = null;
    if (entityType === 'cash_deposit') {
      doc = await this.prisma.cashDeposit.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true },
      });
    } else if (entityType === 'petty_cash_request') {
      doc = await this.prisma.pettyCashRequest.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true },
      });
    } else if (entityType === 'sales_reconciliation') {
      doc = await this.prisma.salesReconciliation.findUnique({
        where: { id: entityId },
        select: { companyId: true, branchId: true, outletId: true },
      });
    } else if (user.roleCode !== 'ADM' && !user.permissions?.auditExport?.read) {
      throw new ForbiddenException(`Not authorized to access audit logs for "${entityType}".`);
    } else {
      return;
    }

    if (!doc) {
      throw new NotFoundException(`Target ${entityType} #${entityId} not found.`);
    }
    if (!scope.unrestricted) {
      if (doc.companyId && !scope.companyIds.includes(doc.companyId)) {
        throw new ForbiddenException('Target document is outside your company scope.');
      }
      if (doc.branchId && !scope.branchIds.includes(doc.branchId)) {
        throw new ForbiddenException('Target document is outside your branch scope.');
      }
      if (doc.outletId && !scope.outletIds.includes(doc.outletId)) {
        throw new ForbiddenException('Target document is outside your outlet scope.');
      }
    }
  }

  async addComment(user: AuthenticatedUser, dto: CreateAuditCommentDto) {
    await this.assertAuditTargetAccess(user, dto.entityType, dto.entityId);
    await this.log({
      entityType: dto.entityType,
      entityId: dto.entityId,
      docNo: dto.docNo,
      action: 'COMMENT',
      step: `Audit Note by ${user.roleName}`,
      performedById: user.id,
      performedByName: `${user.fullName}${user.empNo ? ` (${user.empNo})` : ''}`,
      remarks: dto.comment,
    });
    return { logged: true };
  }

  async getStagedExportRecords(
    user: AuthenticatedUser,
    filters?: { companyId?: number; outletId?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    if (
      filters?.companyId &&
      !scope.unrestricted &&
      !scope.companyIds.includes(filters.companyId)
    ) {
      throw new ForbiddenException(
        `You are not authorized to export records for Company ID ${filters.companyId}.`,
      );
    }

    const companyFilter = filters?.companyId ? [filters.companyId] : scope.companyIds;
    const parsedOutletId =
      filters?.outletId && filters.outletId !== 'all' ? Number(filters.outletId) : null;
    if (
      parsedOutletId !== null &&
      !Number.isNaN(parsedOutletId) &&
      !scope.unrestricted &&
      !scope.outletIds.includes(parsedOutletId)
    ) {
      throw new ForbiddenException(
        `You are not authorized to export records for Outlet ID ${parsedOutletId}.`,
      );
    }
    const outletFilter =
      parsedOutletId !== null && !Number.isNaN(parsedOutletId)
        ? [parsedOutletId]
        : scope.outletIds;

    const [deposits, pettyRequests, recons, glAccounts] = await Promise.all([
      this.prisma.cashDeposit.findMany({
        where: {
          status: { in: ['Approved', 'Posted'] },
          companyId: { in: companyFilter },
          outletId: { in: outletFilter },
        },
        include: { outlet: true, branch: true, paymentType: { include: { glAccount: true } } },
        orderBy: { docDate: 'desc' },
      }),
      this.prisma.pettyCashRequest.findMany({
        where: {
          status: { in: ['Approved', 'Posted', 'Paid', 'Settled'] },
          companyId: { in: companyFilter },
          branchId: { in: scope.branchIds },
          ...(parsedOutletId !== null && !Number.isNaN(parsedOutletId)
            ? { outletId: parsedOutletId }
            : {}),
        },
        include: { department: true, expenseCategory: { include: { glAccount: true } } },
        orderBy: { requestDate: 'desc' },
      }),
      this.prisma.salesReconciliation.findMany({
        where: {
          status: { in: ['Approved', 'Locked', 'Posted'] },
          companyId: { in: companyFilter },
          outletId: { in: outletFilter },
        },
        include: { outlet: true },
        orderBy: { docDate: 'desc' },
      }),
      this.prisma.glAccount.findMany({ where: { isActive: true } }),
    ]);

    const approverIds = Array.from(
      new Set(deposits.map((d) => d.approvedById).filter((id): id is number => typeof id === 'number')),
    );
    const approverUsers =
      approverIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: approverIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const approverNameMap = new Map(approverUsers.map((u) => [u.id, u.fullName]));

    const salesGl = glAccounts.find((g) => g.code.startsWith('4000')) || {
      code: '4000-10',
      name: 'Outlet Daily Sales',
    };

    const records = [
      ...deposits.map((d) => ({
        id: `DEP-${d.id}`,
        entityType: 'cash_deposit',
        entityId: d.id,
        category: 'Cash Deposit',
        docNo: d.docNo,
        docDate: d.docDate.toISOString().slice(0, 10),
        location: d.outlet.name,
        approver: d.approvedById
          ? approverNameMap.get(d.approvedById) || `Approver #${d.approvedById}`
          : 'Finance Manager',
        glAccount: d.paymentType?.glAccount
          ? `${d.paymentType.glAccount.code} (${d.paymentType.glAccount.name})`
          : '1010-01 (Treasury In-Transit)',
        amountBase: toNumber(d.totalBaseAmount),
        baseCurrency: d.baseCurrencyCode || baseInfo.code,
        status: d.status,
      })),
      ...pettyRequests.map((p) => ({
        id: `PCR-${p.id}`,
        entityType: 'petty_cash_request',
        entityId: p.id,
        category: 'Petty Cash Advance',
        docNo: p.requestId,
        docDate: p.requestDate.toISOString().slice(0, 10),
        location: p.department.name,
        approver: p.approvedByName || 'Finance Manager',
        glAccount: p.expenseCategory?.glAccount
          ? `${p.expenseCategory.glAccount.code} (${p.expenseCategory.glAccount.name})`
          : '5010-00 (Operational Expenses)',
        amountBase: toNumber(p.baseAmount || p.requestAmount),
        baseCurrency: p.baseCurrencyCode || baseInfo.code,
        status: p.status,
      })),
      ...recons.map((r) => ({
        id: `SREC-${r.id}`,
        entityType: 'sales_reconciliation',
        entityId: r.id,
        category: 'Shift Reconciliation',
        docNo: r.docNo,
        docDate: r.docDate.toISOString().slice(0, 10),
        location: r.outlet.name,
        approver: r.approverName || 'Finance Checker',
        glAccount: `${salesGl.code} (${salesGl.name})`,
        amountBase: toNumber(r.totalCollectionBase),
        baseCurrency: r.baseCurrencyCode || baseInfo.code,
        status: r.status,
      })),
    ];

    const totalBaseAmount = toNumber(
      records.reduce((sum, rec) => sum.plus(toDecimal(rec.amountBase)), toDecimal(0)),
    );

    return {
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      recordCount: records.length,
      totalBaseAmount,
      records,
    };
  }

  async generateExportBatch(user: AuthenticatedUser, dto: GenerateAuditExportDto) {
    const staged = await this.getStagedExportRecords(user, {
      companyId: dto.companyId,
      outletId: dto.outletId,
    });

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const batchCode = `AUDIT-${dateStamp}-${suffix}`;

    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.auditExportBatch.create({
        data: {
          batchCode,
          format: dto.format,
          recordCount: staged.recordCount,
          totalBaseAmount: toPrismaDecimal(staged.totalBaseAmount),
          baseCurrency: staged.baseCurrency,
          exportedById: user.id,
          createUserId: user.id,
          updateUserId: user.id,
          payloadSummary: {
            categories: ['Cash Deposit', 'Petty Cash Advance', 'Shift Reconciliation'],
            docNos: staged.records.map((r) => r.docNo),
          },
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'AuditExportBatch',
          recordId: created.id,
          recordCode: created.batchCode,
          newValues: created,
          description: `Generated ${dto.format} Audit Ledger Export (${staged.recordCount} records)`,
          actor: user,
          tx,
        });
      }

      await this.log({
        entityType: 'audit_export_batch',
        entityId: created.id,
        docNo: batchCode,
        action: 'EXPORT',
        step: `Generated ${dto.format} Audit Ledger Export (${staged.recordCount} records)`,
        toStatus: 'Exported',
        performedById: user.id,
        performedByName: user.fullName,
        tx,
      });

      return created;
    });

    let content: string;
    let mimeType: string;
    let fileName: string;

    if (dto.format === 'JSON') {
      content = JSON.stringify(
        {
          batchCode,
          generatedAt: new Date().toISOString(),
          exportedBy: user.fullName,
          baseCurrency: staged.baseCurrency,
          totalBaseAmount: staged.totalBaseAmount,
          records: staged.records,
        },
        null,
        2,
      );
      mimeType = 'application/json';
      fileName = `${batchCode}.json`;
    } else {
      const headers = [
        'Category',
        'Doc Number',
        'Date',
        'Outlet / Department',
        'Approver',
        'GL Account',
        `Amount (${staged.baseCurrency})`,
        'Status',
      ];
      const escapeCsv = (val: unknown) => {
        const raw = String(val ?? '');
        const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const lines = [
        headers.join(','),
        ...staged.records.map((r) =>
          [
            r.category,
            r.docNo,
            r.docDate,
            r.location,
            r.approver,
            r.glAccount,
            r.amountBase.toFixed(2),
            r.status,
          ]
            .map(escapeCsv)
            .join(','),
        ),
      ];
      content = lines.join('\n');
      mimeType = 'text/csv;charset=utf-8';
      fileName = `${batchCode}.csv`;
    }

    return {
      batch: {
        id: batch.id,
        batchCode: batch.batchCode,
        format: batch.format,
        recordCount: batch.recordCount,
        totalBaseAmount: toNumber(batch.totalBaseAmount),
        baseCurrency: batch.baseCurrency,
        createdAt: batch.createdAt.toISOString(),
      },
      fileName,
      mimeType,
      content,
    };
  }

  async listExportBatches() {
    const batches = await this.prisma.auditExportBatch.findMany({
      include: { exportedBy: { select: { id: true, fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return batches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      format: b.format,
      recordCount: b.recordCount,
      totalBaseAmount: toNumber(b.totalBaseAmount),
      baseCurrency: b.baseCurrency,
      exportedBy: b.exportedBy.fullName,
      createdAt: b.createdAt.toISOString(),
    }));
  }
}
