import { AsyncLocalStorage } from 'async_hooks';
import { AuditRequestContext } from './audit.types';

export const SYSTEM_ACTOR_USERNAME = 'system';
export const SYSTEM_ACTOR_DISPLAY_NAME = 'System Automated Process (SYS-000)';

export const auditContextStorage = new AsyncLocalStorage<AuditRequestContext>();

export const CLIENT_PROTECTED_AUDIT_FIELDS = new Set([
  'createUserId',
  'updateUserId',
  'createdAt',
  'updatedAt',
  'createAt',
  'updateAt',
]);

export function getAuditContext(): AuditRequestContext | undefined {
  return auditContextStorage.getStore();
}

export function runWithAuditContext<T>(
  context: AuditRequestContext,
  callback: () => T,
): T {
  return auditContextStorage.run(context, callback);
}

export function runWithSystemAuditContext<T>(
  callback: () => T,
  systemLabel = SYSTEM_ACTOR_DISPLAY_NAME,
): T {
  return auditContextStorage.run(
    {
      userId: null,
      userName: systemLabel,
      ipAddress: '127.0.0.1',
      userAgent: 'BNF-CMS-System-Worker',
      isSystem: true,
    },
    callback,
  );
}

/**
 * Recursively removes protected audit columns from client-submitted payloads
 * so frontend/API requests can never override audit authorship or timestamps.
 */
export function stripClientAuditFields(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = stripClientAuditFields(value[i], seen);
    }
    return value;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (CLIENT_PROTECTED_AUDIT_FIELDS.has(key)) {
      delete record[key];
      continue;
    }
    record[key] = stripClientAuditFields(record[key], seen);
  }
  return record;
}
