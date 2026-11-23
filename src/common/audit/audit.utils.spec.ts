import Decimal from 'decimal.js';
import {
  areAuditValuesEqual,
  buildAuditDescription,
  buildFieldDiffs,
  computeAuditDiff,
  extractRecordCode,
  sanitizeAuditRecord,
  sanitizeAuditValue,
} from './audit.utils';
import {
  getAuditContext,
  runWithAuditContext,
  runWithSystemAuditContext,
  stripClientAuditFields,
} from './audit-context';

describe('Audit Utilities & Context Isolation', () => {
  describe('sanitizeAuditValue & sanitizeAuditRecord', () => {
    it('strictly excludes sensitive credentials, hashes, tokens, and secrets at all nesting levels', () => {
      const raw = {
        id: 7,
        username: 'superadmin',
        password: 'plain-password',
        passwordHash: '$2b$12$hashed',
        refreshToken: 'rt_secret_value',
        accessToken: 'jwt_access_token',
        tokenHash: 'sha256_hash',
        apiKey: 'ak_live_123',
        jwtSecret: 'top-secret',
        nested: {
          displayName: 'Treasury',
          privateKey: '-----BEGIN KEY-----',
          clientSecret: 'shh',
        },
        items: [
          { label: 'ok', salt: 'random-salt' },
        ],
      };

      const sanitized = sanitizeAuditRecord(raw);
      expect(sanitized).toEqual({
        id: 7,
        username: 'superadmin',
        nested: { displayName: 'Treasury' },
        items: [{ label: 'ok' }],
      });

      const serialized = JSON.stringify(sanitized);
      expect(serialized).not.toContain('plain-password');
      expect(serialized).not.toContain('$2b$12$hashed');
      expect(serialized).not.toContain('rt_secret_value');
      expect(serialized).not.toContain('jwt_access_token');
      expect(serialized).not.toContain('sha256_hash');
      expect(serialized).not.toContain('ak_live_123');
      expect(serialized).not.toContain('BEGIN KEY');
      expect(serialized).not.toContain('random-salt');
    });

    it('handles Decimal, Date (UTC ISO), BigInt, Buffer, non-finite numbers, and circular references safely', () => {
      const circular: Record<string, unknown> = {
        name: 'Main Vault',
        openingBalance: new Decimal('150000.50'),
        createdAt: new Date('2026-11-23T09:15:30.000Z'),
        bigCount: BigInt('9007199254740999'),
        payload: Buffer.from('abc'),
        badNum: Number.NaN,
      };
      circular.self = circular;

      const sanitized = sanitizeAuditRecord(circular);
      expect(sanitized).toEqual({
        name: 'Main Vault',
        openingBalance: '150000.5',
        createdAt: '2026-11-23T09:15:30.000Z',
        bigCount: '9007199254740999',
        payload: '[Buffer 3 bytes]',
        badNum: null,
        self: '[Circular]',
      });
    });

    it('returns null for null/undefined values', () => {
      expect(sanitizeAuditValue(null)).toBeNull();
      expect(sanitizeAuditValue(undefined)).toBeNull();
      expect(sanitizeAuditRecord(null)).toBeNull();
    });
  });

  describe('areAuditValuesEqual & computeAuditDiff', () => {
    it('equates Decimal-formatted strings and numeric values accurately', () => {
      expect(areAuditValuesEqual('100.00', 100)).toBe(true);
      expect(areAuditValuesEqual('150.50', '150.5')).toBe(true);
      expect(areAuditValuesEqual('100.00', '100.01')).toBe(false);
    });

    it('equates equivalent ISO timestamps and deep structures', () => {
      expect(
        areAuditValuesEqual('2026-11-23T10:00:00.000Z', '2026-11-23T10:00:00Z'),
      ).toBe(true);
      expect(areAuditValuesEqual([1, { a: 'x' }], [1, { a: 'x' }])).toBe(true);
      expect(areAuditValuesEqual([1, { a: 'x' }], [1, { a: 'y' }])).toBe(false);
    });

    it('detects only changed business fields and excludes unchanged fields and audit metadata', () => {
      const oldRecord = {
        id: 10,
        name: 'Main Cash Account',
        openingBalance: new Decimal('100000.00'),
        status: 'Active',
        remark: 'Initial',
        notes: null,
        createUserId: 1,
        updateUserId: 1,
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      };
      const newRecord = {
        id: 10,
        name: 'Head Office Cash',
        openingBalance: new Decimal('150000.00'),
        status: 'Active', // unchanged
        remark: null, // removed
        notes: 'Verified by CFO', // added
        createUserId: 1,
        updateUserId: 2,
        createdAt: new Date('2026-11-01T00:00:00.000Z'),
        updatedAt: new Date('2026-11-23T12:00:00.000Z'),
      };

      const diff = computeAuditDiff(oldRecord, newRecord);
      expect(diff.hasChanges).toBe(true);
      expect(diff.changedFields).toEqual(
        expect.arrayContaining(['name', 'openingBalance', 'remark', 'notes']),
      );
      expect(diff.changedFields).not.toContain('status');
      expect(diff.changedFields).not.toContain('updateUserId');
      expect(diff.changedFields).not.toContain('updatedAt');

      expect(diff.oldValues).toEqual({
        name: 'Main Cash Account',
        openingBalance: '100000',
        remark: 'Initial',
        notes: null,
      });
      expect(diff.newValues).toEqual({
        name: 'Head Office Cash',
        openingBalance: '150000',
        remark: null,
        notes: 'Verified by CFO',
      });

      const byField = Object.fromEntries(diff.fieldDiffs.map((d) => [d.field, d]));
      expect(byField.name.changeType).toBe('MODIFIED');
      expect(byField.remark.changeType).toBe('REMOVED');
      expect(byField.notes.changeType).toBe('ADDED');
    });

    it('reports hasChanges = false for no-op updates (even when updatedAt/updateUserId changed)', () => {
      const before = {
        id: 5,
        code: 'DEPT-01',
        name: 'Finance',
        budgetLimit: new Decimal('5000.00'),
        updateUserId: 1,
        updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      };
      const after = {
        id: 5,
        code: 'DEPT-01',
        name: 'Finance',
        budgetLimit: 5000,
        updateUserId: 2,
        updatedAt: new Date('2026-11-23T10:00:00.000Z'),
      };

      const diff = computeAuditDiff(before, after);
      expect(diff.hasChanges).toBe(false);
      expect(diff.changedFields).toHaveLength(0);
    });
  });

  describe('buildFieldDiffs, extractRecordCode & buildAuditDescription', () => {
    it('builds ADDED diffs for CREATE and REMOVED diffs for DELETE', () => {
      const createDiffs = buildFieldDiffs('CREATE', null, { code: 'BNK-01', name: 'BML' }, ['code', 'name']);
      expect(createDiffs.every((d) => d.changeType === 'ADDED' && d.oldValue === null)).toBe(true);

      const deleteDiffs = buildFieldDiffs('DELETE', { code: 'BNK-01', name: 'BML' }, null, ['code', 'name']);
      expect(deleteDiffs.every((d) => d.changeType === 'REMOVED' && d.newValue === null)).toBe(true);
    });

    it('extracts human-readable record codes and builds descriptions', () => {
      expect(extractRecordCode({ docNo: 'DEP-2026-0001', name: 'Ignored' })).toBe('DEP-2026-0001');
      expect(extractRecordCode({ code: 'OUT-01' })).toBe('OUT-01');
      expect(
        buildAuditDescription('UPDATE', 'BankAccount', 'ACC-01', ['accountName', 'status']),
      ).toBe('Updated Account Name, Status on BankAccount (ACC-01)');
      expect(buildAuditDescription('CANCEL', 'CashDeposit', 'DEP-100', ['status'])).toBe(
        'Cancelled CashDeposit (DEP-100)',
      );
    });
  });

  describe('stripClientAuditFields', () => {
    it('recursively strips spoofed audit columns from client payloads', () => {
      const clientPayload = {
        code: 'DEPT-99',
        name: 'Operations',
        createUserId: 999,
        updateUserId: 888,
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
        createAt: '2020-01-01T00:00:00.000Z',
        updateAt: '2020-01-01T00:00:00.000Z',
        lines: [
          {
            amount: 250,
            createUserId: 777,
            updateUserId: 666,
          },
        ],
      };

      const cleaned = stripClientAuditFields(clientPayload) as Record<string, unknown>;
      expect(cleaned).toEqual({
        code: 'DEPT-99',
        name: 'Operations',
        lines: [{ amount: 250 }],
      });
    });
  });

  describe('AsyncLocalStorage concurrent audit context isolation', () => {
    it('maintains strictly isolated actor context across concurrent async operations', async () => {
      const taskA = runWithAuditContext(
        {
          userId: 101,
          userName: 'Alice Maker',
          ipAddress: '10.0.0.1',
          userAgent: 'Agent-A',
          isSystem: false,
        },
        async () => {
          await new Promise((r) => setTimeout(r, 15));
          return getAuditContext();
        },
      );

      const taskB = runWithAuditContext(
        {
          userId: 202,
          userName: 'Bob Approver',
          ipAddress: '10.0.0.2',
          userAgent: 'Agent-B',
          isSystem: false,
        },
        async () => {
          await new Promise((r) => setTimeout(r, 5));
          return getAuditContext();
        },
      );

      const taskSys = runWithSystemAuditContext(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return getAuditContext();
      });

      const [ctxA, ctxB, ctxSys] = await Promise.all([taskA, taskB, taskSys]);
      expect(ctxA?.userId).toBe(101);
      expect(ctxA?.userName).toBe('Alice Maker');
      expect(ctxB?.userId).toBe(202);
      expect(ctxB?.userName).toBe('Bob Approver');
      expect(ctxSys?.isSystem).toBe(true);
      expect(ctxSys?.userId).toBeNull();
    });
  });
});
