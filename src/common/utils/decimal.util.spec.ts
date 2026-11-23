import Decimal from 'decimal.js';
import {
  computeDenominationSum,
  formatIsoDate,
  parseDateOnly,
  roundMoney,
  toDecimal,
  toNumber,
} from './decimal.util';

describe('decimal.util', () => {
  it('avoids JavaScript floating-point drift on financial sums', () => {
    const sum = toDecimal('0.1').plus(toDecimal('0.2'));
    expect(sum.toFixed(2)).toBe('0.30');
    expect(toNumber(sum)).toBe(0.3);
  });

  it('supports standard, roundUp, and truncate rounding modes', () => {
    expect(roundMoney('10.125', 2, 'standard').toFixed(2)).toBe('10.13');
    expect(roundMoney('10.121', 2, 'roundUp').toFixed(2)).toBe('10.13');
    expect(roundMoney('10.129', 2, 'truncate').toFixed(2)).toBe('10.12');
  });

  it('computes denomination totals accurately and ignores negative counts', () => {
    const total = computeDenominationSum({ '100': 10, '50': 6, '20': 5, '10': -2 });
    expect(total.equals(new Decimal(1400))).toBe(true);
  });

  it('parses calendar dates cleanly in UTC without day shift', () => {
    const parsed = parseDateOnly('2026-10-19');
    expect(formatIsoDate(parsed)).toBe('2026-10-19');
  });
});
