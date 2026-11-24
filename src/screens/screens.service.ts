import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CopyScreenAuthDto,
  SaveScreenDto,
  SaveUserScreenAuthDto,
} from './dto/screens.dto';

@Injectable()
export class ScreensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) { }

  async listScreens() {
    const rows = await this.prisma.screen.findMany({ orderBy: { id: 'asc' } });
    return rows.map((s) => ({
      id: s.id,
      screenId: s.screenId,
      formId: s.formId,
      screenName: s.screenName,
      category: s.category,
      routeKey: s.routeKey,
      iconName: s.iconName || 'LayoutGrid',
      description: s.description || '',
      makerCheckerType: s.makerCheckerType,
      status: s.isActive ? 'Active' : 'Inactive',
      supportedActions: s.supportedActions,
    }));
  }

  async listMenuTree() {
    return this.prisma.menuNode.findMany({ orderBy: { menuId: 'asc' } });
  }

  async saveScreen(actor: AuthenticatedUser, dto: SaveScreenDto) {
    const screenId = dto.screenId.trim().toUpperCase();
    const formId = dto.formId.trim().toUpperCase();
    const isActive = dto.status ? dto.status === 'Active' : true;

    const saved = await this.prisma.$transaction(async (tx) => {
      const existingScreen = await tx.screen.findUnique({ where: { screenId } });
      // Ensure FormMaster exists for referential integrity
      await tx.formMaster.upsert({
        where: { formId },
        create: {
          formId,
          formName: dto.screenName.trim(),
          category: dto.category,
          module: dto.category,
          screenId,
          routeKey: dto.routeKey,
          defaultPrefix: dto.defaultPrefix || `${formId.slice(4, 7)}-`,
          defaultNumDigits: dto.defaultNumDigits || 4,
          isTransactional: dto.isTransactional ?? dto.category === 'Operations',
          makerCheckerType: dto.makerCheckerType || 'Standard',
          description: dto.description || '',
          isActive,
          createUserId: actor.id,
          updateUserId: actor.id,
        },
        update: {
          formName: dto.screenName.trim(),
          category: dto.category,
          screenId,
          routeKey: dto.routeKey,
          makerCheckerType: dto.makerCheckerType || 'Standard',
          description: dto.description || '',
          isActive,
          updateUserId: actor.id,
        },
      });

      const screen = await tx.screen.upsert({
        where: { screenId },
        create: {
          screenId,
          formId,
          screenName: dto.screenName.trim(),
          category: dto.category,
          routeKey: dto.routeKey,
          iconName: dto.iconName || 'LayoutGrid',
          description: dto.description || '',
          makerCheckerType: dto.makerCheckerType || 'Standard',
          supportedActions: dto.supportedActions || ['view', 'create', 'edit', 'approve', 'export'],
          isActive,
          createUserId: actor.id,
          updateUserId: actor.id,
        },
        update: {
          formId,
          screenName: dto.screenName.trim(),
          category: dto.category,
          routeKey: dto.routeKey,
          iconName: dto.iconName || 'LayoutGrid',
          description: dto.description || '',
          makerCheckerType: dto.makerCheckerType || 'Standard',
          supportedActions: dto.supportedActions || ['view', 'create', 'edit', 'approve', 'export'],
          isActive,
          updateUserId: actor.id,
        },
      });

      if (this.changeLogService) {
        if (existingScreen) {
          await this.changeLogService.logUpdate({
            tableName: 'Screen',
            recordId: screen.id,
            recordCode: screen.screenId,
            oldValues: existingScreen,
            newValues: screen,
            actor,
            tx,
          });
        } else {
          await this.changeLogService.logCreate({
            tableName: 'Screen',
            recordId: screen.id,
            recordCode: screen.screenId,
            newValues: screen,
            actor,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: 'screen',
        entityId: screen.id,
        docNo: screen.screenId,
        action: 'SAVE',
        step: `Saved screen ${screen.screenId} (${screen.screenName})`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return screen;
    });

    return {
      id: saved.id,
      screenId: saved.screenId,
      formId: saved.formId,
      screenName: saved.screenName,
      category: saved.category,
      routeKey: saved.routeKey,
      iconName: saved.iconName,
      description: saved.description,
      makerCheckerType: saved.makerCheckerType,
      status: saved.isActive ? 'Active' : 'Inactive',
      supportedActions: saved.supportedActions,
    };
  }

  async getAllUserAuthorizationsMap() {
    const auths = await this.prisma.userScreenAuthorization.findMany({
      include: { screen: true },
    });
    const map: Record<number, Record<string, unknown>> = {};
    for (const a of auths) {
      if (!map[a.userId]) map[a.userId] = {};
      const entry = {
        screenId: a.screen.screenId,
        formId: a.screen.formId,
        canAccess: a.canAccess,
        canCreate: a.canCreate,
        canEdit: a.canEdit,
        canApprove: a.canApprove,
        canExport: a.canExport,
        authLevel: a.authLevel,
      };
      map[a.userId][a.screen.screenId] = entry;
      map[a.userId][a.screen.formId] = entry;
    }
    return map;
  }

  async getUserAuthorizations(userId: number) {
    const auths = await this.prisma.userScreenAuthorization.findMany({
      where: { userId },
      include: { screen: true },
    });
    const result: Record<string, unknown> = {};
    for (const a of auths) {
      const entry = {
        screenId: a.screen.screenId,
        formId: a.screen.formId,
        canAccess: a.canAccess,
        canCreate: a.canCreate,
        canEdit: a.canEdit,
        canApprove: a.canApprove,
        canExport: a.canExport,
        authLevel: a.authLevel,
      };
      result[a.screen.screenId] = entry;
      result[a.screen.formId] = entry;
    }
    return result;
  }

  async saveUserAuthorizations(
    actor: AuthenticatedUser,
    userId: number,
    dto: SaveUserScreenAuthDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User #${userId} not found.`);

    const screens = await this.prisma.screen.findMany();
    const byScreenId = new Map(screens.map((s) => [s.screenId, s]));
    const byFormId = new Map(screens.map((s) => [s.formId, s]));

    await this.prisma.$transaction(async (tx) => {
      const existingAuths = await tx.userScreenAuthorization.findMany({
        where: { userId },
        include: { screen: true },
      });
      const oldMap: Record<string, unknown> = {};
      for (const a of existingAuths) {
        oldMap[a.screen.screenId] = {
          canAccess: a.canAccess,
          canCreate: a.canCreate,
          canEdit: a.canEdit,
          canApprove: a.canApprove,
          canExport: a.canExport,
          authLevel: a.authLevel,
        };
      }
      const newMap: Record<string, unknown> = { ...oldMap };

      const seenScreenDbIds = new Set<number>();
      for (const [key, val] of Object.entries(dto.authorizations)) {
        const screen = byScreenId.get(val.screenId || key) || byFormId.get(val.formId || key);
        if (!screen || seenScreenDbIds.has(screen.id)) continue;
        seenScreenDbIds.add(screen.id);

        const nextEntry = {
          authLevel: val.authLevel,
          canAccess: Boolean(val.canAccess),
          canCreate: Boolean(val.canCreate),
          canEdit: Boolean(val.canEdit),
          canApprove: Boolean(val.canApprove),
          canExport: Boolean(val.canExport),
        };
        newMap[screen.screenId] = nextEntry;

        await tx.userScreenAuthorization.upsert({
          where: { userId_screenId: { userId, screenId: screen.id } },
          create: {
            userId,
            screenId: screen.id,
            ...nextEntry,
            createUserId: actor.id,
            updateUserId: actor.id,
          },
          update: {
            ...nextEntry,
            updateUserId: actor.id,
          },
        });
      }

      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'UserScreenAuthorization',
          recordId: userId,
          recordCode: user.username,
          oldValues: oldMap,
          newValues: newMap,
          description: `Updated screen authorizations for user ${user.username}`,
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'user_screen_authorization',
        entityId: userId,
        action: 'UPDATE',
        step: `Updated screen authorizations for user ${user.username}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });

    return this.getUserAuthorizations(userId);
  }

  async copyAuthorizations(actor: AuthenticatedUser, dto: CopyScreenAuthDto) {
    await this.prisma.$transaction(async (tx) => {
      const [sourceUser, targetUser] = await Promise.all([
        tx.user.findUnique({ where: { id: dto.sourceUserId } }),
        tx.user.findUnique({ where: { id: dto.targetUserId } }),
      ]);
      if (!sourceUser) {
        throw new NotFoundException(`Source user #${dto.sourceUserId} not found.`);
      }
      if (!targetUser) {
        throw new NotFoundException(`Target user #${dto.targetUserId} not found.`);
      }
      const sourceAuths = await tx.userScreenAuthorization.findMany({
        where: { userId: dto.sourceUserId },
      });
      await tx.userScreenAuthorization.deleteMany({ where: { userId: dto.targetUserId } });
      if (sourceAuths.length > 0) {
        await tx.userScreenAuthorization.createMany({
          data: sourceAuths.map((s) => ({
            userId: dto.targetUserId,
            screenId: s.screenId,
            authLevel: s.authLevel,
            canAccess: s.canAccess,
            canCreate: s.canCreate,
            canEdit: s.canEdit,
            canApprove: s.canApprove,
            canExport: s.canExport,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
        });
      }
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'STATUS_CHANGE',
          tableName: 'UserScreenAuthorization',
          recordId: dto.targetUserId,
          recordCode: targetUser.username,
          newValues: { copiedFromUserId: dto.sourceUserId, screenCount: sourceAuths.length },
          description: `Copied ${sourceAuths.length} screen authorizations from ${sourceUser.username} to ${targetUser.username}`,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'user_screen_authorization',
        entityId: dto.targetUserId,
        action: 'COPY',
        step: `Copied screen authorizations from user #${dto.sourceUserId} to #${dto.targetUserId}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return this.getUserAuthorizations(dto.targetUserId);
  }
}
