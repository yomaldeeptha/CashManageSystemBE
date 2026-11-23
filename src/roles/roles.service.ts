import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { SaveRoleDto, UpdateRolePermissionsDto } from './dto/roles.dto';

const DEFAULT_MODULES = [
  'cashDeposit',
  'pettyCash',
  'salesRecon',
  'approvals',
  'masterData',
  'userManagement',
  'rolesPermissions',
  'notifications',
  'printFormats',
  'auditExport',
  'reports',
];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { id: 'asc' },
    });

    return roles.map((r) => {
      const permissions: Record<string, Record<string, boolean>> = {};
      for (const mod of DEFAULT_MODULES) {
        permissions[mod] = {
          read: false,
          create: false,
          update: false,
          delete: false,
          approve: false,
          unblock: false,
        };
      }
      for (const p of r.permissions) {
        permissions[p.moduleKey] = {
          read: p.canRead,
          create: p.canCreate,
          update: p.canUpdate,
          delete: p.canDelete,
          approve: p.canApprove,
          unblock: p.canUnblock,
        };
      }
      return {
        systemUserRoleId: r.id,
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description || '',
        status: r.isActive ? 1 : 0,
        usersCount: r._count.users,
        permissions,
      };
    });
  }

  async create(actor: AuthenticatedUser, dto: SaveRoleDto) {
    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description || '',
          isActive: dto.status === undefined ? true : dto.status === 1,
          createUserId: actor.id,
          updateUserId: actor.id,
        },
      });
      await tx.rolePermission.createMany({
        data: DEFAULT_MODULES.map((moduleKey) => ({
          roleId: created.id,
          moduleKey,
          canRead: true,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
          canUnblock: false,
          createUserId: actor.id,
          updateUserId: actor.id,
        })),
      });
      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'Role',
          recordId: created.id,
          recordCode: created.code,
          newValues: created,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'role',
        entityId: created.id,
        action: 'CREATE',
        step: `Created Role ${created.name} (${created.code})`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
      return created;
    });

    const list = await this.findAll();
    return list.find((r) => r.id === role.id);
  }

  async update(actor: AuthenticatedUser, id: number, dto: SaveRoleDto) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.role.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException(`Role #${id} not found.`);
      const updated = await tx.role.update({
        where: { id },
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description || '',
          isActive: dto.status === undefined ? existing.isActive : dto.status === 1,
          updateUserId: actor.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'Role',
          recordId: id,
          recordCode: updated.code,
          oldValues: existing,
          newValues: updated,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'role',
        entityId: id,
        action: 'UPDATE',
        step: `Updated Role ${dto.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    const list = await this.findAll();
    return list.find((r) => r.id === id);
  }

  async updatePermissions(
    actor: AuthenticatedUser,
    id: number,
    dto: UpdateRolePermissionsDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.role.findUnique({
        where: { id },
        include: { permissions: true },
      });
      if (!existing) throw new NotFoundException(`Role #${id} not found.`);

      const oldPermsMap: Record<string, unknown> = {};
      for (const p of existing.permissions) {
        oldPermsMap[p.moduleKey] = {
          read: p.canRead,
          create: p.canCreate,
          update: p.canUpdate,
          delete: p.canDelete,
          approve: p.canApprove,
          unblock: p.canUnblock,
        };
      }

      const newPermsMap: Record<string, unknown> = { ...oldPermsMap };
      for (const [moduleKey, perms] of Object.entries(dto.permissions)) {
        const nextVal = {
          read: Boolean(perms.read),
          create: Boolean(perms.create),
          update: Boolean(perms.update),
          delete: Boolean(perms.delete),
          approve: Boolean(perms.approve),
          unblock: Boolean(perms.unblock),
        };
        newPermsMap[moduleKey] = nextVal;
        await tx.rolePermission.upsert({
          where: { roleId_moduleKey: { roleId: id, moduleKey } },
          create: {
            roleId: id,
            moduleKey,
            canRead: nextVal.read,
            canCreate: nextVal.create,
            canUpdate: nextVal.update,
            canDelete: nextVal.delete,
            canApprove: nextVal.approve,
            canUnblock: nextVal.unblock,
            createUserId: actor.id,
            updateUserId: actor.id,
          },
          update: {
            canRead: nextVal.read,
            canCreate: nextVal.create,
            canUpdate: nextVal.update,
            canDelete: nextVal.delete,
            canApprove: nextVal.approve,
            canUnblock: nextVal.unblock,
            updateUserId: actor.id,
          },
        });
      }

      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'RolePermission',
          recordId: id,
          recordCode: existing.code,
          oldValues: oldPermsMap,
          newValues: newPermsMap,
          description: `Updated RBAC permissions matrix for role ${existing.name}`,
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'role',
        entityId: id,
        action: 'UPDATE_PERMISSIONS',
        step: `Updated RBAC permissions matrix for role ${existing.name}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });

    const list = await this.findAll();
    return list.find((r) => r.id === id);
  }
}
