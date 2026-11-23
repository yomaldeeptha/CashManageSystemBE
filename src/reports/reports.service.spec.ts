import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('ReportsService', () => {
  const adminUser: AuthenticatedUser = {
    id: 6,
    username: 'superadmin',
    fullName: 'Pramuditha Bandara',
    email: 'admin@brewfeast.mv',
    empNo: 'ADM-001',
    designation: 'System Administrator',
    roleId: 1,
    roleCode: 'SYS-ADM',
    roleName: 'System Administrator',
    employeeId: null,
    companyIds: [],
    branchIds: [],
    outletIds: [],
    departmentIds: [],
    permissions: {
      reports: { read: true, create: true, update: true, delete: true, approve: true, unblock: true },
    },
    screenAuthorizations: {},
  };

  it('reconciles RPT-001 Cash & Banking totals, compliance %, and returns array currencies for RightDrawer safety', async () => {
    const prisma = {
      company: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]) },
      outlet: { findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]) },
      cashDeposit: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            docNo: 'CCD-2026-0041',
            collectionDate: new Date('2026-10-19T00:00:00Z'),
            collectionTime: '09:30 AM',
            baseCurrencyCode: 'USD',
            totalBaseAmount: new Prisma.Decimal(3000),
            status: 'Approved',
            envelopeNo: 'ENV-1',
            outlet: { name: 'Male Airport Outlet' },
            branch: { name: 'Velana Int. Airport' },
            cashier: { name: 'Ahmed Shujau' },
            cashCollector: { name: 'Mohamed Latheef' },
            currencies: [
              {
                currency: { code: 'USD' },
                amount: new Prisma.Decimal(3000),
                exRate: new Prisma.Decimal(1),
                baseAmount: new Prisma.Decimal(3000),
              },
            ],
            bankDepositItems: [
              {
                bankDeposit: {
                  depositAccountName: 'BML Corporate USD',
                  depositBankRefNo: 'BML-1001',
                },
              },
            ],
          },
          {
            id: 2,
            docNo: 'CCD-2026-0042',
            collectionDate: new Date('2026-10-20T00:00:00Z'),
            collectionTime: '11:00 AM',
            baseCurrencyCode: 'USD',
            totalBaseAmount: new Prisma.Decimal(1000),
            status: 'Submitted',
            envelopeNo: 'ENV-2',
            outlet: { name: 'Male Airport Outlet' },
            branch: { name: 'Velana Int. Airport' },
            cashier: { name: 'Ahmed Shujau' },
            cashCollector: { name: 'Mohamed Latheef' },
            currencies: [
              {
                currency: { code: 'MVR' },
                amount: new Prisma.Decimal(15420),
                exRate: new Prisma.Decimal(0.06485),
                baseAmount: new Prisma.Decimal(1000),
              },
            ],
            bankDepositItems: [],
          },
        ]),
      },
    } as unknown as PrismaService;

    const fx = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }),
    } as unknown as ExchangeRateResolverService;

    const service = new ReportsService(prisma, fx);
    const report = await service.getCashBankingReport(adminUser, { dateRange: 'all' });

    expect(report.reportCode).toBe('RPT-001');
    expect(report.kpis.totalCollections).toBe(4000);
    expect(report.kpis.bankedTotal).toBe(3000);
    expect(report.kpis.inVaultTotal).toBe(1000);
    expect(report.kpis.bankingCompliancePct).toBe(75);
    expect(Array.isArray(report.rows[0].currencies)).toBe(true);
    expect(report.rows[0].currencies[0].currency).toBe('USD');
  });

  it('calculates RPT-002 Sales Tender breakdown and flags variances accurately', async () => {
    const prisma = {
      company: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]) },
      outlet: { findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]) },
      salesReconciliation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            docNo: 'REC-2026-001',
            docDate: new Date('2026-10-20T00:00:00Z'),
            posGrossSales: new Prisma.Decimal(5000),
            returnsAmount: new Prisma.Decimal(100),
            netSales: new Prisma.Decimal(4900),
            totalCollectionBase: new Prisma.Decimal(4850),
            varianceAmount: new Prisma.Decimal(-50),
            isPeriodLocked: false,
            status: 'Exception',
            approverName: null,
            outlet: { name: 'Male Airport Outlet' },
            shift: { name: 'Morning Shift' },
            cashier: { name: 'Ahmed Shujau' },
            lines: [
              { paymentTypeName: 'Cash', subTypeName: 'USD Cash', baseAmount: new Prisma.Decimal(2000) },
              { paymentTypeName: 'Card', subTypeName: 'BML Visa Terminal', baseAmount: new Prisma.Decimal(2000) },
              { paymentTypeName: 'Online', subTypeName: 'Amex Transfer', baseAmount: new Prisma.Decimal(850) },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;

    const fx = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }),
    } as unknown as ExchangeRateResolverService;

    const service = new ReportsService(prisma, fx);
    const report = await service.getSalesTenderReport(adminUser);

    expect(report.kpis.totalPosGross).toBe(5000);
    expect(report.kpis.totalCash).toBe(2000);
    expect(report.kpis.totalCardOnline).toBe(2850);
    expect(report.kpis.netVariance).toBe(-50);
    expect(report.kpis.exceptionCount).toBe(1);
    expect(report.rows[0].hasException).toBe(true);
  });
});
