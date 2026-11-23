import { Injectable, NotFoundException } from '@nestjs/common';
import { ChangeLogAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  getAuditContext,
  SYSTEM_ACTOR_DISPLAY_NAME,
  SYSTEM_ACTOR_USERNAME,
} from './audit-context';
import {
  AuditActor,
  AuditLogQueryDto,
  BulkLogCreateParams,
  ChangeLogActionType,
  LogActionParams,
  LogCreateParams,
  LogDeleteParams,
  LogUpdateParams,
} from './audit.types';
import {
  buildAuditDescription,
  buildFieldDiffs,
  computeAuditDiff,
  extractRecordCode,
  sanitizeAuditRecord,
} from './audit.utils';

interface ResolvedActor {
  userId: number | null;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Strictly Append-Only Centralized ChangeLog Audit Service.
 *
 * Exposes ONLY audit creation (INSERT) and retrieval (SELECT) operations.
 * UPDATE and DELETE methods are intentionally omitted to guarantee
 * immutable financial audit history.
 */
@Injectable()
export class ChangeLogService {
  private cachedSystemUserId: number | null | undefined = undefined;

  constructor(private readonly prisma: PrismaService) {}

  async getSystemUserId(tx?: Prisma.TransactionClient): Promise<number | null> {
    if (this.cachedSystemUserId !== undefined) {
      return this.cachedSystemUserId;
    }
    const db = tx || this.prisma;
    const sysUser = await db.user.findUnique({
      where: { username: SYSTEM_ACTOR_USERNAME },
      select: { id: true },
    });
    this.cachedSystemUserId = sysUser?.id ?? null;
    return this.cachedSystemUserId;
  }

  async resolveActor(
    explicitActor?: AuditActor | null,
    overrideMeta?: { ipAddress?: string | null; userAgent?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<ResolvedActor> {
    const ctx = getAuditContext();
    const ipAddress = overrideMeta?.ipAddress ?? ctx?.ipAddress ?? null;
    const userAgent = overrideMeta?.userAgent ?? ctx?.userAgent ?? null;

    if (explicitActor && explicitActor.id) {
      const displayName = explicitActor.fullName
        ? `${explicitActor.fullName}${explicitActor.empNo ? ` (${explicitActor.empNo})` : ''}`
        : explicitActor.username || `User #${explicitActor.id}`;
      return {
        userId: explicitActor.id,
        userName: displayName.slice(0, 150),
        ipAddress,
        userAgent,
      };
    }

    if (ctx && ctx.userId) {
      return {
        userId: ctx.userId,
        userName: (ctx.userName || `User #${ctx.userId}`).slice(0, 150),
        ipAddress,
        userAgent,
      };
    }

    const systemUserId = await this.getSystemUserId(tx);
    return {
      userId: systemUserId,
      userName: ctx?.userName || SYSTEM_ACTOR_DISPLAY_NAME,
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'BNF-CMS-System',
    };
  }

  /**
   * Produces mandatory audit column values for record creation.
   * Never trusts frontend input; uses authenticated user or System Actor.
   */
  stampCreate(actor?: AuditActor | null): {
    createUserId: number | null;
    updateUserId: number | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    const now = new Date();
    const ctx = getAuditContext();
    const userId = actor?.id ?? ctx?.userId ?? this.cachedSystemUserId ?? null;
    return {
      createUserId: userId,
      updateUserId: userId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Produces mandatory audit column values for record updates.
   */
  stampUpdate(actor?: AuditActor | null): {
    updateUserId: number | null;
    updatedAt: Date;
  } {
    const ctx = getAuditContext();
    const userId = actor?.id ?? ctx?.userId ?? this.cachedSystemUserId ?? null;
    return {
      updateUserId: userId,
      updatedAt: new Date(),
    };
  }

  async logCreate(params: LogCreateParams) {
    const db = params.tx || this.prisma;
    const resolved = await this.resolveActor(
      params.actor,
      { ipAddress: params.ipAddress, userAgent: params.userAgent },
      params.tx,
    );
    const snapshot = sanitizeAuditRecord(params.newValues) || {};
    const recordCode = params.recordCode ?? extractRecordCode(params.newValues);
    const changedFields = Object.keys(snapshot).filter(
      (k) => !['createdAt', 'updatedAt', 'createUserId', 'updateUserId'].includes(k),
    );
    const description = buildAuditDescription(
      'CREATE',
      params.tableName,
      recordCode,
      changedFields,
      params.description,
    );

    return db.changeLog.create({
      data: {
        userId: resolved.userId,
        userName: resolved.userName,
        action: ChangeLogAction.CREATE,
        tableName: params.tableName,
        recordId: String(params.recordId),
        recordCode,
        oldValues: Prisma.DbNull,
        newValues: snapshot as Prisma.InputJsonValue,
        changedFields,
        description,
        ipAddress: resolved.ipAddress,
        userAgent: resolved.userAgent,
      },
    });
  }

  async logUpdate(params: LogUpdateParams) {
    const diff = computeAuditDiff(params.oldValues, params.newValues);
    if (!diff.hasChanges) {
      // Section 4.2: Do not create unnecessary change log entries when no data changed
      return null;
    }

    const db = params.tx || this.prisma;
    const resolved = await this.resolveActor(
      params.actor,
      { ipAddress: params.ipAddress, userAgent: params.userAgent },
      params.tx,
    );
    const recordCode =
      params.recordCode ??
      extractRecordCode(params.newValues) ??
      extractRecordCode(params.oldValues);
    const description = buildAuditDescription(
      'UPDATE',
      params.tableName,
      recordCode,
      diff.changedFields,
      params.description,
    );

    return db.changeLog.create({
      data: {
        userId: resolved.userId,
        userName: resolved.userName,
        action: ChangeLogAction.UPDATE,
        tableName: params.tableName,
        recordId: String(params.recordId),
        recordCode,
        oldValues: diff.oldValues as Prisma.InputJsonValue,
        newValues: diff.newValues as Prisma.InputJsonValue,
        changedFields: diff.changedFields,
        description,
        ipAddress: resolved.ipAddress,
        userAgent: resolved.userAgent,
      },
    });
  }

  async logDelete(params: LogDeleteParams) {
    const db = params.tx || this.prisma;
    const resolved = await this.resolveActor(
      params.actor,
      { ipAddress: params.ipAddress, userAgent: params.userAgent },
      params.tx,
    );
    const oldSnapshot = sanitizeAuditRecord(params.oldValues) || {};
    const recordCode = params.recordCode ?? extractRecordCode(params.oldValues);
    const changedFields = Object.keys(oldSnapshot).filter(
      (k) => !['createdAt', 'updatedAt', 'createUserId', 'updateUserId'].includes(k),
    );
    const description = buildAuditDescription(
      'DELETE',
      params.tableName,
      recordCode,
      changedFields,
      params.description,
    );

    return db.changeLog.create({
      data: {
        userId: resolved.userId,
        userName: resolved.userName,
        action: ChangeLogAction.DELETE,
        tableName: params.tableName,
        recordId: String(params.recordId),
        recordCode,
        oldValues: oldSnapshot as Prisma.InputJsonValue,
        newValues: Prisma.DbNull,
        changedFields,
        description,
        ipAddress: resolved.ipAddress,
        userAgent: resolved.userAgent,
      },
    });
  }

  async logAction(params: LogActionParams) {
    const db = params.tx || this.prisma;
    const resolved = await this.resolveActor(
      params.actor,
      { ipAddress: params.ipAddress, userAgent: params.userAgent },
      params.tx,
    );

    let oldValues: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    let newValues: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
    let changedFields: string[] = params.changedFields || [];

    if (params.oldValues && params.newValues) {
      const diff = computeAuditDiff(params.oldValues, params.newValues);
      if (diff.hasChanges) {
        oldValues = diff.oldValues as Prisma.InputJsonValue;
        newValues = diff.newValues as Prisma.InputJsonValue;
        changedFields = diff.changedFields;
      } else {
        oldValues = (sanitizeAuditRecord(params.oldValues) || {}) as Prisma.InputJsonValue;
        newValues = (sanitizeAuditRecord(params.newValues) || {}) as Prisma.InputJsonValue;
      }
    } else if (params.oldValues) {
      oldValues = (sanitizeAuditRecord(params.oldValues) || {}) as Prisma.InputJsonValue;
    } else if (params.newValues) {
      newValues = (sanitizeAuditRecord(params.newValues) || {}) as Prisma.InputJsonValue;
    }

    const recordCode =
      params.recordCode ??
      extractRecordCode(params.newValues) ??
      extractRecordCode(params.oldValues);

    const description = buildAuditDescription(
      params.action,
      params.tableName,
      recordCode,
      changedFields,
      params.description,
    );

    return db.changeLog.create({
      data: {
        userId: resolved.userId,
        userName: resolved.userName,
        action: params.action as ChangeLogAction,
        tableName: params.tableName,
        recordId: String(params.recordId),
        recordCode,
        oldValues,
        newValues,
        changedFields,
        description,
        ipAddress: resolved.ipAddress,
        userAgent: resolved.userAgent,
      },
    });
  }

  async logBulkCreate(params: BulkLogCreateParams) {
    if (!params.records || params.records.length === 0) return [];
    const db = params.tx || this.prisma;
    const resolved = await this.resolveActor(params.actor, undefined, params.tx);

    const rows = params.records.map((rec) => {
      const snapshot = sanitizeAuditRecord(rec.newValues) || {};
      const recordCode = rec.recordCode ?? extractRecordCode(rec.newValues);
      const changedFields = Object.keys(snapshot).filter(
        (k) => !['createdAt', 'updatedAt', 'createUserId', 'updateUserId'].includes(k),
      );
      return {
        userId: resolved.userId,
        userName: resolved.userName,
        action: ChangeLogAction.CREATE,
        tableName: params.tableName,
        recordId: String(rec.recordId),
        recordCode,
        oldValues: Prisma.DbNull,
        newValues: snapshot as Prisma.InputJsonValue,
        changedFields,
        description: buildAuditDescription(
          'CREATE',
          params.tableName,
          recordCode,
          changedFields,
          rec.description,
        ),
        ipAddress: resolved.ipAddress,
        userAgent: resolved.userAgent,
      };
    });

    await db.changeLog.createMany({ data: rows });
    return rows;
  }

  private serializeEntry(
    row: {
      id: number;
      userId: number | null;
      userName: string;
      action: ChangeLogAction;
      tableName: string;
      recordId: string;
      recordCode: string | null;
      oldValues: Prisma.JsonValue;
      newValues: Prisma.JsonValue;
      changedFields: string[];
      description: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      user?: { id: number; username: string; fullName: string; empNo: string | null } | null;
    },
    includeFieldDiffs = false,
  ) {
    const oldObj =
      row.oldValues && typeof row.oldValues === 'object' && !Array.isArray(row.oldValues)
        ? (row.oldValues as Record<string, unknown>)
        : null;
    const newObj =
      row.newValues && typeof row.newValues === 'object' && !Array.isArray(row.newValues)
        ? (row.newValues as Record<string, unknown>)
        : null;

    return {
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      userUsername: row.user?.username || null,
      action: row.action as ChangeLogActionType,
      tableName: row.tableName,
      recordId: row.recordId,
      recordCode: row.recordCode,
      oldValues: oldObj,
      newValues: newObj,
      changedFields: row.changedFields,
      description: row.description,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      ...(includeFieldDiffs
        ? {
            fieldDiffs: buildFieldDiffs(
              row.action as ChangeLogActionType,
              oldObj,
              newObj,
              row.changedFields,
            ),
          }
        : {}),
    };
  }

  async getAuditLogs(query: AuditLogQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const where: Prisma.ChangeLogWhereInput = {};

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    if (query.userId) where.userId = Number(query.userId);
    if (query.tableName) {
      where.tableName = { equals: query.tableName.trim(), mode: 'insensitive' };
    }
    if (query.action) where.action = query.action as ChangeLogAction;
    if (query.recordCode) {
      where.recordCode = { contains: query.recordCode.trim(), mode: 'insensitive' };
    }
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { recordCode: { contains: q, mode: 'insensitive' } },
        { recordId: { contains: q, mode: 'insensitive' } },
        { tableName: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [total, rows] = await Promise.all([
      this.prisma.changeLog.count({ where }),
      this.prisma.changeLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, empNo: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((r) => this.serializeEntry(r, false)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAuditLogById(id: number) {
    const row = await this.prisma.changeLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true, empNo: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(`Change log entry #${id} not found.`);
    }
    return this.serializeEntry(row, true);
  }

  async getRecordHistory(tableName: string, recordId: string) {
    const rows = await this.prisma.changeLog.findMany({
      where: {
        tableName: { equals: tableName.trim(), mode: 'insensitive' },
        recordId: String(recordId),
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, empNo: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      tableName,
      recordId: String(recordId),
      total: rows.length,
      items: rows.map((r) => this.serializeEntry(r, true)),
    };
  }

  async getUserActivity(userId: number, query: AuditLogQueryDto) {
    return this.getAuditLogs({ ...query, userId });
  }

  async getAvailableTables(): Promise<string[]> {
    const rows = await this.prisma.changeLog.findMany({
      distinct: ['tableName'],
      select: { tableName: true },
      orderBy: { tableName: 'asc' },
    });
    return rows.map((r) => r.tableName);
  }
}
