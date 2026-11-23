import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
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
        })),
      });
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
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Role #${id} not found.`);
    await this.prisma.role.update({
      where: { id },
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description || '',
        isActive: dto.status === undefined ? existing.isActive : dto.status === 1,
      },
    });
    await this.auditService.log({
      entityType: 'role',
      entityId: id,
      action: 'UPDATE',
      step: `Updated Role ${dto.name}`,
      performedById: actor.id,
      performedByName: actor.fullName,
    });
    const list = await this.findAll();
    return list.find((r) => r.id === id);
  }

  async updatePermissions(
    actor: AuthenticatedUser,
    id: number,
    dto: UpdateRolePermissionsDto,
  ) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Role #${id} not found.`);

    await this.prisma.$transaction(async (tx) => {
      for (const [moduleKey, perms] of Object.entries(dto.permissions)) {
        await tx.rolePermission.upsert({
          where: { roleId_moduleKey: { roleId: id, moduleKey } },
          create: {
            roleId: id,
            moduleKey,
            canRead: Boolean(perms.read),
            canCreate: Boolean(perms.create),
            canUpdate: Boolean(perms.update),
            canDelete: Boolean(perms.delete),
            canApprove: Boolean(perms.approve),
            canUnblock: Boolean(perms.unblock),
          },
          update: {
            canRead: Boolean(perms.read),
            canCreate: Boolean(perms.create),
            canUpdate: Boolean(perms.update),
            canDelete: Boolean(perms.delete),
            canApprove: Boolean(perms.approve),
            canUnblock: Boolean(perms.unblock),
          },
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
