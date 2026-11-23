import { ForbiddenException } from '@nestjs/common';
import { ChangeLogAction, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../database/prisma.service';
import { ChangeLogService } from './audit.service';
import { runWithAuditContext, runWithSystemAuditContext } from './audit-context';

interface MockChangeLogRecord {
  id: number;
  userId: number | null;
  userName: string;
  action: ChangeLogAction;
  tableName: string;
  recordId: string;
  recordCode: string | null;
  oldValues: unknown;
  newValues: unknown;
  changedFields: string[];
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function createMockPrisma() {
  const insertedLogs: MockChangeLogRecord[] = [];
  let seq = 1;

  const mock = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 99 }), // System Actor ID = 99
    },
    changeLog: {
      create: jest.fn().mockImplementation(async ({ data }: { data: Omit<MockChangeLogRecord, 'id' | 'createdAt'> }) => {
        const rec: MockChangeLogRecord = {
          id: seq++,
          ...data,
          createdAt: new Date(),
        };
        insertedLogs.push(rec);
        return rec;
      }),
      createMany: jest.fn().mockImplementation(async ({ data }: { data: Array<Omit<MockChangeLogRecord, 'id' | 'createdAt'>> }) => {
        for (const item of data) {
          insertedLogs.push({ id: seq++, ...item, createdAt: new Date() });
        }
        return { count: data.length };
      }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(),
    insertedLogs,
  };

  return mock;
}

describe('ChangeLogService & Append-Only Enforcement', () => {
  const actor = {
    id: 5,
    username: 'superadmin',
    fullName: 'Pramuditha Bandara',
    empNo: 'ADM-001',
  };

  it('stamps createUserId, updateUserId, and UTC timestamps from authenticated user context', () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    const createStamp = service.stampCreate(actor);
    expect(createStamp.createUserId).toBe(5);
    expect(createStamp.updateUserId).toBe(5);
    expect(createStamp.createdAt).toBeInstanceOf(Date);
    expect(createStamp.updatedAt).toBeInstanceOf(Date);

    const updateStamp = service.stampUpdate({ id: 8, fullName: 'Finance Manager' });
    expect(updateStamp.updateUserId).toBe(8);
    expect(updateStamp.updatedAt).toBeInstanceOf(Date);
  });

  it('logCreate records CREATE with oldValues = DbNull, sanitized newValues (no secrets), and actor metadata', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    await runWithAuditContext(
      {
        userId: 5,
        userName: 'Pramuditha Bandara (ADM-001)',
        ipAddress: '192.168.10.42',
        userAgent: 'Jest-Client/1.0',
        isSystem: false,
      },
      async () => {
        await service.logCreate({
          tableName: 'User',
          recordId: 12,
          recordCode: 'jdoe',
          newValues: {
            id: 12,
            username: 'jdoe',
            fullName: 'Jane Doe',
            passwordHash: '$2b$12$never_store_this',
            refreshToken: 'secret_refresh_token',
          },
          actor,
        });
      },
    );

    expect(mockPrisma.changeLog.create).toHaveBeenCalledTimes(1);
    const saved = mockPrisma.insertedLogs[0];
    expect(saved.action).toBe(ChangeLogAction.CREATE);
    expect(saved.userId).toBe(5);
    expect(saved.tableName).toBe('User');
    expect(saved.recordId).toBe('12');
    expect(saved.recordCode).toBe('jdoe');
    expect(saved.oldValues).toBe(Prisma.DbNull);
    expect(saved.newValues).toEqual({
      id: 12,
      username: 'jdoe',
      fullName: 'Jane Doe',
    });
    expect(saved.ipAddress).toBe('192.168.10.42');
    expect(saved.userAgent).toBe('Jest-Client/1.0');
  });

  it('logUpdate records ONLY changed fields and skips no-op updates without creating log rows', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    // 1. No-op update must NOT insert a ChangeLogs row
    const noOpResult = await service.logUpdate({
      tableName: 'BankAccount',
      recordId: 3,
      oldValues: {
        id: 3,
        accountName: 'Main Cash Account',
        openingBalance: new Decimal('100000.00'),
        status: 'Active',
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      },
      newValues: {
        id: 3,
        accountName: 'Main Cash Account',
        openingBalance: new Decimal('100000'),
        status: 'Active',
        updatedAt: new Date('2026-11-23T12:00:00.000Z'),
      },
      actor,
    });

    expect(noOpResult).toBeNull();
    expect(mockPrisma.changeLog.create).not.toHaveBeenCalled();

    // 2. Actual field modification creates UPDATE entry with exact diff
    const updated = await service.logUpdate({
      tableName: 'BankAccount',
      recordId: 3,
      recordCode: 'BML-001',
      oldValues: {
        id: 3,
        accountName: 'Main Cash Account',
        openingBalance: new Decimal('100000.00'),
        status: 'Active',
      },
      newValues: {
        id: 3,
        accountName: 'Head Office Cash',
        openingBalance: new Decimal('150000.00'),
        status: 'Active',
      },
      actor,
    });

    expect(updated).not.toBeNull();
    expect(mockPrisma.changeLog.create).toHaveBeenCalledTimes(1);
    const saved = mockPrisma.insertedLogs[0];
    expect(saved.action).toBe(ChangeLogAction.UPDATE);
    expect(saved.changedFields).toEqual(expect.arrayContaining(['accountName', 'openingBalance']));
    expect(saved.changedFields).not.toContain('status');
    expect(saved.oldValues).toEqual({
      accountName: 'Main Cash Account',
      openingBalance: '100000',
    });
    expect(saved.newValues).toEqual({
      accountName: 'Head Office Cash',
      openingBalance: '150000',
    });
  });

  it('logDelete preserves previous record snapshot with newValues = DbNull', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    await service.logDelete({
      tableName: 'Vendor',
      recordId: 22,
      oldValues: { id: 22, code: 'VND-022', name: 'Oceanic Supplies' },
      actor,
    });

    expect(mockPrisma.insertedLogs).toHaveLength(1);
    const saved = mockPrisma.insertedLogs[0];
    expect(saved.action).toBe(ChangeLogAction.DELETE);
    expect(saved.recordCode).toBe('VND-022');
    expect(saved.oldValues).toEqual({ id: 22, code: 'VND-022', name: 'Oceanic Supplies' });
    expect(saved.newValues).toBe(Prisma.DbNull);
  });

  it('logAction tracks workflow transitions (APPROVE, REJECT, CANCEL, POST, REVERSE, CLOSE, REOPEN)', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    const actions = ['APPROVE', 'REJECT', 'CANCEL', 'POST', 'REVERSE', 'CLOSE', 'REOPEN'] as const;
    for (const action of actions) {
      await service.logAction({
        action,
        tableName: 'CashDeposit',
        recordId: 44,
        recordCode: 'DEP-2026-0044',
        oldValues: { status: 'Submitted' },
        newValues: { status: action },
        description: `Transitioned deposit to ${action}`,
        actor,
      });
    }

    expect(mockPrisma.insertedLogs.map((l) => l.action)).toEqual(actions);
    expect(mockPrisma.insertedLogs[0].oldValues).toEqual({ status: 'Submitted' });
    expect(mockPrisma.insertedLogs[0].newValues).toEqual({ status: 'APPROVE' });
  });

  it('logBulkCreate preserves individual record histories for bulk operations', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    await service.logBulkCreate({
      tableName: 'Denomination',
      records: [
        { recordId: 1, recordCode: 'USD-100', newValues: { id: 1, currency: 'USD', value: 100 } },
        { recordId: 2, recordCode: 'USD-50', newValues: { id: 2, currency: 'USD', value: 50 } },
      ],
      actor,
    });

    expect(mockPrisma.changeLog.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.insertedLogs).toHaveLength(2);
    expect(mockPrisma.insertedLogs.map((r) => r.recordCode)).toEqual(['USD-100', 'USD-50']);
  });

  it('resolves automated system operations to the identifiable System Actor', async () => {
    const mockPrisma = createMockPrisma();
    const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

    await runWithSystemAuditContext(async () => {
      await service.logAction({
        action: 'CLOSE',
        tableName: 'SalesReconciliation',
        recordId: 9,
        recordCode: 'REC-2026-009',
        oldValues: { isLocked: false },
        newValues: { isLocked: true },
        description: 'Automated period lock',
      });
    });

    const saved = mockPrisma.insertedLogs[0];
    expect(saved.userId).toBe(99);
    expect(saved.userName).toContain('System Automated Process');
  });

  describe('Transaction Atomicity & Rollback', () => {
    it('rolls back audit logging if the business operation throws inside the transaction', async () => {
      const committedRecords: string[] = [];
      const committedLogs: string[] = [];

      const runAtomicTx = async (shouldFailBusiness: boolean, shouldFailAudit: boolean) => {
        const stagingRecords: string[] = [];
        const stagingLogs: string[] = [];
        const txClient = {
          changeLog: {
            create: jest.fn().mockImplementation(async () => {
              if (shouldFailAudit) {
                throw new Error('Simulated audit log failure');
              }
              stagingLogs.push('audit-row');
              return { id: 1 };
            }),
          },
          user: { findUnique: jest.fn().mockResolvedValue({ id: 99 }) },
        };

        const mockPrisma = createMockPrisma();
        const service = new ChangeLogService(mockPrisma as unknown as PrismaService);

        try {
          stagingRecords.push('business-row');
          if (shouldFailBusiness) {
            throw new Error('Simulated business write failure');
          }
          await service.logCreate({
            tx: txClient as unknown as Prisma.TransactionClient,
            tableName: 'Department',
            recordId: 1,
            newValues: { id: 1, name: 'Treasury' },
            actor,
          });
          committedRecords.push(...stagingRecords);
          committedLogs.push(...stagingLogs);
        } catch (err) {
          // Transaction rollback discards staging buffers
          throw err;
        }
      };

      await expect(runAtomicTx(true, false)).rejects.toThrow('Simulated business write failure');
      expect(committedRecords).toHaveLength(0);
      expect(committedLogs).toHaveLength(0);

      await expect(runAtomicTx(false, true)).rejects.toThrow('Simulated audit log failure');
      expect(committedRecords).toHaveLength(0);
      expect(committedLogs).toHaveLength(0);

      await expect(runAtomicTx(false, false)).resolves.toBeUndefined();
      expect(committedRecords).toHaveLength(1);
      expect(committedLogs).toHaveLength(1);
    });
  });

  describe('Strict Append-Only Immutability Enforcement', () => {
    it('ChangeLogService exposes zero update or delete methods', () => {
      const protoMethods = Object.getOwnPropertyNames(ChangeLogService.prototype);
      for (const method of protoMethods) {
        expect(method.toLowerCase()).not.toMatch(/^(update|patch|edit|delete|remove|truncate|purge)/);
      }
    });

    it('PrismaService runtime guard blocks update, updateMany, upsert, delete, and deleteMany on ChangeLog and AuditLog', () => {
      process.env.NODE_ENV = 'test';
      process.env.SKIP_PRISMA_CONNECT = 'true';
      const prismaService = new PrismaService();

      const blockedOps = ['update', 'updateMany', 'upsert', 'delete', 'deleteMany'] as const;
      for (const op of blockedOps) {
        const changeLogDelegate = prismaService.changeLog as unknown as Record<string, () => unknown>;
        const auditLogDelegate = prismaService.auditLog as unknown as Record<string, () => unknown>;
        expect(() => changeLogDelegate[op]()).toThrow(ForbiddenException);
        expect(() => auditLogDelegate[op]()).toThrow(ForbiddenException);
      }
    });
  });
});
