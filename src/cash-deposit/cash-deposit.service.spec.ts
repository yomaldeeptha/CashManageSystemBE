import { BadRequestException, ForbiddenException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { CashDepositService } from './cash-deposit.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('CashDepositService', () => {
  const outletCashier: AuthenticatedUser = {
    id: 2,
    username: 'ashujau',
    fullName: 'Ahmed Shujau',
    email: 'ashujau@brewfeast.mv',
    empNo: 'CSH-104',
    designation: 'Head Cashier',
    roleId: 5,
    roleCode: 'OUT-CSH',
    roleName: 'Outlet Cashier',
    employeeId: 1,
    companyIds: [1],
    branchIds: [1],
    outletIds: [1],
    departmentIds: [1],
    permissions: {
      cashDeposit: { read: true, create: true, update: true, delete: false, approve: false, unblock: false },
    },
    screenAuthorizations: {},
  };

  const makeScopeMocks = () => ({
    company: {
      findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Brew & Feast Maldives Pvt Ltd' }),
    },
    branch: {
      findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]),
      findUnique: jest.fn().mockResolvedValue({ id: 1, companyId: 1, name: 'Velana Int. Airport' }),
      findFirst: jest.fn().mockResolvedValue({ id: 1, companyId: 1 }),
    },
    outlet: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, branchId: 1 },
        { id: 2, branchId: 1 },
      ]),
      findUnique: jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve({
          id: where.id,
          branchId: 1,
          name: where.id === 1 ? 'Male Airport Outlet' : 'Hulhumale Grand Cafe',
          branch: { id: 1, companyId: 1 },
        }),
      ),
    },
  });

  it('rejects deposit creation when user requests an unauthorized outlet (403 scope boundary)', async () => {
    const prisma = {
      ...makeScopeMocks(),
    } as unknown as PrismaService;

    const service = new CashDepositService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      { initiateApproval: jest.fn() } as unknown as ApprovalsService,
      {} as ExchangeRateResolverService,
      {} as NumberSeriesGeneratorService,
    );

    await expect(
      service.createDeposit(outletCashier, {
        docDate: '2026-10-20',
        collectionDate: '2026-10-20',
        collectionTime: '10:00 AM',
        companyId: 1,
        branchId: 1,
        outletId: 2, // NOT in outletCashier.outletIds [1]
        cashierId: 1,
        cashCollectorId: 2,
        paymentTypeId: 1,
        envelopeNo: 'ENV-999',
        currencies: [{ currency: 'USD', amount: 100 }],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects cashier settlement when transferAmount exceeds server-computed closing balance', async () => {
    const prisma = {
      ...makeScopeMocks(),
      currency: { findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }) },
    } as unknown as PrismaService;

    const fxResolver = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }),
      convertToBase: jest.fn(),
    } as unknown as ExchangeRateResolverService;

    const service = new CashDepositService(
      prisma,
      { log: jest.fn() } as unknown as AuditService,
      {} as ApprovalsService,
      fxResolver,
      {} as NumberSeriesGeneratorService,
    );

    // opening 500 + collection 300 - cashOut 200 = closing 600; transfer 750 > 600 must fail
    await expect(
      service.createSettlement(outletCashier, {
        docDate: '2026-10-20',
        fromDate: '2026-10-19',
        toDate: '2026-10-20',
        companyId: 1,
        branchId: 1,
        outletId: 1,
        fromCashier: 'Ahmed Shujau',
        toCashier: 'Fathimath Reema',
        lines: [
          {
            currency: 'USD',
            openingBalance: 500,
            collection: 300,
            cashOut: 200,
            transferAmount: 750,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates balanced bank deposit GL entries and marks linked cash deposits Posted', async () => {
    const createdBankDeposit = {
      id: 55,
      docNo: 'BD-2026-0001',
      docDate: new Date('2026-10-20T00:00:00Z'),
      fromDate: new Date('2026-10-19T00:00:00Z'),
      toDate: new Date('2026-10-20T00:00:00Z'),
      depositDate: new Date('2026-10-20T00:00:00Z'),
      companyId: 1,
      branchId: 1,
      outletId: 1,
      depositBankRefNo: 'BML-REF-777',
      depositAccountName: 'BML Corporate USD #7730',
      processFlowDecision: 'bank',
      totalCollectionAmount: new Prisma.Decimal(2500),
      settledAmount: new Prisma.Decimal(2500),
      balance: new Prisma.Decimal(0),
      glAccounting: [
        { account: 'Common Bank Clearing Account #1015-00', type: 'Credit (-)', amount: 2500 },
        { account: 'BML Corporate USD #7730 #1020-01', type: 'Debit (+)', amount: 2500 },
      ],
      status: 'Completed Deposit',
      remark: '',
      company: { name: 'Brew & Feast Maldives Pvt Ltd' },
      branch: { name: 'Velana Int. Airport' },
      outlet: { name: 'Male Airport Outlet' },
      currency: { code: 'USD' },
      collectionItems: [],
    };

    const txMock = {
      outletBankDeposit: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdBankDeposit),
      },
      outletBankDepositItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      cashDeposit: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      bankReconciliation: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };

    const prisma = {
      ...makeScopeMocks(),
      currency: { findUnique: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }) },
      cashDeposit: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10,
            docNo: 'CCD-2026-0042',
            collectionDate: new Date('2026-10-20T00:00:00Z'),
            totalBaseAmount: new Prisma.Decimal(2500),
          },
        ]),
      },
      outletBankDeposit: {
        findMany: jest.fn().mockResolvedValue([createdBankDeposit]),
      },
      $transaction: jest.fn(async (cb: (tx: typeof txMock) => Promise<number>) => cb(txMock)),
    } as unknown as PrismaService;

    const fxResolver = {
      getSystemBaseCurrency: jest.fn().mockResolvedValue({ id: 1, code: 'USD', symbol: '$' }),
      convertToBase: jest.fn().mockResolvedValue({ rate: new Decimal(1), baseAmount: new Decimal(2500) }),
    } as unknown as ExchangeRateResolverService;

    const numberSeries = {
      allocateNextNumber: jest.fn().mockResolvedValue('BD-2026-0001'),
    } as unknown as NumberSeriesGeneratorService;

    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

    const service = new CashDepositService(
      prisma,
      audit,
      {} as ApprovalsService,
      fxResolver,
      numberSeries,
    );

    const res = await service.createBankDeposit(outletCashier, {
      docDate: '2026-10-20',
      companyId: 1,
      branchId: 1,
      outletId: 1,
      depositBankRefNo: 'BML-REF-777',
      currency: 'USD',
      depositAccount: 'BML Corporate USD #7730',
      processFlowDecision: 'bank',
      cashDepositIds: [10],
    });

    expect(txMock.cashDeposit.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: { status: 'Posted' },
    });
    expect(txMock.bankReconciliation.create).toHaveBeenCalled();
    expect(res?.status).toBe('Completed Deposit');
    expect(res?.totalCollectionAmount).toBe(2500);
    expect(Array.isArray(res?.glAccounting)).toBe(true);
    const gl = res?.glAccounting as Array<{ type: string; amount: number }>;
    const credits = gl.filter((g) => g.type.includes('Credit')).reduce((s, g) => s + g.amount, 0);
    const debits = gl.filter((g) => g.type.includes('Debit')).reduce((s, g) => s + g.amount, 0);
    expect(credits).toBe(debits);
  });
});
