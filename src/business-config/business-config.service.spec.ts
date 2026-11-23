import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BusinessConfigService } from './business-config.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('BusinessConfigService (System-Wide Base Currency Setup)', () => {
  const adminUser = {
    id: 6,
    username: 'superadmin',
    fullName: 'Pramuditha Bandara',
    roleCode: 'ADM',
    roleName: 'System Administrator',
  } as AuthenticatedUser;

  it('updates system base currency atomically and syncs Currency.isBase + Company.baseCurrencyCode', async () => {
    const existingCfg = {
      id: 1,
      primaryOperatingCompanyId: 1,
      baseCurrency: 'USD',
      baseSymbol: '$',
      operationalCurrency: 'MVR',
      operationalSymbol: 'Rf',
      exchangeRateMode: 'Fixed',
      fixedExchangeRateMVR: new Prisma.Decimal(15.42),
      fixedExchangeRateEUR: new Prisma.Decimal(1.09),
      decimalPrecision: 2,
      roundingMethod: 'standard',
      varianceTolerancePercent: new Prisma.Decimal(0.5),
      fiscalYearStartMonth: 'January',
      currentFiscalYear: '2026',
      dailyShiftCutOffTime: '23:59',
      periodLockEnabled: true,
      transitGracePeriodHours: 48,
      taxRegistrationNo: 'TIN-994012',
      defaultTGSTRate: new Prisma.Decimal(16),
      pettyCashGstRate: new Prisma.Decimal(8),
      serviceChargeRate: new Prisma.Decimal(10),
      maxCashAdvanceVoucherBase: new Prisma.Decimal(500),
      dualSignatoryRequiredBase: new Prisma.Decimal(1000),
      mandatoryReceiptThresholdBase: new Prisma.Decimal(25),
      defaultOutletTillFloatBase: new Prisma.Decimal(2000),
      highVarianceAlertBase: new Prisma.Decimal(100),
      iouOverdueEscalationDays: 14,
      maximumIOUValidityDays: 30,
      timezone: 'Indian/Maldives (UTC+5)',
      dateFormat: 'DD-MMM-YYYY',
      timeFormat: '12-hour',
      currencyPosition: 'prefix',
      businessWeekDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    };

    const tx = {
      currency: {
        findUnique: jest.fn().mockResolvedValue({ id: 5, code: 'LKR', symbol: 'Rs', isActive: true }),
        findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'USD', isBase: true }]),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 5, code: 'LKR', symbol: 'Rs', isBase: true }),
      },
      company: { updateMany: jest.fn() },
      businessConfig: {
        update: jest.fn().mockResolvedValue({ ...existingCfg, baseCurrency: 'LKR', baseSymbol: 'Rs' }),
      },
    };

    const prisma = {
      businessConfig: { findFirst: jest.fn().mockResolvedValue(existingCfg) },
      $transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
    const audit = { log: jest.fn() } as unknown as AuditService;

    const service = new BusinessConfigService(prisma, audit);
    const result = await service.updateConfig(adminUser, {
      currency: { baseCurrency: 'LKR' },
    });

    expect(result.currency.baseCurrency).toBe('LKR');
    expect(result.currency.baseSymbol).toBe('Rs');
    expect(tx.currency.updateMany).toHaveBeenCalledWith({
      data: { isBase: false, updateUserId: adminUser.id },
    });
    expect(tx.currency.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ isBase: true, updateUserId: adminUser.id }),
      }),
    );
    expect(tx.company.updateMany).toHaveBeenCalledWith({
      data: { baseCurrencyCode: 'LKR', updateUserId: adminUser.id },
    });
  });

  it('rejects switching base currency to an unknown or inactive currency', async () => {
    const tx = {
      currency: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      businessConfig: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseCurrency: 'USD', baseSymbol: '$' }) },
      $transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;
    const service = new BusinessConfigService(prisma, { log: jest.fn() } as unknown as AuditService);

    await expect(
      service.updateConfig(adminUser, { currency: { baseCurrency: 'XYZ' } }),
    ).rejects.toThrow(BadRequestException);
  });
});
