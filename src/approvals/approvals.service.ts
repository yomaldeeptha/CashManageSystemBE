import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { toDecimal, toNumber, toPrismaDecimal } from '../common/utils/decimal.util';
import {
  ApprovalDecisionDto,
  SaveApprovalStageDto,
  SaveApprovalTemplateDto,
} from './dto/approvals.dto';

export interface InitiateApprovalParams {
  entityType: 'cash_deposit' | 'petty_cash_request' | 'sales_reconciliation';
  documentKey: string;
  entityId: number;
  docNo: string;
  title: string;
  companyId: number;
  branchId?: number | null;
  outletId?: number | null;
  submittedById: number;
  amountBase: number;
  baseCurrencyCode: string;
  varianceBase?: number;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  // ---- Stages CRUD ----
  async listStages() {
    const stages = await this.prisma.approvalStage.findMany({
      include: {
        approvers: {
          include: { user: { select: { id: true, empNo: true, fullName: true, designation: true } } },
        },
      },
      orderBy: { id: 'asc' },
    });

    return stages.map((s) => ({
      approvalStageId: s.id,
      id: s.id,
      code: s.code,
      name: s.name,
      noOfApproval: s.noOfApproval,
      noOfReject: s.noOfReject,
      description: s.description || '',
      users: s.approvers.map((a) => ({
        userId: a.userId,
        code: a.user.empNo || `USR-${a.userId}`,
        name: a.user.fullName,
        designation: a.user.designation || '',
        maxLimit: toNumber(a.maxLimitBase),
      })),
    }));
  }

  async saveStage(actor: AuthenticatedUser, dto: SaveApprovalStageDto, id?: number) {
    if (!dto.users || dto.users.length === 0) {
      throw new BadRequestException('At least one authorized approver must be assigned to the stage.');
    }

    const stage = await this.prisma.$transaction(async (tx) => {
      const existing = id
        ? await tx.approvalStage.findUnique({ where: { id }, include: { approvers: true } })
        : null;
      const saved = id
        ? await tx.approvalStage.update({
            where: { id },
            data: {
              code: dto.code.trim().toUpperCase(),
              name: dto.name.trim(),
              noOfApproval: dto.noOfApproval,
              noOfReject: dto.noOfReject,
              description: dto.description || '',
              updateUserId: actor.id,
            },
          })
        : await tx.approvalStage.create({
            data: {
              code: dto.code.trim().toUpperCase(),
              name: dto.name.trim(),
              noOfApproval: dto.noOfApproval,
              noOfReject: dto.noOfReject,
              description: dto.description || '',
              createUserId: actor.id,
              updateUserId: actor.id,
            },
          });

      await tx.approvalStageApprover.deleteMany({ where: { stageId: saved.id } });
      await tx.approvalStageApprover.createMany({
        data: dto.users.map((u) => ({
          stageId: saved.id,
          userId: u.userId,
          maxLimitBase: toPrismaDecimal(u.maxLimit),
          createUserId: actor.id,
          updateUserId: actor.id,
        })),
        skipDuplicates: true,
      });

      if (this.changeLogService) {
        if (existing) {
          await this.changeLogService.logUpdate({
            tableName: 'ApprovalStage',
            recordId: saved.id,
            recordCode: saved.code,
            oldValues: existing,
            newValues: { ...saved, approvers: dto.users },
            actor,
            tx,
          });
        } else {
          await this.changeLogService.logCreate({
            tableName: 'ApprovalStage',
            recordId: saved.id,
            recordCode: saved.code,
            newValues: { ...saved, approvers: dto.users },
            actor,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: 'approval_stage',
        entityId: saved.id,
        docNo: saved.code,
        action: id ? 'UPDATE' : 'CREATE',
        step: `${id ? 'Updated' : 'Created'} approval stage ${saved.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return saved;
    });

    const all = await this.listStages();
    return all.find((s) => s.id === stage.id);
  }

  async deleteStage(actor: AuthenticatedUser, id: number) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalStage.findUnique({
        where: { id },
        include: { approvers: true },
      });
      if (!existing) throw new NotFoundException(`Approval stage #${id} not found.`);
      await tx.approvalStage.delete({ where: { id } });
      if (this.changeLogService) {
        await this.changeLogService.logDelete({
          tableName: 'ApprovalStage',
          recordId: id,
          recordCode: existing.code,
          oldValues: existing,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'approval_stage',
        entityId: id,
        docNo: existing.code,
        action: 'DELETE',
        step: `Deleted approval stage ${existing.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return { deleted: true, id };
  }

  // ---- Templates CRUD ----
  async listTemplates() {
    const templates = await this.prisma.approvalTemplate.findMany({
      include: {
        stages: { include: { stage: true }, orderBy: { stageOrder: 'asc' } },
        originators: { include: { user: { include: { role: true } } } },
        terms: { orderBy: { id: 'asc' } },
      },
      orderBy: { id: 'asc' },
    });

    const allDocKeys = [
      'cashCollectionDeposit',
      'pettyCashAdvance',
      'pettyCashBillSettlement',
      'cashierTransfer',
      'salesReconciliation',
      'bankDepositJournal',
    ];

    return templates.map((t) => {
      const docMap: Record<string, boolean> = {};
      for (const key of allDocKeys) {
        docMap[key] = t.governedDocuments.includes(key);
      }
      return {
        approvalTemplateId: t.id,
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description || '',
        status: t.isActive ? 1 : 0,
        documents: docMap,
        stages: t.stages.map((st) => ({
          stageId: st.stageId,
          stageName: st.stage.name,
          order: st.stageOrder,
        })),
        originators: t.originators.map((o) => ({
          userId: o.userId,
          name: o.user.fullName,
          role: o.user.role.name,
        })),
        terms: t.terms.map((tm) => ({
          id: tm.id,
          field: tm.field,
          operator: tm.operator,
          value: tm.value,
          description: tm.description || '',
        })),
      };
    });
  }

  async saveTemplate(actor: AuthenticatedUser, dto: SaveApprovalTemplateDto, id?: number) {
    if (!dto.stages || dto.stages.length === 0) {
      throw new BadRequestException('At least one approval stage must be linked to the template.');
    }
    const governedDocuments = Object.entries(dto.documents || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);

    const template = await this.prisma.$transaction(async (tx) => {
      const existing = id
        ? await tx.approvalTemplate.findUnique({
            where: { id },
            include: { stages: true, originators: true, terms: true },
          })
        : null;
      const saved = id
        ? await tx.approvalTemplate.update({
            where: { id },
            data: {
              code: dto.code.trim().toUpperCase(),
              name: dto.name.trim(),
              description: dto.description || '',
              governedDocuments,
              updateUserId: actor.id,
            },
          })
        : await tx.approvalTemplate.create({
            data: {
              code: dto.code.trim().toUpperCase(),
              name: dto.name.trim(),
              description: dto.description || '',
              governedDocuments,
              createUserId: actor.id,
              updateUserId: actor.id,
            },
          });

      await tx.approvalTemplateStage.deleteMany({ where: { templateId: saved.id } });
      await tx.approvalTemplateStage.createMany({
        data: dto.stages.map((st, idx) => ({
          templateId: saved.id,
          stageId: st.stageId,
          stageOrder: st.order || idx + 1,
          createUserId: actor.id,
          updateUserId: actor.id,
        })),
      });

      await tx.approvalTemplateOriginator.deleteMany({ where: { templateId: saved.id } });
      if (dto.originators && dto.originators.length > 0) {
        await tx.approvalTemplateOriginator.createMany({
          data: dto.originators.map((o) => ({
            templateId: saved.id,
            userId: o.userId,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.approvalTemplateTerm.deleteMany({ where: { templateId: saved.id } });
      if (dto.terms && dto.terms.length > 0) {
        await tx.approvalTemplateTerm.createMany({
          data: dto.terms.map((tm) => ({
            templateId: saved.id,
            field: tm.field,
            operator: tm.operator,
            value: tm.value,
            description: tm.description || '',
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
        });
      }

      if (this.changeLogService) {
        if (existing) {
          await this.changeLogService.logUpdate({
            tableName: 'ApprovalTemplate',
            recordId: saved.id,
            recordCode: saved.code,
            oldValues: existing,
            newValues: { ...saved, stages: dto.stages, originators: dto.originators, terms: dto.terms },
            actor,
            tx,
          });
        } else {
          await this.changeLogService.logCreate({
            tableName: 'ApprovalTemplate',
            recordId: saved.id,
            recordCode: saved.code,
            newValues: { ...saved, stages: dto.stages, originators: dto.originators, terms: dto.terms },
            actor,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: 'approval_template',
        entityId: saved.id,
        docNo: saved.code,
        action: id ? 'UPDATE' : 'CREATE',
        step: `${id ? 'Updated' : 'Created'} approval template ${saved.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return saved;
    });

    const all = await this.listTemplates();
    return all.find((t) => t.id === template.id);
  }

  async deleteTemplate(actor: AuthenticatedUser, id: number) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.approvalTemplate.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Approval template #${id} not found.`);
      await tx.approvalTemplate.delete({ where: { id } });
      if (this.changeLogService) {
        await this.changeLogService.logDelete({
          tableName: 'ApprovalTemplate',
          recordId: id,
          recordCode: existing.code,
          oldValues: existing,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'approval_template',
        entityId: id,
        docNo: existing.code,
        action: 'DELETE',
        step: `Deleted approval template ${existing.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return { deleted: true, id };
  }

  // ---- Runtime Multi-Stage Approval Engine ----
  private evaluateTermCondition(
    term: { field: string; operator: string; value: string },
    context: { amountBase: number; varianceBase: number },
  ): boolean {
    const numVal = Number(term.value);
    if (Number.isNaN(numVal)) return true;

    let actual = context.amountBase;
    if (term.field.toLowerCase().includes('variance') || term.field.toLowerCase().includes('shortage')) {
      actual = Math.abs(context.varianceBase);
    }

    switch (term.operator) {
      case '>=':
        return actual >= numVal;
      case '>':
        return actual > numVal;
      case '<=':
        return actual <= numVal;
      case '==':
        return actual === numVal;
      case '!=':
        return actual !== numVal;
      default:
        return true;
    }
  }

  async initiateApproval(params: InitiateApprovalParams) {
    const db = params.tx || this.prisma;

    const templates = await db.approvalTemplate.findMany({
      where: {
        isActive: true,
        governedDocuments: { has: params.documentKey },
      },
      include: {
        stages: { include: { stage: true }, orderBy: { stageOrder: 'asc' } },
        originators: true,
        terms: true,
      },
      orderBy: { id: 'asc' },
    });

    const matchedTemplate =
      templates.find((tpl) => {
        const originatorMatch =
          tpl.originators.length === 0 ||
          tpl.originators.some((o) => o.userId === params.submittedById);
        return originatorMatch;
      }) || templates[0] || null;

    const totalStages = matchedTemplate ? Math.max(1, matchedTemplate.stages.length) : 1;

    const matchedTerms = (matchedTemplate?.terms || []).filter((tm) =>
      this.evaluateTermCondition(tm, {
        amountBase: params.amountBase,
        varianceBase: params.varianceBase || 0,
      }),
    );

    const triggerSummary =
      matchedTerms.length > 0
        ? matchedTerms.map((t) => t.description || `${t.field} ${t.operator} ${t.value}`).join(' • ')
        : 'Standard Maker-Checker Workflow';

    // Close any previous open approval instance for the same document (e.g., resubmission after rejection)
    await db.approvalInstance.updateMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
        status: { in: ['Pending', 'In Review'] },
      },
      data: { status: 'Superseded' },
    });

    return db.approvalInstance.create({
      data: {
        templateId: matchedTemplate?.id || null,
        entityType: params.entityType,
        entityId: params.entityId,
        docNo: params.docNo,
        title: params.title,
        companyId: params.companyId,
        branchId: params.branchId ?? null,
        outletId: params.outletId ?? null,
        submittedById: params.submittedById,
        amountBase: toPrismaDecimal(params.amountBase),
        baseCurrencyCode: params.baseCurrencyCode,
        triggerSummary,
        currentStageOrder: 1,
        totalStages,
        status: 'Pending',
      },
    });
  }

  async getQueue(
    user: AuthenticatedUser,
    filterType?: string,
    companyId?: number,
    outletId?: string,
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const where: Prisma.ApprovalInstanceWhereInput = {
      status: { in: ['Pending', 'In Review'] },
    };

    if (!scope.unrestricted) {
      where.companyId = { in: scope.companyIds };
      if (scope.outletIds.length > 0) {
        where.OR = [{ outletId: null }, { outletId: { in: scope.outletIds } }];
      }
    }
    if (companyId) where.companyId = companyId;
    if (outletId && outletId !== 'all') where.outletId = Number(outletId);

    if (filterType === 'deposit') where.entityType = 'cash_deposit';
    else if (filterType === 'petty') where.entityType = 'petty_cash_request';
    else if (filterType === 'recon') where.entityType = 'sales_reconciliation';

    const instances = await this.prisma.approvalInstance.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, fullName: true, empNo: true } },
        template: {
          include: {
            stages: {
              include: {
                stage: {
                  include: {
                    approvers: {
                      include: { user: { select: { id: true, fullName: true } } },
                    },
                  },
                },
              },
              orderBy: { stageOrder: 'asc' },
            },
          },
        },
        decisions: {
          include: { decidedBy: { select: { id: true, fullName: true } } },
          orderBy: { decidedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return instances.map((inst) => {
      const stages =
        inst.template?.stages.map((ts) => ({
          stageId: ts.stageId,
          order: ts.stageOrder,
          name: ts.stage.name,
          noOfApproval: ts.stage.noOfApproval,
          approvers: ts.stage.approvers.map((a) => ({
            userId: a.userId,
            name: a.user.fullName,
            maxLimit: toNumber(a.maxLimitBase),
          })),
        })) || [];

      const activeStage = stages.find((s) => s.order === inst.currentStageOrder) || stages[0] || null;
      const itemType =
        inst.entityType === 'cash_deposit'
          ? 'deposit'
          : inst.entityType === 'petty_cash_request'
            ? 'petty'
            : 'recon';

      const canCurrentUserApprove =
        inst.submittedById !== user.id &&
        (user.roleCode === 'ADM' ||
          !activeStage ||
          activeStage.approvers.some(
            (a) => a.userId === user.id && a.maxLimit >= toNumber(inst.amountBase),
          ));

      return {
        id: inst.id,
        entityType: inst.entityType,
        entityId: inst.entityId,
        itemType,
        docNo: inst.docNo,
        title: inst.title,
        companyId: inst.companyId,
        branchId: inst.branchId,
        outletId: inst.outletId,
        requester: inst.submittedBy.fullName,
        submittedById: inst.submittedById,
        amount: toNumber(inst.amountBase),
        baseCurrency: inst.baseCurrencyCode,
        triggerTerm: inst.triggerSummary || 'Standard Workflow',
        currentStageOrder: inst.currentStageOrder,
        totalStages: inst.totalStages,
        activeStageName: activeStage?.name || 'Finance Review',
        stages,
        status: inst.status,
        canCurrentUserApprove,
        createdAt: inst.createdAt.toISOString(),
        decisions: inst.decisions.map((d) => ({
          id: d.id,
          stageOrder: d.stageOrder,
          decision: d.decision,
          comment: d.comment,
          decidedBy: d.decidedBy.fullName,
          decidedAt: d.decidedAt.toISOString(),
        })),
      };
    });
  }

  async decide(
    actor: AuthenticatedUser,
    instanceId: number,
    dto: ApprovalDecisionDto,
  ) {
    const instance = await this.prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: {
          include: {
            stages: {
              include: {
                stage: { include: { approvers: true } },
              },
              orderBy: { stageOrder: 'asc' },
            },
          },
        },
        decisions: true,
      },
    });

    if (!instance) {
      throw new NotFoundException(`Approval request #${instanceId} not found.`);
    }
    if (!['Pending', 'In Review'].includes(instance.status)) {
      throw new BadRequestException(
        `Approval request #${instanceId} is already finalized with status "${instance.status}".`,
      );
    }

    // Strict Maker != Checker enforcement
    if (instance.submittedById === actor.id) {
      throw new ForbiddenException(
        'Maker-Checker control violation: the submitter cannot approve or verify their own document.',
      );
    }

    if ((dto.decision === 'reject' || dto.decision === 'clarify') && !dto.comment?.trim()) {
      throw new BadRequestException(
        'A clear operational reason/comment is required when rejecting or returning a document for clarification.',
      );
    }

    const activeTemplateStage = instance.template?.stages.find(
      (s) => s.stageOrder === instance.currentStageOrder,
    );
    const activeStage = activeTemplateStage?.stage || null;

    // Enforce stage assignment & max signing limit for non-ADM approvers
    if (activeStage && actor.roleCode !== 'ADM') {
      const assigned = activeStage.approvers.find((a) => a.userId === actor.id);
      if (!assigned) {
        throw new ForbiddenException(
          `You are not an authorized approver for Stage ${instance.currentStageOrder} ("${activeStage.name}").`,
        );
      }
      if (dto.decision === 'approve' && toDecimal(assigned.maxLimitBase).lt(toDecimal(instance.amountBase))) {
        throw new ForbiddenException(
          `Document amount (${instance.baseCurrencyCode} ${toNumber(instance.amountBase).toFixed(2)}) exceeds your signing limit (${instance.baseCurrencyCode} ${toNumber(assigned.maxLimitBase).toFixed(2)}) for stage "${activeStage.name}".`,
        );
      }
    }

    // Prevent duplicate approval by same user in the same stage
    const alreadyDecidedThisStage = instance.decisions.some(
      (d) =>
        d.stageOrder === instance.currentStageOrder &&
        d.decidedById === actor.id &&
        d.decision === dto.decision,
    );
    if (alreadyDecidedThisStage) {
      throw new BadRequestException('You have already recorded a decision for this approval stage.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.approvalDecision.create({
        data: {
          instanceId: instance.id,
          stageId: activeStage?.id || null,
          stageOrder: instance.currentStageOrder,
          decidedById: actor.id,
          decision: dto.decision,
          comment: dto.comment?.trim() || null,
        },
      });

      let nextInstanceStatus = instance.status;
      let nextStageOrder = instance.currentStageOrder;
      let nextDocStatus: string;
      let auditStep: string;

      if (dto.decision === 'approve') {
        const approvalsInStage =
          instance.decisions.filter(
            (d) => d.stageOrder === instance.currentStageOrder && d.decision === 'approve',
          ).length + 1;
        const requiredInStage = activeStage?.noOfApproval || 1;

        if (approvalsInStage < requiredInStage) {
          nextInstanceStatus = 'In Review';
          nextDocStatus = 'In Review';
          auditStep = `Stage ${instance.currentStageOrder} partial approval (${approvalsInStage}/${requiredInStage}) by ${actor.roleName}`;
        } else if (instance.currentStageOrder < instance.totalStages) {
          nextStageOrder = instance.currentStageOrder + 1;
          nextInstanceStatus = 'In Review';
          nextDocStatus = 'In Review';
          auditStep = `Stage ${instance.currentStageOrder} (${activeStage?.name || 'Review'}) approved — advanced to Stage ${nextStageOrder}/${instance.totalStages}`;
        } else {
          nextInstanceStatus = 'Approved';
          nextDocStatus = 'Approved';
          auditStep = `Final Stage ${instance.currentStageOrder}/${instance.totalStages} Approved by ${actor.roleName}`;
        }
      } else if (dto.decision === 'clarify') {
        nextInstanceStatus = 'Clarification';
        nextDocStatus = 'Rejected';
        auditStep = `Returned for Clarification at Stage ${instance.currentStageOrder}: ${dto.comment}`;
      } else {
        nextInstanceStatus = 'Rejected';
        nextDocStatus = 'Rejected';
        auditStep = `Rejected at Stage ${instance.currentStageOrder}: ${dto.comment}`;
      }

      const updatedInstance = await tx.approvalInstance.update({
        where: { id: instance.id },
        data: {
          currentStageOrder: nextStageOrder,
          status: nextInstanceStatus,
          completedAt: ['Approved', 'Rejected', 'Clarification'].includes(nextInstanceStatus)
            ? new Date()
            : null,
          updateUserId: actor.id,
        },
      });

      // Synchronize parent financial document status + capture full before/after for ChangeLogs
      const remarkNote = dto.comment?.trim()
        ? `${dto.decision === 'approve' ? 'Approver' : 'Returned'}: ${dto.comment.trim()}`
        : undefined;
      const changeAction = dto.decision === 'approve' ? 'APPROVE' : 'REJECT';

      if (instance.entityType === 'cash_deposit') {
        const oldDep = await tx.cashDeposit.findUnique({ where: { id: instance.entityId } });
        const nextDep = await tx.cashDeposit.update({
          where: { id: instance.entityId },
          data: {
            status: nextDocStatus,
            ...(nextDocStatus === 'Approved'
              ? { approvedById: actor.id, approvedAt: new Date() }
              : {}),
            ...(remarkNote ? { remark: remarkNote } : {}),
            updateUserId: actor.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logAction({
            action: changeAction,
            tableName: 'CashDeposit',
            recordId: instance.entityId,
            recordCode: instance.docNo,
            oldValues: oldDep,
            newValues: nextDep,
            description: auditStep,
            actor,
            tx,
          });
        }
      } else if (instance.entityType === 'petty_cash_request') {
        const reqRecord = await tx.pettyCashRequest.findUnique({ where: { id: instance.entityId } });
        const nextReq = await tx.pettyCashRequest.update({
          where: { id: instance.entityId },
          data: {
            status: nextDocStatus,
            ...(nextDocStatus === 'Approved'
              ? {
                  approvedById: actor.id,
                  approvedByName: actor.fullName,
                  approvedDate: new Date(),
                  approvedAmount: reqRecord?.approvedAmount ?? reqRecord?.requestAmount,
                }
              : {}),
            ...(remarkNote ? { remark: remarkNote } : {}),
            updateUserId: actor.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logAction({
            action: changeAction,
            tableName: 'PettyCashRequest',
            recordId: instance.entityId,
            recordCode: instance.docNo,
            oldValues: reqRecord,
            newValues: nextReq,
            description: auditStep,
            actor,
            tx,
          });
        }
      } else if (instance.entityType === 'sales_reconciliation') {
        const oldRecon = await tx.salesReconciliation.findUnique({ where: { id: instance.entityId } });
        const nextRecon = await tx.salesReconciliation.update({
          where: { id: instance.entityId },
          data: {
            status: nextDocStatus,
            ...(nextDocStatus === 'Approved'
              ? {
                  approvedById: actor.id,
                  approverName: actor.fullName,
                  approvedAt: new Date(),
                  approverRemarks: dto.comment?.trim() || 'Certified & Approved',
                }
              : {}),
            ...(remarkNote ? { remark: remarkNote } : {}),
            updateUserId: actor.id,
          },
        });
        if (this.changeLogService) {
          await this.changeLogService.logAction({
            action: changeAction,
            tableName: 'SalesReconciliation',
            recordId: instance.entityId,
            recordCode: instance.docNo,
            oldValues: oldRecon,
            newValues: nextRecon,
            description: auditStep,
            actor,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: instance.entityType,
        entityId: instance.entityId,
        docNo: instance.docNo,
        action: dto.decision.toUpperCase(),
        step: auditStep,
        fromStatus: instance.status,
        toStatus: nextDocStatus,
        performedById: actor.id,
        performedByName: `${actor.fullName}${actor.empNo ? ` (${actor.empNo})` : ''}`,
        remarks: dto.comment || null,
        tx,
      });

      return { updatedInstance, nextDocStatus, auditStep };
    });

    // Notify submitter outside transaction
    await this.notificationsService.createSystemAlert({
      title: `${instance.docNo} — ${result.nextDocStatus}`,
      message: result.auditStep,
      severity: dto.decision === 'approve' ? 'info' : 'warning',
      entityType: instance.entityType,
      entityId: instance.entityId,
      recipientUserId: instance.submittedById,
    });

    return {
      id: result.updatedInstance.id,
      docNo: instance.docNo,
      status: result.updatedInstance.status,
      documentStatus: result.nextDocStatus,
      currentStageOrder: result.updatedInstance.currentStageOrder,
      totalStages: result.updatedInstance.totalStages,
      message: result.auditStep,
    };
  }

  /**
   * Direct helper when approve/reject is triggered from a module screen or RightDrawer
   * using (entityType, entityId) instead of approvalInstanceId.
   */
  async decideByEntity(
    actor: AuthenticatedUser,
    entityType: 'cash_deposit' | 'petty_cash_request' | 'sales_reconciliation',
    entityId: number,
    dto: ApprovalDecisionDto,
  ) {
    const open = await this.prisma.approvalInstance.findFirst({
      where: {
        entityType,
        entityId,
        status: { in: ['Pending', 'In Review'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (open) {
      return this.decide(actor, open.id, dto);
    }

    throw new BadRequestException(
      `No active pending approval instance found for ${entityType} #${entityId}. Submit the document for review first.`,
    );
  }
}
