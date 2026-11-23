import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { toNumber, toPrismaDecimal, toPrismaRate } from '../common/utils/decimal.util';
import { UpdateBusinessConfigDto } from './dto/business-config.dto';

@Injectable()
export class BusinessConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private serialize(cfg: {
    id: number;
    primaryOperatingCompanyId: number | null;
    baseCurrency: string;
    baseSymbol: string;
    operationalCurrency: string;
    operationalSymbol: string;
    exchangeRateMode: string;
    fixedExchangeRateMVR: unknown;
    fixedExchangeRateEUR: unknown;
    decimalPrecision: number;
    roundingMethod: string;
    varianceTolerancePercent: unknown;
    fiscalYearStartMonth: string;
    currentFiscalYear: string;
    dailyShiftCutOffTime: string;
    periodLockEnabled: boolean;
    transitGracePeriodHours: number;
    taxRegistrationNo: string;
    defaultTGSTRate: unknown;
    pettyCashGstRate: unknown;
    serviceChargeRate: unknown;
    maxCashAdvanceVoucherBase: unknown;
    dualSignatoryRequiredBase: unknown;
    mandatoryReceiptThresholdBase: unknown;
    defaultOutletTillFloatBase: unknown;
    highVarianceAlertBase: unknown;
    iouOverdueEscalationDays: number;
    maximumIOUValidityDays: number;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currencyPosition: string;
    businessWeekDays: string[];
  }) {
    return {
      id: cfg.id,
      currency: {
        baseCurrency: cfg.baseCurrency,
        baseSymbol: cfg.baseSymbol,
        operationalCurrency: cfg.operationalCurrency,
        operationalSymbol: cfg.operationalSymbol,
        exchangeRateMode: cfg.exchangeRateMode,
        fixedExchangeRateMVR: toNumber(cfg.fixedExchangeRateMVR as string, 6),
        fixedExchangeRateEUR: toNumber(cfg.fixedExchangeRateEUR as string, 6),
        decimalPrecision: cfg.decimalPrecision,
        roundingMethod: cfg.roundingMethod,
        varianceTolerancePercent: toNumber(cfg.varianceTolerancePercent as string, 3),
      },
      fiscal: {
        primaryOperatingCompany: cfg.primaryOperatingCompanyId || 1,
        fiscalYearStartMonth: cfg.fiscalYearStartMonth,
        currentFiscalYear: cfg.currentFiscalYear,
        dailyShiftCutOffTime: cfg.dailyShiftCutOffTime,
        periodLockEnabled: cfg.periodLockEnabled,
        transitGracePeriodHours: cfg.transitGracePeriodHours,
        taxRegistrationNo: cfg.taxRegistrationNo,
        defaultTGSTRate: toNumber(cfg.defaultTGSTRate as string, 2),
        pettyCashGstRate: toNumber(cfg.pettyCashGstRate as string, 2),
        serviceChargeRate: toNumber(cfg.serviceChargeRate as string, 2),
      },
      cashLimits: {
        maxCashAdvanceVoucherUSD: toNumber(cfg.maxCashAdvanceVoucherBase as string, 2),
        dualSignatoryRequiredUSD: toNumber(cfg.dualSignatoryRequiredBase as string, 2),
        mandatoryReceiptThresholdUSD: toNumber(cfg.mandatoryReceiptThresholdBase as string, 2),
        defaultOutletTillFloatUSD: toNumber(cfg.defaultOutletTillFloatBase as string, 2),
        highVarianceAlertUSD: toNumber(cfg.highVarianceAlertBase as string, 2),
        iouOverdueEscalationDays: cfg.iouOverdueEscalationDays,
        maximumIOUValidityDays: cfg.maximumIOUValidityDays,
      },
      regional: {
        timezone: cfg.timezone,
        dateFormat: cfg.dateFormat,
        timeFormat: cfg.timeFormat,
        currencyPosition: cfg.currencyPosition,
        businessWeekDays: cfg.businessWeekDays,
      },
    };
  }

  async getConfig() {
    let config = await this.prisma.businessConfig.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!config) {
      config = await this.prisma.businessConfig.create({ data: {} });
    }
    return this.serialize(config);
  }

  async updateConfig(actor: AuthenticatedUser, dto: UpdateBusinessConfigDto) {
    let existing = await this.prisma.businessConfig.findFirst({ orderBy: { id: 'asc' } });
    if (!existing) {
      existing = await this.prisma.businessConfig.create({ data: {} });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let resolvedBaseCurrency = existing.baseCurrency;
      let resolvedBaseSymbol = existing.baseSymbol;

      // System-wide base currency change: validate against Currency master & sync isBase flag
      if (dto.currency?.baseCurrency) {
        const requestedCode = dto.currency.baseCurrency.trim().toUpperCase();
        const curRecord = await tx.currency.findUnique({
          where: { code: requestedCode },
        });
        if (!curRecord || !curRecord.isActive) {
          throw new BadRequestException(
            `Base currency "${requestedCode}" must exist and be Active in the Currency Master catalog.`,
          );
        }
        resolvedBaseCurrency = curRecord.code;
        resolvedBaseSymbol = dto.currency.baseSymbol || curRecord.symbol;

        await tx.currency.updateMany({ data: { isBase: false } });
        await tx.currency.update({
          where: { id: curRecord.id },
          data: { isBase: true, rateToBase: toPrismaRate(1) },
        });
        await tx.company.updateMany({
          data: { baseCurrencyCode: curRecord.code },
        });
      }

      let resolvedOpCurrency = existing.operationalCurrency;
      let resolvedOpSymbol = existing.operationalSymbol;
      if (dto.currency?.operationalCurrency) {
        const opCode = dto.currency.operationalCurrency.trim().toUpperCase();
        const opCur = await tx.currency.findUnique({ where: { code: opCode } });
        resolvedOpCurrency = opCode;
        resolvedOpSymbol = dto.currency.operationalSymbol || opCur?.symbol || opCode;
      }

      let primaryCompanyId = existing.primaryOperatingCompanyId;
      if (dto.fiscal?.primaryOperatingCompany !== undefined) {
        const raw = String(dto.fiscal.primaryOperatingCompany);
        const parsed = /(\d+)$/.exec(raw);
        if (parsed) primaryCompanyId = Number(parsed[1]);
      }

      const next = await tx.businessConfig.update({
        where: { id: existing.id },
        data: {
          primaryOperatingCompanyId: primaryCompanyId,
          baseCurrency: resolvedBaseCurrency,
          baseSymbol: resolvedBaseSymbol,
          operationalCurrency: resolvedOpCurrency,
          operationalSymbol: resolvedOpSymbol,
          ...(dto.currency?.exchangeRateMode !== undefined
            ? { exchangeRateMode: dto.currency.exchangeRateMode }
            : {}),
          ...(dto.currency?.fixedExchangeRateMVR !== undefined
            ? { fixedExchangeRateMVR: toPrismaRate(dto.currency.fixedExchangeRateMVR) }
            : {}),
          ...(dto.currency?.fixedExchangeRateEUR !== undefined
            ? { fixedExchangeRateEUR: toPrismaRate(dto.currency.fixedExchangeRateEUR) }
            : {}),
          ...(dto.currency?.decimalPrecision !== undefined
            ? { decimalPrecision: Number(dto.currency.decimalPrecision) }
            : {}),
          ...(dto.currency?.roundingMethod !== undefined
            ? { roundingMethod: dto.currency.roundingMethod }
            : {}),
          ...(dto.currency?.varianceTolerancePercent !== undefined
            ? { varianceTolerancePercent: toPrismaDecimal(dto.currency.varianceTolerancePercent, 3) }
            : {}),
          ...(dto.fiscal?.fiscalYearStartMonth !== undefined
            ? { fiscalYearStartMonth: dto.fiscal.fiscalYearStartMonth }
            : {}),
          ...(dto.fiscal?.currentFiscalYear !== undefined
            ? { currentFiscalYear: dto.fiscal.currentFiscalYear }
            : {}),
          ...(dto.fiscal?.dailyShiftCutOffTime !== undefined
            ? { dailyShiftCutOffTime: dto.fiscal.dailyShiftCutOffTime }
            : {}),
          ...(dto.fiscal?.periodLockEnabled !== undefined
            ? { periodLockEnabled: dto.fiscal.periodLockEnabled }
            : {}),
          ...(dto.fiscal?.transitGracePeriodHours !== undefined
            ? { transitGracePeriodHours: Number(dto.fiscal.transitGracePeriodHours) }
            : {}),
          ...(dto.fiscal?.taxRegistrationNo !== undefined
            ? { taxRegistrationNo: dto.fiscal.taxRegistrationNo }
            : {}),
          ...(dto.fiscal?.defaultTGSTRate !== undefined
            ? { defaultTGSTRate: toPrismaDecimal(dto.fiscal.defaultTGSTRate, 2) }
            : {}),
          ...(dto.fiscal?.pettyCashGstRate !== undefined
            ? { pettyCashGstRate: toPrismaDecimal(dto.fiscal.pettyCashGstRate, 2) }
            : {}),
          ...(dto.fiscal?.serviceChargeRate !== undefined
            ? { serviceChargeRate: toPrismaDecimal(dto.fiscal.serviceChargeRate, 2) }
            : {}),
          ...(dto.cashLimits?.maxCashAdvanceVoucherUSD !== undefined
            ? { maxCashAdvanceVoucherBase: toPrismaDecimal(dto.cashLimits.maxCashAdvanceVoucherUSD) }
            : {}),
          ...(dto.cashLimits?.dualSignatoryRequiredUSD !== undefined
            ? { dualSignatoryRequiredBase: toPrismaDecimal(dto.cashLimits.dualSignatoryRequiredUSD) }
            : {}),
          ...(dto.cashLimits?.mandatoryReceiptThresholdUSD !== undefined
            ? { mandatoryReceiptThresholdBase: toPrismaDecimal(dto.cashLimits.mandatoryReceiptThresholdUSD) }
            : {}),
          ...(dto.cashLimits?.defaultOutletTillFloatUSD !== undefined
            ? { defaultOutletTillFloatBase: toPrismaDecimal(dto.cashLimits.defaultOutletTillFloatUSD) }
            : {}),
          ...(dto.cashLimits?.highVarianceAlertUSD !== undefined
            ? { highVarianceAlertBase: toPrismaDecimal(dto.cashLimits.highVarianceAlertUSD) }
            : {}),
          ...(dto.cashLimits?.iouOverdueEscalationDays !== undefined
            ? { iouOverdueEscalationDays: Number(dto.cashLimits.iouOverdueEscalationDays) }
            : {}),
          ...(dto.cashLimits?.maximumIOUValidityDays !== undefined
            ? { maximumIOUValidityDays: Number(dto.cashLimits.maximumIOUValidityDays) }
            : {}),
          ...(dto.regional?.timezone !== undefined ? { timezone: dto.regional.timezone } : {}),
          ...(dto.regional?.dateFormat !== undefined ? { dateFormat: dto.regional.dateFormat } : {}),
          ...(dto.regional?.timeFormat !== undefined ? { timeFormat: dto.regional.timeFormat } : {}),
          ...(dto.regional?.currencyPosition !== undefined
            ? { currencyPosition: dto.regional.currencyPosition }
            : {}),
          ...(dto.regional?.businessWeekDays !== undefined
            ? { businessWeekDays: dto.regional.businessWeekDays }
            : {}),
        },
      });

      await this.auditService.log({
        entityType: 'business_config',
        entityId: next.id,
        action: 'UPDATE',
        step: `Updated Business Configuration (Base Currency: ${next.baseCurrency})`,
        performedById: actor.id,
        performedByName: actor.fullName,
        metadata: { baseCurrency: next.baseCurrency, operationalCurrency: next.operationalCurrency },
        tx,
      });

      return next;
    });

    return this.serialize(updated);
  }
}
