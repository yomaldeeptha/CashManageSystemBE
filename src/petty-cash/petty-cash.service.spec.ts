import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PettyCashService } from './petty-cash.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('PettyCashService', () => {
  const cashierUser: AuthenticatedUser = {
    id: 1,
    username: 'ashujau',
    fullName: 'Ahmed Shujau',
    email: 'ashujau@brewfeast.mv',
    empNo: 'CSH-104',
    designation: 'Outlet Cashier',
    roleId: 5,
    roleCode: 'OUT-CSH',
    roleName: 'Outlet Cashier',
    employeeId: 1,
    companyIds: [1],
    branchIds: [1],
    outletIds: [1],
    departmentIds: [1],
    permissions: { pettyCash: { read: true, create: true, update: true, delete: false, approve: false, unblock: false } },
    screenAuthorizations: {},
  };

  const managerUser: AuthenticatedUser = {
    ...cashierUser,
    id: 5,
    roleCode: 'FIN-MGR',
    roleName: 'Finance Manager',
    permissions: { pettyCash: { read: true, create: true, update: true, delete: true, approve: true, unblock: true } },
  };

  it('masks hidden approvedAmount for non-approver cashier roles and exposes it for Finance Managers', async () => {
    const advanceRow = {
      id: 1,
      docNo: 'PCA-2026-0044',
      docDate: new Date('2026-10-18T00:00:00Z'),
      requestId: 1,
      requestRefLabel: 'REQ-014',
      companyId: 1,
      branchId: 1,
      outletId: 1,
      departmentName: 'Maintenance',
      expenseCategory: 'Repairs',
      requesterName: 'Ibrahim Rasheed',
      employeeNo: 'EMP-215',
      requestedAmount: new Prisma.Decimal(420),
      approvedAmount: new Prisma.Decimal(400),
      amountPaid: new Prisma.Decimal(400),
      settledAmount: new Prisma.Decimal(0),
      refundAmount: new Prisma.Decimal(0),
      refundDate: null,
      balanceDue: new Prisma.Decimal(400),
      paymentType: 'Cash Handover',
      bankOrCashAccount: 'Vault Float',
      exRate: new Prisma.Decimal(1),
      baseCurrencyCode: 'USD',
      baseAmountPaid: new Prisma.Decimal(400),
      amountInWords: '',
      narration: '',
      settledStatus: 'Unsettled',
      status: 'Paid',
      company: { name: 'Brew & Feast' },
      branch: { name: 'Airport' },
      outlet: { name: 'Male Airport' },
      currency: { code: 'USD' },
      request: null,
    };

    const prisma = {
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]) },
      outlet: { findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]) },
      pettyCashAdvance: { findMany: jest.fn().mockResolvedValue([advanceRow]) },
    } as unknown as PrismaService;

    const service = new PettyCashService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as NotificationsService,
      {} as ExchangeRateResolverService,
      {} as NumberSeriesGeneratorService,
    );

    const cashierResult = await service.listAdvances(cashierUser);
    expect(cashierResult[0].approvedAmount).toBeNull();

    const managerResult = await service.listAdvances(managerUser);
    expect(managerResult[0].approvedAmount).toBe(400);
  });

  it('computes accurate IOU aging buckets strictly from open pending balances', async () => {
    const now = Date.now();
    const daysAgo = (n: number) => new Date(now - n * 86400000);
    const prisma = {
      pettyCashIOU: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1, docId: 'PCA-CLOSED', docDate: daysAgo(150),
            employeeName: 'Closed Staff', employeeNo: 'EMP-1', departmentName: 'Ops', purpose: 'Done',
            baseCurrencyCode: 'USD', advAmount: new Prisma.Decimal(500), settledAmount: new Prisma.Decimal(500),
            returnAmount: new Prisma.Decimal(0), settledVfApproved: 'Verified', status: 'Active',
          },
          {
            id: 2, docId: 'PCA-45D', docDate: daysAgo(45),
            employeeName: 'Overdue Staff', employeeNo: 'EMP-2', departmentName: 'Kitchen', purpose: 'Pending',
            baseCurrencyCode: 'USD', advAmount: new Prisma.Decimal(600), settledAmount: new Prisma.Decimal(200),
            returnAmount: new Prisma.Decimal(50), settledVfApproved: 'Pending', status: 'Warning',
          },
        ]),
      },
    } as unknown as PrismaService;

    const fx = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ code: 'USD', symbol: '$' }),
    } as unknown as ExchangeRateResolverService;

    const service = new PettyCashService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as NotificationsService,
      fx,
      {} as NumberSeriesGeneratorService,
    );

    const aging = await service.getIouAging();
    // Closed item must NOT pollute >120 bucket
    expect(aging[0].pending).toBe(0);
    expect(aging[0].bucket120Plus).toBe(0);
    expect(aging[0].status).toBe('Fully Closed');
    // 45-day open item: 600 - 200 - 50 = 350 in 30-60 bucket only
    expect(aging[1].pending).toBe(350);
    expect(aging[1].bucket30_60).toBe(350);
    expect(aging[1].bucket0_30).toBe(0);
    expect(aging[1].bucket60_90).toBe(0);
  });

  it('rejects multi-disbursement petty cash advances that exceed the approved request cap', async () => {
    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Brew & Feast' }) },
      branch: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1, companyId: 1 }),
      },
      outlet: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1, branchId: 1, branch: { id: 1, companyId: 1 } }),
      },
      currency: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, code: 'USD' }),
        findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'USD' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          pettyCashRequest: {
            findUnique: jest.fn().mockResolvedValue({
              id: 10,
              requestId: 'REQ-010',
              status: 'Paid',
              requestAmount: new Prisma.Decimal(500),
              approvedAmount: new Prisma.Decimal(500),
              paidAmount: new Prisma.Decimal(400),
            }),
          },
        }),
      ),
    } as unknown as PrismaService;

    const fx = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ code: 'USD', symbol: '$' }),
      convertToBase: jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rate: new Prisma.Decimal(1),
        baseAmount: new Prisma.Decimal(150),
      }),
    } as unknown as ExchangeRateResolverService;

    const service = new PettyCashService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as NotificationsService,
      fx,
      {} as NumberSeriesGeneratorService,
    );

    await expect(
      service.createAdvance(cashierUser, {
        docDate: '2026-10-19',
        requestId: 10,
        companyId: 1,
        branchId: 1,
        outletId: 1,
        amountPaid: 150,
        currency: 'USD',
        paymentType: 'Cash Handover',
        bankOrCash: 'Vault Float',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces Maker != Checker on bill submission verification', async () => {
    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Brew & Feast' }) },
      branch: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1, companyId: 1 }),
      },
      outlet: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1, branchId: 1, branch: { id: 1, companyId: 1 } }),
      },
      pettyCashBillSubmission: {
        findUnique: jest.fn().mockResolvedValue({
          id: 55,
          docNo: 'BSUB-2026-0055',
          companyId: 1,
          branchId: 1,
          outletId: 1,
          status: 'Pending Verification',
          createUserId: managerUser.id,
          createdById: managerUser.id,
          totalBillAmount: new Prisma.Decimal(100),
        }),
      },
    } as unknown as PrismaService;

    const service = new PettyCashService(
      prisma,
      {} as AuditService,
      {} as ApprovalsService,
      {} as NotificationsService,
      {} as ExchangeRateResolverService,
      {} as NumberSeriesGeneratorService,
    );

    await expect(
      service.verifyBillSubmission(managerUser, 55, { decision: 'approve' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
