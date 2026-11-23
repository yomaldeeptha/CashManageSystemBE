import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SalesReconService } from './sales-recon.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('SalesReconService', () => {
  const adminUser: AuthenticatedUser = {
    id: 6,
    username: 'superadmin',
    fullName: 'Admin',
    email: 'admin@brewfeast.mv',
    empNo: 'ADM-001',
    designation: 'Admin',
    roleId: 1,
    roleCode: 'ADM',
    roleName: 'System Administrator',
    employeeId: null,
    companyIds: [],
    branchIds: [],
    outletIds: [],
    departmentIds: [],
    permissions: {},
    screenAuthorizations: {},
  };

  it('prevents editing a period-locked Sales Reconciliation until unblocked', async () => {
    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'BF' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      branch: { findUnique: jest.fn().mockResolvedValue({ id: 1, companyId: 1, name: 'BR1' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      outlet: { findUnique: jest.fn().mockResolvedValue({ id: 1, branchId: 1, name: 'OUT1' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      salesReconciliation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5,
          docNo: 'SREC-2026-0042',
          isPeriodLocked: true,
          status: 'Locked',
        }),
      },
    } as unknown as PrismaService;

    const service = new SalesReconService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as ExchangeRateResolverService,
      {} as NumberSeriesGeneratorService,
    );

    await expect(
      service.save(
        adminUser,
        { companyId: 1, branchId: 1, outletId: 1, posGrossSales: 5000, returns: 0 },
        5,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('generates a strictly balanced ERP G/L journal voucher (Debits === Credits) even with shortage variance', async () => {
    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'BF' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      branch: { findUnique: jest.fn().mockResolvedValue({ id: 1, companyId: 1, name: 'BR1' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      outlet: { findUnique: jest.fn().mockResolvedValue({ id: 1, branchId: 1, name: 'OUT1' }), findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      salesReconciliation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          docNo: 'SREC-2026-0041',
          docDate: new Date('2026-10-18T00:00:00Z'),
          companyId: 1,
          branchId: 1,
          outletId: 1,
          shiftId: 1,
          cashierId: 1,
          shiftStatus: 'Closed',
          baseCurrencyCode: 'USD',
          posGrossSales: new Prisma.Decimal(6150),
          returnsAmount: new Prisma.Decimal(120),
          netSales: new Prisma.Decimal(6030),
          totalCollectionBase: new Prisma.Decimal(5909.5),
          varianceAmount: new Prisma.Decimal(-120.5),
          varianceStatus: 'Shortage Exception (-$120.50)',
          isPeriodLocked: false,
          status: 'In Review',
          company: { name: 'BF' },
          branch: { name: 'BR1' },
          outlet: { name: 'OUT1' },
          shift: { name: 'Shift 2' },
          cashier: { name: 'Ibrahim' },
          linkedCashDeposit: null,
          lines: [
            {
              id: 1, shiftName: 'Shift 2', cashierName: 'Ibrahim', shiftTotalSales: new Prisma.Decimal(6150),
              bankOrSafe: 'Vault', paymentTypeName: 'Cash', subTypeName: 'Cash',
              currency: { code: 'USD' }, amount: new Prisma.Decimal(2100), exRate: new Prisma.Decimal(1), baseAmount: new Prisma.Decimal(2100),
            },
            {
              id: 2, shiftName: 'Shift 2', cashierName: 'Ibrahim', shiftTotalSales: new Prisma.Decimal(6150),
              bankOrSafe: 'BML', paymentTypeName: 'Card Terminal 01', subTypeName: 'Visa',
              currency: { code: 'USD' }, amount: new Prisma.Decimal(3809.5), exRate: new Prisma.Decimal(1), baseAmount: new Prisma.Decimal(3809.5),
            },
          ],
        }),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      glAccount: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const service = new SalesReconService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as ExchangeRateResolverService,
      {} as NumberSeriesGeneratorService,
    );

    const report = await service.getFinalReport(adminUser, 2);
    expect(report.journalVoucher.balanced).toBe(true);
    expect(report.journalVoucher.totalDebit).toBe(6030);
    expect(report.journalVoucher.totalCredit).toBe(6030);
  });
});
