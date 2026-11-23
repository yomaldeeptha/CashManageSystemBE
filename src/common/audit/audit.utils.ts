import Decimal from 'decimal.js';
import { ChangeLogActionType, FieldChangeDiff } from './audit.types';

const SENSITIVE_FIELD_REGEX =
  /(password|passhash|passwordhash|secret|token|refreshtoken|accesstoken|tokenhash|apikey|privatekey|credential|jwt|salt)/i;

const AUDIT_METADATA_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'createUserId',
  'updateUserId',
  'createAt',
  'updateAt',
  'lastLoginAt',
]);

function isDecimalLike(val: unknown): val is { toFixed: () => string; toString: () => string } {
  if (!val || typeof val !== 'object') return false;
  if (val instanceof Decimal) return true;
  const ctorName = (val as { constructor?: { name?: string } }).constructor?.name;
  return (
    (ctorName === 'Decimal' || ctorName === 'd') &&
    typeof (val as { toFixed?: unknown }).toFixed === 'function'
  );
}

/**
 * Recursively converts any Prisma/domain object into a safe, JSONB-serializable
 * snapshot with all passwords, tokens, hashes, and secrets strictly excluded
 * and circular references safely handled.
 */
export function sanitizeAuditValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (isDecimalLike(value)) {
    return new Decimal(value.toString()).toString();
  }
  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (depth > 8) {
    return '[MaxDepth]';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, seen, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_REGEX.test(key)) {
      continue;
    }
    if (typeof val === 'function' || val === undefined) {
      continue;
    }
    out[key] = sanitizeAuditValue(val, seen, depth + 1);
  }
  return out;
}

export function sanitizeAuditRecord(
  record: Record<string, unknown> | object | null | undefined,
): Record<string, unknown> | null {
  if (!record || typeof record !== 'object') {
    return null;
  }
  const sanitized = sanitizeAuditValue(record);
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }
  return null;
}

function normalizeComparableNumber(val: unknown): Decimal | null {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return new Decimal(val);
  }
  if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) {
    try {
      return new Decimal(val.trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function areAuditValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;

  // Compare numeric strings / Decimals numerically (e.g. "100.00" === 100)
  const decA = normalizeComparableNumber(a);
  const decB = normalizeComparableNumber(b);
  if (decA && decB) {
    return decA.eq(decB);
  }

  // Compare ISO timestamps if both parse cleanly as dates
  if (
    typeof a === 'string' &&
    typeof b === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(a) &&
    /^\d{4}-\d{2}-\d{2}T/.test(b)
  ) {
    const tA = Date.parse(a);
    const tB = Date.parse(b);
    if (!Number.isNaN(tA) && !Number.isNaN(tB)) {
      return tA === tB;
    }
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areAuditValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const recA = a as Record<string, unknown>;
    const recB = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(recA), ...Object.keys(recB)]);
    for (const key of keys) {
      if (!areAuditValuesEqual(recA[key], recB[key])) return false;
    }
    return true;
  }

  return false;
}

export function formatFieldLabel(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function computeAuditDiff(
  oldRaw: Record<string, unknown> | object | null | undefined,
  newRaw: Record<string, unknown> | object | null | undefined,
): {
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  changedFields: string[];
  fieldDiffs: FieldChangeDiff[];
  hasChanges: boolean;
} {
  const oldSnap = sanitizeAuditRecord(oldRaw) || {};
  const newSnap = sanitizeAuditRecord(newRaw) || {};

  const allKeys = new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)]);
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const changedFields: string[] = [];
  const fieldDiffs: FieldChangeDiff[] = [];

  for (const key of allKeys) {
    if (AUDIT_METADATA_FIELDS.has(key)) continue;

    const oldVal = oldSnap[key] ?? null;
    const newVal = newSnap[key] ?? null;

    if (!areAuditValuesEqual(oldVal, newVal)) {
      oldValues[key] = oldVal;
      newValues[key] = newVal;
      changedFields.push(key);

      const changeType: FieldChangeDiff['changeType'] =
        oldVal === null && newVal !== null
          ? 'ADDED'
          : oldVal !== null && newVal === null
            ? 'REMOVED'
            : 'MODIFIED';

      fieldDiffs.push({
        field: key,
        label: formatFieldLabel(key),
        oldValue: oldVal,
        newValue: newVal,
        changeType,
      });
    }
  }

  return {
    oldValues,
    newValues,
    changedFields,
    fieldDiffs,
    hasChanges: changedFields.length > 0,
  };
}

export function buildFieldDiffs(
  action: ChangeLogActionType,
  oldRaw: Record<string, unknown> | null,
  newRaw: Record<string, unknown> | null,
  changedFields: string[],
): FieldChangeDiff[] {
  const oldObj = oldRaw || {};
  const newObj = newRaw || {};

  if (action === 'CREATE') {
    return Object.entries(newObj)
      .filter(([k]) => !AUDIT_METADATA_FIELDS.has(k))
      .map(([field, val]) => ({
        field,
        label: formatFieldLabel(field),
        oldValue: null,
        newValue: val,
        changeType: 'ADDED' as const,
      }));
  }

  if (action === 'DELETE') {
    return Object.entries(oldObj)
      .filter(([k]) => !AUDIT_METADATA_FIELDS.has(k))
      .map(([field, val]) => ({
        field,
        label: formatFieldLabel(field),
        oldValue: val,
        newValue: null,
        changeType: 'REMOVED' as const,
      }));
  }

  const keys =
    changedFields.length > 0
      ? changedFields
      : Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(
          (k) => !AUDIT_METADATA_FIELDS.has(k),
        );

  return keys.map((field) => {
    const oldValue = oldObj[field] ?? null;
    const newValue = newObj[field] ?? null;
    const changeType: FieldChangeDiff['changeType'] =
      oldValue === null && newValue !== null
        ? 'ADDED'
        : oldValue !== null && newValue === null
          ? 'REMOVED'
          : 'MODIFIED';
    return {
      field,
      label: formatFieldLabel(field),
      oldValue,
      newValue,
      changeType,
    };
  });
}

export function extractRecordCode(
  record: Record<string, unknown> | object | null | undefined,
): string | null {
  if (!record || typeof record !== 'object') return null;
  const r = record as Record<string, unknown>;
  const candidates = [
    'docNo',
    'requestId',
    'code',
    'empNo',
    'seriesId',
    'formId',
    'screenId',
    'username',
    'userGroupId',
    'batchCode',
    'accountNo',
    'voucherNo',
    'envelopeNo',
    'receiptVoucherNo',
    'settlementNo',
    'fileName',
    'name',
  ];
  for (const key of candidates) {
    const val = r[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim().slice(0, 120);
    }
  }
  return null;
}

export function buildAuditDescription(
  action: ChangeLogActionType,
  tableName: string,
  recordCode: string | null,
  changedFields: string[],
  customDescription?: string,
): string {
  if (customDescription && customDescription.trim()) {
    return customDescription.trim().slice(0, 500);
  }
  const ref = recordCode ? `${tableName} (${recordCode})` : tableName;
  switch (action) {
    case 'CREATE':
      return `Created ${ref}`;
    case 'UPDATE': {
      const preview = changedFields.slice(0, 4).map(formatFieldLabel).join(', ');
      const suffix = changedFields.length > 4 ? ` +${changedFields.length - 4} more` : '';
      return preview ? `Updated ${preview}${suffix} on ${ref}` : `Updated ${ref}`;
    }
    case 'DELETE':
      return `Deleted ${ref}`;
    case 'APPROVE':
      return `Approved ${ref}`;
    case 'REJECT':
      return `Rejected ${ref}`;
    case 'CANCEL':
      return `Cancelled ${ref}`;
    case 'POST':
      return `Posted ${ref}`;
    case 'REVERSE':
      return `Reversed ${ref}`;
    case 'CLOSE':
      return `Closed / locked ${ref}`;
    case 'REOPEN':
      return `Reopened / unblocked ${ref}`;
    case 'STATUS_CHANGE':
      return `Changed status on ${ref}`;
    default:
      return `${action} on ${ref}`;
  }
}
