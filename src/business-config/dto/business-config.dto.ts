import { IsObject, IsOptional } from 'class-validator';

export class UpdateBusinessConfigDto {
  @IsOptional()
  @IsObject()
  currency?: {
    baseCurrency?: string;
    baseSymbol?: string;
    operationalCurrency?: string;
    operationalSymbol?: string;
    exchangeRateMode?: string;
    fixedExchangeRateMVR?: number;
    fixedExchangeRateEUR?: number;
    decimalPrecision?: number;
    roundingMethod?: string;
    varianceTolerancePercent?: number;
  };

  @IsOptional()
  @IsObject()
  fiscal?: {
    primaryOperatingCompany?: number | string;
    fiscalYearStartMonth?: string;
    currentFiscalYear?: string;
    dailyShiftCutOffTime?: string;
    periodLockEnabled?: boolean;
    transitGracePeriodHours?: number;
    taxRegistrationNo?: string;
    defaultTGSTRate?: number;
    pettyCashGstRate?: number;
    serviceChargeRate?: number;
  };

  @IsOptional()
  @IsObject()
  cashLimits?: {
    maxCashAdvanceVoucherUSD?: number;
    dualSignatoryRequiredUSD?: number;
    mandatoryReceiptThresholdUSD?: number;
    defaultOutletTillFloatUSD?: number;
    highVarianceAlertUSD?: number;
    iouOverdueEscalationDays?: number;
    maximumIOUValidityDays?: number;
  };

  @IsOptional()
  @IsObject()
  regional?: {
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    currencyPosition?: string;
    businessWeekDays?: string[];
  };
}
