import { ExchangeRateResolverService } from './exchange-rate-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

describe('ExchangeRateResolverService', () => {
  const createMockPrisma = (overrides?: Partial<Record<string, unknown>>) => {
    const currencies = [
      { id: 1, code: 'USD', symbol: '$', rateToBase: new Prisma.Decimal(1), decimalPlaces: 2, isBase: true, isActive: true },
      { id: 2, code: 'EUR', symbol: '€', rateToBase: new Prisma.Decimal(1.09), decimalPlaces: 2, isBase: false, isActive: true },
      { id: 3, code: 'MVR', symbol: 'Rf', rateToBase: new Prisma.Decimal(0.065), decimalPlaces: 2, isBase: false, isActive: true },
      { id: 4, code: 'LKR', symbol: 'Rs', rateToBase: new Prisma.Decimal(0.0033), decimalPlaces: 2, isBase: false, isActive: true },
    ];
    return {
      businessConfig: {
        findFirst: jest.fn().mockResolvedValue({
          baseCurrency: 'USD',
          baseSymbol: '$',
          decimalPrecision: 2,
          roundingMethod: 'standard',
          operationalCurrency: 'MVR',
          operationalSymbol: 'Rf',
          pettyCashGstRate: new Prisma.Decimal(8),
        }),
      },
      currency: {
        findFirst: jest.fn().mockResolvedValue(currencies[0]),
        findMany: jest.fn().mockResolvedValue(currencies),
      },
      exchangeRate: {
        findFirst: jest.fn().mockImplementation(async ({ where }: { where: { fromCurrencyId: number; toCurrencyId: number } }) => {
          if (where.fromCurrencyId === 2 && where.toCurrencyId === 1) {
            return { rate: new Prisma.Decimal(1.09) };
          }
          if (where.fromCurrencyId === 1 && where.toCurrencyId === 3) {
            return { rate: new Prisma.Decimal(15.42) };
          }
          if (where.fromCurrencyId === 4 && where.toCurrencyId === 1) {
            return { rate: new Prisma.Decimal(0.0033) };
          }
          return null;
        }),
      },
      ...overrides,
    } as unknown as PrismaService;
  };

  it('resolves direct active exchange rate EUR -> USD', async () => {
    const service = new ExchangeRateResolverService(createMockPrisma());
    const result = await service.convertToBase(850, 'EUR');
    expect(result.baseCurrency).toBe('USD');
    expect(result.rate.toFixed(2)).toBe('1.09');
    expect(result.baseAmount.toFixed(2)).toBe('926.50');
  });

  it('resolves inverse active exchange rate MVR -> USD when only USD -> MVR exists', async () => {
    const service = new ExchangeRateResolverService(createMockPrisma());
    const rate = await service.resolveRate('MVR', 'USD');
    expect(Number(rate.toFixed(6))).toBeCloseTo(1 / 15.42, 5);
  });

  it('supports switching system-wide base currency to MVR and cross-converts EUR -> MVR via USD', async () => {
    const mockPrisma = createMockPrisma({
      businessConfig: {
        findFirst: jest.fn().mockResolvedValue({
          baseCurrency: 'MVR',
          baseSymbol: 'Rf',
          decimalPrecision: 2,
          roundingMethod: 'standard',
          operationalCurrency: 'MVR',
          operationalSymbol: 'Rf',
          pettyCashGstRate: new Prisma.Decimal(8),
        }),
      },
    });
    const service = new ExchangeRateResolverService(mockPrisma);
    const result = await service.convertToBase(100, 'EUR');
    expect(result.baseCurrency).toBe('MVR');
    expect(result.baseSymbol).toBe('Rf');
    // 100 EUR * 1.09 USD/EUR * 15.42 MVR/USD = 1680.78 MVR
    expect(result.baseAmount.toFixed(2)).toBe('1680.78');
  });
});
