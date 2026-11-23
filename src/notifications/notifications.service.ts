import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateNotificationTemplateDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  private serializeTemplate(t: {
    id: number;
    code: string;
    name: string;
    triggerEvent: string;
    emailEnabled: boolean;
    systemAlertEnabled: boolean;
    mobilePushEnabled: boolean;
    targetRoles: string[];
    subject: string;
    body: string;
    variables: string[];
    isActive: boolean;
  }) {
    return {
      dbId: t.id,
      id: t.code,
      code: t.code,
      name: t.name,
      triggerEvent: t.triggerEvent,
      channels: {
        email: t.emailEnabled,
        systemAlert: t.systemAlertEnabled,
        mobilePush: t.mobilePushEnabled,
      },
      targetRoles: t.targetRoles,
      subject: t.subject,
      body: t.body,
      variables: t.variables,
      status: t.isActive ? 'Active' : 'Inactive',
    };
  }

  async listTemplates() {
    const rows = await this.prisma.notificationTemplate.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => this.serializeTemplate(r));
  }

  async updateTemplate(
    actor: AuthenticatedUser,
    idOrCode: string,
    dto: UpdateNotificationTemplateDto,
  ) {
    const numericId = Number(idOrCode);
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: Number.isInteger(numericId) ? { id: numericId } : { code: idOrCode },
    });
    if (!existing) throw new NotFoundException(`Notification template "${idOrCode}" not found.`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.notificationTemplate.update({
        where: { id: existing.id },
        data: {
          ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
          ...(dto.body !== undefined ? { body: dto.body } : {}),
          ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
          ...(dto.systemAlertEnabled !== undefined
            ? { systemAlertEnabled: dto.systemAlertEnabled }
            : {}),
          ...(dto.mobilePushEnabled !== undefined
            ? { mobilePushEnabled: dto.mobilePushEnabled }
            : {}),
          ...(dto.channels?.email !== undefined ? { emailEnabled: dto.channels.email } : {}),
          ...(dto.channels?.systemAlert !== undefined
            ? { systemAlertEnabled: dto.channels.systemAlert }
            : {}),
          ...(dto.channels?.mobilePush !== undefined
            ? { mobilePushEnabled: dto.channels.mobilePush }
            : {}),
          updateUserId: actor.id,
        },
      });

      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'NotificationTemplate',
          recordId: next.id,
          recordCode: next.code,
          oldValues: existing,
          newValues: next,
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'notification_template',
        entityId: next.id,
        docNo: next.code,
        action: 'UPDATE',
        step: `Updated notification template ${next.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return next;
    });

    return this.serializeTemplate(updated);
  }

  async triggerTest(actor: AuthenticatedUser, idOrCode: string) {
    const numericId = Number(idOrCode);
    const template = await this.prisma.notificationTemplate.findFirst({
      where: Number.isInteger(numericId) ? { id: numericId } : { code: idOrCode },
    });
    if (!template) throw new NotFoundException(`Notification template "${idOrCode}" not found.`);

    const activeChannels: string[] = [];
    if (template.systemAlertEnabled) activeChannels.push('system');
    if (template.emailEnabled) activeChannels.push('email');
    if (template.mobilePushEnabled) activeChannels.push('mobile');

    const log = await this.prisma.notificationLog.create({
      data: {
        templateId: template.id,
        recipientUserId: actor.id,
        title: `[TEST] ${template.name}`,
        message: template.subject,
        channel: activeChannels.join(', ') || 'system',
        severity: 'info',
        entityType: 'notification_template',
        entityId: template.id,
      },
    });

    return {
      sent: true,
      channels: activeChannels,
      logId: log.id,
      message: `Test notification logged across ${activeChannels.join(', ') || 'system'}.`,
    };
  }

  async createSystemAlert(params: {
    title: string;
    message: string;
    severity?: string;
    entityType?: string;
    entityId?: number;
    recipientUserId?: number | null;
    channel?: string;
  }) {
    return this.prisma.notificationLog.create({
      data: {
        title: params.title,
        message: params.message,
        severity: params.severity || 'warning',
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        recipientUserId: params.recipientUserId ?? null,
        channel: params.channel || 'system',
      },
    });
  }

  async getInbox(user: AuthenticatedUser) {
    const items = await this.prisma.notificationLog.findMany({
      where: {
        OR: [{ recipientUserId: user.id }, { recipientUserId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const unreadCount = items.filter((i) => !i.isRead).length;
    return {
      unreadCount,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        message: i.message,
        channel: i.channel,
        severity: i.severity,
        entityType: i.entityType,
        entityId: i.entityId,
        isRead: i.isRead,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }

  async markRead(user: AuthenticatedUser, id: number) {
    await this.prisma.notificationLog.updateMany({
      where: {
        id,
        OR: [{ recipientUserId: user.id }, { recipientUserId: null }],
      },
      data: { isRead: true },
    });
    return { read: true };
  }

  async markAllRead(user: AuthenticatedUser) {
    await this.prisma.notificationLog.updateMany({
      where: {
        isRead: false,
        OR: [{ recipientUserId: user.id }, { recipientUserId: null }],
      },
      data: { isRead: true },
    });
    return { readAll: true };
  }
}
