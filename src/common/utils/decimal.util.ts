import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';

export type DecimalInput = Decimal | Prisma.Decimal | number | string | null | undefined;

export function toDecimal(value: DecimalInput): Decimal {
  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value.toString());
}

export function roundMoney(
  value: DecimalInput,
  precision = 2,
  mode: 'standard' | 'roundUp' | 'truncate' = 'standard',
): Decimal {
  const dec = toDecimal(value);
  const roundingMode =
    mode === 'roundUp'
      ? Decimal.ROUND_UP
      : mode === 'truncate'
        ? Decimal.ROUND_DOWN
        : Decimal.ROUND_HALF_UP;
  return dec.toDecimalPlaces(precision, roundingMode);
}

export function toPrismaDecimal(value: DecimalInput, precision = 2): Prisma.Decimal {
  return new Prisma.Decimal(roundMoney(value, precision).toFixed(precision));
}

export function toPrismaRate(value: DecimalInput): Prisma.Decimal {
  return new Prisma.Decimal(toDecimal(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed(6));
}

export function toNumber(value: DecimalInput, precision = 2): number {
  return Number(roundMoney(value, precision).toFixed(precision));
}

export function computeDenominationSum(counts: Record<string, number> | null | undefined): Decimal {
  if (!counts || typeof counts !== 'object') {
    return new Decimal(0);
  }
  let total = new Decimal(0);
  for (const [denomKey, qtyVal] of Object.entries(counts)) {
    const denom = toDecimal(denomKey);
    const qty = Math.max(0, Math.floor(Number(qtyVal) || 0));
    if (denom.gt(0) && qty > 0) {
      total = total.plus(denom.times(qty));
    }
  }
  return roundMoney(total, 2);
}

export function formatIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

export function parseDateOnly(value?: string | Date | null): Date {
  if (!value) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}
