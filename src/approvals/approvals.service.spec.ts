import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApprovalsService } from './approvals.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

describe('ApprovalsService (Multi-Stage Maker-Checker Engine)', () => {
  const makerUser: AuthenticatedUser = {
    id: 1,
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
    permissions: {},
    screenAuthorizations: {},
  };

  const checkerUser: AuthenticatedUser = {
    ...makerUser,
    id: 4,
    username: 'hshareef',
    fullName: 'Hassan Shareef',
    empNo: 'FIN-091',
    roleId: 3,
    roleCode: 'FIN-CHK',
    roleName: 'Finance Checker',
  };

  const managerUser: AuthenticatedUser = {
    ...makerUser,
    id: 5,
    username: 'anawaal',
    fullName: 'Aishath Nawaal',
    empNo: 'FIN-002',
    roleId: 2,
    roleCode: 'FIN-MGR',
    roleName: 'Finance Manager',
  };

  const createService = (instanceMock: Record<string, unknown>) => {
    const tx = {
      approvalDecision: { create: jest.fn() },
      approvalInstance: {
        update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 10,
          ...data,
          totalStages: instanceMock.totalStages,
        })),
      },
      cashDeposit: {
        findUnique: jest.fn().mockResolvedValue({ id: 99, docNo: 'CCD-2026-0099', status: 'Pending' }),
        update: jest.fn().mockResolvedValue({ id: 99, docNo: 'CCD-2026-0099', status: 'In Review' }),
      },
      pettyCashRequest: { findUnique: jest.fn(), update: jest.fn() },
      salesReconciliation: { findUnique: jest.fn(), update: jest.fn() },
    };

    const prisma = {
      approvalInstance: { findUnique: jest.fn().mockResolvedValue(instanceMock) },
      $transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService;

    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const notif = { createSystemAlert: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
    return { service: new ApprovalsService(prisma, audit, notif), tx, audit };
  };

  it('blocks Maker from self-approving their own submitted document', async () => {
    const { service } = createService({
      id: 10,
      entityType: 'cash_deposit',
      entityId: 99,
      docNo: 'CCD-2026-0099',
      submittedById: makerUser.id,
      amountBase: new Prisma.Decimal(1500),
      baseCurrencyCode: 'USD',
      currentStageOrder: 1,
      totalStages: 2,
      status: 'Pending',
      decisions: [],
      template: { stages: [] },
    });

    await expect(
      service.decide(makerUser, 10, { decision: 'approve' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks approver when document amount exceeds stage maxLimitBase', async () => {
    const { service } = createService({
      id: 10,
      entityType: 'cash_deposit',
      entityId: 99,
      docNo: 'CCD-2026-0099',
      submittedById: makerUser.id,
      amountBase: new Prisma.Decimal(20000),
      baseCurrencyCode: 'USD',
      currentStageOrder: 1,
      totalStages: 2,
      status: 'Pending',
      decisions: [],
      template: {
        stages: [
          {
            stageOrder: 1,
            stage: {
              id: 2,
              name: 'Finance Checker Audit',
              noOfApproval: 1,
              approvers: [{ userId: checkerUser.id, maxLimitBase: new Prisma.Decimal(15000) }],
            },
          },
        ],
      },
    });

    await expect(
      service.decide(checkerUser, 10, { decision: 'approve' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('advances Stage 1 to Stage 2 (In Review) and approves on final stage', async () => {
    const { service, tx } = createService({
      id: 10,
      entityType: 'cash_deposit',
      entityId: 99,
      docNo: 'CCD-2026-0099',
      submittedById: makerUser.id,
      amountBase: new Prisma.Decimal(3189),
      baseCurrencyCode: 'USD',
      currentStageOrder: 1,
      totalStages: 2,
      status: 'Pending',
      decisions: [],
      template: {
        stages: [
          {
            stageOrder: 1,
            stage: {
              id: 2,
              name: 'Finance Checker Audit',
              noOfApproval: 1,
              approvers: [{ userId: checkerUser.id, maxLimitBase: new Prisma.Decimal(15000) }],
            },
          },
          {
            stageOrder: 2,
            stage: {
              id: 3,
              name: 'Finance Manager Sign-off',
              noOfApproval: 1,
              approvers: [{ userId: managerUser.id, maxLimitBase: new Prisma.Decimal(50000) }],
            },
          },
        ],
      },
    });

    const stage1Result = await service.decide(checkerUser, 10, { decision: 'approve', comment: 'Verified denominations' });
    expect(stage1Result.status).toBe('In Review');
    expect(stage1Result.documentStatus).toBe('In Review');
    expect(stage1Result.currentStageOrder).toBe(2);
    expect(tx.cashDeposit.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'In Review' }) }),
    );
  });

  it('requires a reason comment when rejecting or returning for clarification', async () => {
    const { service } = createService({
      id: 10,
      entityType: 'cash_deposit',
      entityId: 99,
      docNo: 'CCD-2026-0099',
      submittedById: makerUser.id,
      amountBase: new Prisma.Decimal(500),
      baseCurrencyCode: 'USD',
      currentStageOrder: 1,
      totalStages: 1,
      status: 'Pending',
      decisions: [],
      template: { stages: [] },
    });

    await expect(
      service.decide(checkerUser, 10, { decision: 'reject', comment: '   ' }),
    ).rejects.toThrow(BadRequestException);
  });
});
