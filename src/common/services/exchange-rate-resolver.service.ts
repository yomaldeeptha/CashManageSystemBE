import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../database/prisma.service';
import { roundMoney, toDecimal } from '../utils/decimal.util';

export interface SystemBaseCurrencyInfo {
  code: string;
  symbol: string;
  decimalPrecision: number;
  roundingMethod: 'standard' | 'roundUp' | 'truncate';
  operationalCurrency: string;
  operationalSymbol: string;
  pettyCashGstRate: Decimal;
}

@Injectable()
export class ExchangeRateResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemBaseCurrency(): Promise<SystemBaseCurrencyInfo> {
    const config = await this.prisma.businessConfig.findFirst({
      orderBy: { id: 'asc' },
    });
    if (config) {
      const rounding =
        config.roundingMethod === 'roundUp' || config.roundingMethod === 'truncate'
          ? config.roundingMethod
          : 'standard';
      return {
        code: config.baseCurrency.toUpperCase(),
        symbol: config.baseSymbol || '$',
        decimalPrecision: config.decimalPrecision || 2,
        roundingMethod: rounding,
        operationalCurrency: config.operationalCurrency.toUpperCase(),
        operationalSymbol: config.operationalSymbol || 'Rf',
        pettyCashGstRate: toDecimal(config.pettyCashGstRate ?? 8),
      };
    }

    const baseCur = await this.prisma.currency.findFirst({
      where: { isBase: true, isActive: true },
    });
    return {
      code: baseCur?.code.toUpperCase() || 'USD',
      symbol: baseCur?.symbol || '$',
      decimalPrecision: baseCur?.decimalPlaces || 2,
      roundingMethod: 'standard',
      operationalCurrency: 'MVR',
      operationalSymbol: 'Rf',
      pettyCashGstRate: new Decimal(8),
    };
  }

  /**
   * Resolves the exchange rate from `fromCode` -> `toCode` using active ExchangeRate master records.
   * Resolution order:
   * 1. Same currency -> 1
   * 2. Direct active ExchangeRate (most recent effectiveDate)
   * 3. Inverse active ExchangeRate (1 / rate)
   * 4. Cross-rate via USD using ExchangeRate or Currency.rateToBase
   * 5. Fallback via Currency.rateToBase ratio
   */
  async resolveRate(fromCodeRaw: string, toCodeRaw?: string): Promise<Decimal> {
    const baseInfo = await this.getSystemBaseCurrency();
    const fromCode = fromCodeRaw.toUpperCase().trim();
    const toCode = (toCodeRaw || baseInfo.code).toUpperCase().trim();

    if (fromCode === toCode) {
      return new Decimal(1);
    }

    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true },
    });
    const byCode = new Map(currencies.map((c) => [c.code.toUpperCase(), c]));
    const fromCur = byCode.get(fromCode);
    const toCur = byCode.get(toCode);

    if (fromCur && toCur) {
      const direct = await this.prisma.exchangeRate.findFirst({
        where: {
          fromCurrencyId: fromCur.id,
          toCurrencyId: toCur.id,
          isActive: true,
        },
        orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      });
      if (direct && toDecimal(direct.rate).gt(0)) {
        return toDecimal(direct.rate).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
      }

      const inverse = await this.prisma.exchangeRate.findFirst({
        where: {
          fromCurrencyId: toCur.id,
          toCurrencyId: fromCur.id,
          isActive: true,
        },
        orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      });
      if (inverse && toDecimal(inverse.rate).gt(0)) {
        return new Decimal(1).div(toDecimal(inverse.rate)).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
      }

      // Cross-rate via USD pivot if neither side is USD
      const usdCur = byCode.get('USD');
      if (usdCur && fromCode !== 'USD' && toCode !== 'USD') {
        const fromToUsd = await this.findPairOrCurrencyUsdRate(fromCur.id, usdCur.id, fromCur.rateToBase);
        const toToUsd = await this.findPairOrCurrencyUsdRate(toCur.id, usdCur.id, toCur.rateToBase);
        if (fromToUsd.gt(0) && toToUsd.gt(0)) {
          return fromToUsd.div(toToUsd).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
        }
      }

      // Fallback using stored rateToBase ratio
      const fromRateToBase = toDecimal(fromCur.rateToBase);
      const toRateToBase = toDecimal(toCur.rateToBase);
      if (fromRateToBase.gt(0) && toRateToBase.gt(0)) {
        return fromRateToBase.div(toRateToBase).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
      }
    }

    return new Decimal(1);
  }

  private async findPairOrCurrencyUsdRate(
    curId: number,
    usdId: number,
    fallbackRate: unknown,
  ): Promise<Decimal> {
    const direct = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrencyId: curId, toCurrencyId: usdId, isActive: true },
      orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
    });
    if (direct && toDecimal(direct.rate).gt(0)) {
      return toDecimal(direct.rate);
    }
    const inverse = await this.prisma.exchangeRate.findFirst({
      where: { fromCurrencyId: usdId, toCurrencyId: curId, isActive: true },
      orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
    });
    if (inverse && toDecimal(inverse.rate).gt(0)) {
      return new Decimal(1).div(toDecimal(inverse.rate));
    }
    return toDecimal(fallbackRate as string | number);
  }

  async convertToBase(
    amount: Decimal | number | string,
    fromCurrencyCode: string,
  ): Promise<{
    baseCurrency: string;
    baseSymbol: string;
    rate: Decimal;
    baseAmount: Decimal;
  }> {
    const baseInfo = await this.getSystemBaseCurrency();
    const rate = await this.resolveRate(fromCurrencyCode, baseInfo.code);
    const baseAmount = roundMoney(
      toDecimal(amount).times(rate),
      baseInfo.decimalPrecision,
      baseInfo.roundingMethod,
    );
    return {
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      rate,
      baseAmount,
    };
  }
}
