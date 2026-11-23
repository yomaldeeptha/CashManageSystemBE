import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { NumberSeriesGeneratorService } from '../common/services/number-series-generator.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { SaveFormMasterDto, SaveNumberSeriesDto } from './dto/number-series.dto';

@Injectable()
export class NumberSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly generator: NumberSeriesGeneratorService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  private serializeSeries(s: {
    id: number;
    seriesId: string;
    seriesName: string;
    formId: string;
    prefix: string;
    suffix: string;
    initialNumber: number;
    nextNumber: number;
    lastNumber: number;
    numDigits: number;
    periodIndicator: string;
    branchId: number | null;
    isDefault: boolean;
    isLocked: boolean;
    status: string;
    formMaster?: { formName: string; category: string; module: string } | null;
    branch?: { name: string } | null;
  }) {
    return {
      id: s.id,
      seriesId: s.seriesId,
      seriesName: s.seriesName,
      formId: s.formId,
      formName: s.formMaster?.formName || s.formId,
      category: s.formMaster?.category || 'Operations',
      module: s.formMaster?.module || 'General',
      prefix: s.prefix,
      suffix: s.suffix,
      initialNumber: s.initialNumber,
      nextNumber: s.nextNumber,
      lastNumber: s.lastNumber,
      numDigits: s.numDigits,
      periodIndicator: s.periodIndicator,
      branchId: s.branchId,
      branch: s.branch?.name || 'All Branches',
      isDefault: s.isDefault,
      isLocked: s.isLocked,
      status: s.status,
      preview: this.generator.formatDocumentNo(s),
    };
  }

  async listSeries() {
    const rows = await this.prisma.numberSeries.findMany({
      include: { formMaster: true, branch: true },
      orderBy: [{ formId: 'asc' }, { isDefault: 'desc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.serializeSeries(r));
  }

  async createSeries(actor: AuthenticatedUser, dto: SaveNumberSeriesDto) {
    const form = await this.prisma.formMaster.findUnique({ where: { formId: dto.formId } });
    if (!form) {
      throw new BadRequestException(`Form Master "${dto.formId}" does not exist.`);
    }

    let branchId: number | null = dto.branchId ?? null;
    if (!branchId && dto.branch && dto.branch !== 'All Branches') {
      const br = await this.prisma.branch.findFirst({
        where: { name: { equals: dto.branch, mode: 'insensitive' } },
      });
      branchId = br?.id ?? null;
    }

    const count = await this.prisma.numberSeries.count();
    const seriesId = dto.seriesId || `SER-${dto.formId.slice(4, 8)}-${String(count + 1).padStart(3, '0')}`;

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.numberSeries.updateMany({
          where: { formId: dto.formId },
          data: { isDefault: false },
        });
      }
      const s = await tx.numberSeries.create({
        data: {
          seriesId,
          seriesName: dto.seriesName.trim(),
          formId: dto.formId,
          prefix: dto.prefix,
          suffix: dto.suffix || '',
          initialNumber: dto.initialNumber || 1,
          nextNumber: dto.nextNumber,
          lastNumber: dto.lastNumber || 99999,
          numDigits: dto.numDigits || 4,
          periodIndicator: dto.periodIndicator || 'FY2026',
          branchId,
          isDefault: Boolean(dto.isDefault),
          isLocked: Boolean(dto.isLocked),
          status: dto.isLocked ? 'Locked' : 'Active',
          createUserId: actor.id,
          updateUserId: actor.id,
        },
        include: { formMaster: true, branch: true },
      });

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'NumberSeries',
          recordId: s.id,
          recordCode: s.seriesId,
          newValues: s,
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'number_series',
        entityId: s.id,
        docNo: s.seriesId,
        action: 'CREATE',
        step: `Created Number Series ${s.seriesName} for ${s.formId}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
      return s;
    });

    return this.serializeSeries(created);
  }

  async updateSeries(actor: AuthenticatedUser, id: number, dto: SaveNumberSeriesDto) {
    const existing = await this.prisma.numberSeries.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Number series #${id} not found.`);

    let branchId: number | null = dto.branchId ?? null;
    if (!branchId && dto.branch && dto.branch !== 'All Branches') {
      const br = await this.prisma.branch.findFirst({
        where: { name: { equals: dto.branch, mode: 'insensitive' } },
      });
      branchId = br?.id ?? null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.numberSeries.updateMany({
          where: { formId: dto.formId, id: { not: id } },
          data: { isDefault: false },
        });
      }
      const s = await tx.numberSeries.update({
        where: { id },
        data: {
          seriesName: dto.seriesName.trim(),
          formId: dto.formId,
          prefix: dto.prefix,
          suffix: dto.suffix || '',
          initialNumber: dto.initialNumber || existing.initialNumber,
          nextNumber: dto.nextNumber,
          lastNumber: dto.lastNumber || existing.lastNumber,
          numDigits: dto.numDigits,
          periodIndicator: dto.periodIndicator || existing.periodIndicator,
          branchId,
          isDefault: dto.isDefault ?? existing.isDefault,
          isLocked: dto.isLocked ?? existing.isLocked,
          status: (dto.isLocked ?? existing.isLocked) ? 'Locked' : 'Active',
          updateUserId: actor.id,
        },
        include: { formMaster: true, branch: true },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'NumberSeries',
          recordId: s.id,
          recordCode: s.seriesId,
          oldValues: existing,
          newValues: s,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'number_series',
        entityId: s.id,
        docNo: s.seriesId,
        action: 'UPDATE',
        step: `Updated Number Series ${s.seriesName}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
      return s;
    });

    return this.serializeSeries(updated);
  }

  async deleteSeries(actor: AuthenticatedUser, id: number) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.numberSeries.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Number series #${id} not found.`);
      if (existing.isLocked) {
        throw new BadRequestException('Unlock this series before deleting it.');
      }
      await tx.numberSeries.delete({ where: { id } });
      if (this.changeLogService) {
        await this.changeLogService.logDelete({
          tableName: 'NumberSeries',
          recordId: id,
          recordCode: existing.seriesId,
          oldValues: existing,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'number_series',
        entityId: id,
        docNo: existing.seriesId,
        action: 'DELETE',
        step: `Deleted Number Series ${existing.seriesName}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return { deleted: true, id };
  }

  async toggleLock(actor: AuthenticatedUser, id: number) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.numberSeries.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Number series #${id} not found.`);
      const nextLocked = !existing.isLocked;
      const next = await tx.numberSeries.update({
        where: { id },
        data: { isLocked: nextLocked, status: nextLocked ? 'Locked' : 'Active', updateUserId: actor.id },
        include: { formMaster: true, branch: true },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: nextLocked ? 'CLOSE' : 'REOPEN',
          tableName: 'NumberSeries',
          recordId: id,
          recordCode: existing.seriesId,
          oldValues: { isLocked: existing.isLocked, status: existing.status },
          newValues: { isLocked: next.isLocked, status: next.status },
          description: `${nextLocked ? 'Locked' : 'Unlocked'} Number Series ${existing.seriesName}`,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'number_series',
        entityId: id,
        docNo: existing.seriesId,
        action: nextLocked ? 'LOCK' : 'UNLOCK',
        step: `${nextLocked ? 'Locked' : 'Unlocked'} Number Series ${existing.seriesName}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
      return next;
    });
    return this.serializeSeries(updated);
  }

  async setDefault(actor: AuthenticatedUser, id: number) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.numberSeries.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Number series #${id} not found.`);
      await tx.numberSeries.updateMany({
        where: { formId: existing.formId },
        data: { isDefault: false, updateUserId: actor.id },
      });
      const next = await tx.numberSeries.update({
        where: { id },
        data: { isDefault: true, updateUserId: actor.id },
        include: { formMaster: true, branch: true },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'NumberSeries',
          recordId: id,
          recordCode: existing.seriesId,
          oldValues: existing,
          newValues: next,
          description: `Set ${existing.seriesName} as default series for ${existing.formId}`,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'number_series',
        entityId: id,
        docNo: existing.seriesId,
        action: 'SET_DEFAULT',
        step: `Set ${existing.seriesName} as default series for ${existing.formId}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
      return next;
    });
    return this.serializeSeries(updated);
  }

  async incrementNext(actor: AuthenticatedUser, id: number) {
    const existing = await this.prisma.numberSeries.findUnique({
      where: { id },
      include: { formMaster: true, branch: true },
    });
    if (!existing) throw new NotFoundException(`Number series #${id} not found.`);
    if (existing.isLocked) {
      throw new BadRequestException(`Number series "${existing.seriesName}" is locked.`);
    }
    const generatedNumber = await this.generator.allocateNextNumber(existing.formId, {
      preferredSeriesId: existing.seriesId,
    });
    const refreshed = await this.prisma.numberSeries.findUnique({
      where: { id },
      include: { formMaster: true, branch: true },
    });
    await this.auditService.log({
      entityType: 'number_series',
      entityId: id,
      docNo: generatedNumber,
      action: 'ALLOCATE_NUMBER',
      step: `Allocated document number ${generatedNumber} from ${existing.seriesName}`,
      performedById: actor.id,
      performedByName: actor.fullName,
    });
    return {
      generatedNumber,
      series: refreshed ? this.serializeSeries(refreshed) : null,
    };
  }

  // ---- Form Master ----
  async listFormMasters() {
    const rows = await this.prisma.formMaster.findMany({ orderBy: { id: 'asc' } });
    return rows.map((f) => ({
      id: f.id,
      formId: f.formId,
      formName: f.formName,
      category: f.category,
      module: f.module,
      screenId: f.screenId || '',
      routeKey: f.routeKey || '',
      defaultPrefix: f.defaultPrefix,
      defaultNumDigits: f.defaultNumDigits,
      isTransactional: f.isTransactional,
      makerCheckerType: f.makerCheckerType,
      status: f.isActive ? 'Active' : 'Inactive',
      description: f.description || '',
    }));
  }

  async saveFormMaster(actor: AuthenticatedUser, dto: SaveFormMasterDto) {
    const formId = dto.formId.trim().toUpperCase();
    const isActive = dto.status ? dto.status === 'Active' : true;

    const saved = await this.prisma.$transaction(async (tx) => {
      const existingForm = await tx.formMaster.findUnique({ where: { formId } });
      const form = await tx.formMaster.upsert({
        where: { formId },
        create: {
          formId,
          formName: dto.formName.trim(),
          category: dto.category,
          module: dto.module,
          screenId: dto.screenId || null,
          routeKey: dto.routeKey || null,
          defaultPrefix: dto.defaultPrefix.trim().toUpperCase(),
          defaultNumDigits: dto.defaultNumDigits || 4,
          isTransactional: dto.isTransactional ?? true,
          makerCheckerType: dto.makerCheckerType || 'Standard',
          description: dto.description || '',
          isActive,
          createUserId: actor.id,
          updateUserId: actor.id,
        },
        update: {
          formName: dto.formName.trim(),
          category: dto.category,
          module: dto.module,
          screenId: dto.screenId || null,
          routeKey: dto.routeKey || null,
          defaultPrefix: dto.defaultPrefix.trim().toUpperCase(),
          defaultNumDigits: dto.defaultNumDigits || 4,
          isTransactional: dto.isTransactional ?? true,
          makerCheckerType: dto.makerCheckerType || 'Standard',
          description: dto.description || '',
          isActive,
          updateUserId: actor.id,
        },
      });

      if (this.changeLogService) {
        if (existingForm) {
          await this.changeLogService.logUpdate({
            tableName: 'FormMaster',
            recordId: form.id,
            recordCode: form.formId,
            oldValues: existingForm,
            newValues: form,
            actor,
            tx,
          });
        } else {
          await this.changeLogService.logCreate({
            tableName: 'FormMaster',
            recordId: form.id,
            recordCode: form.formId,
            newValues: form,
            actor,
            tx,
          });
        }
      }

      if (dto.screenId) {
        const screenId = dto.screenId.trim().toUpperCase();
        await tx.screen.upsert({
          where: { screenId },
          create: {
            screenId,
            formId,
            screenName: dto.formName.trim(),
            category: dto.category,
            routeKey: dto.routeKey || 'custom',
            description: dto.description || '',
            makerCheckerType: dto.makerCheckerType || 'Standard',
            isActive,
          },
          update: {
            formId,
            screenName: dto.formName.trim(),
            category: dto.category,
            ...(dto.routeKey ? { routeKey: dto.routeKey } : {}),
            description: dto.description || '',
            makerCheckerType: dto.makerCheckerType || 'Standard',
            isActive,
          },
        });
      }

      await this.auditService.log({
        entityType: 'form_master',
        entityId: form.id,
        docNo: form.formId,
        action: 'SAVE',
        step: `Saved Form Master ${form.formId} (${form.formName})`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return form;
    });

    return {
      id: saved.id,
      formId: saved.formId,
      formName: saved.formName,
      category: saved.category,
      module: saved.module,
      screenId: saved.screenId || '',
      routeKey: saved.routeKey || '',
      defaultPrefix: saved.defaultPrefix,
      defaultNumDigits: saved.defaultNumDigits,
      isTransactional: saved.isTransactional,
      makerCheckerType: saved.makerCheckerType,
      status: saved.isActive ? 'Active' : 'Inactive',
      description: saved.description || '',
    };
  }
}
