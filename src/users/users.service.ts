import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangeLogService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CreateUserDto,
  CreateUserGroupDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/users.dto';

function extractNumericIds(tokens?: Array<number | string>): number[] {
  if (!Array.isArray(tokens)) return [];
  const result = new Set<number>();
  for (const token of tokens) {
    if (typeof token === 'number' && Number.isInteger(token)) {
      result.add(token);
      continue;
    }
    const str = String(token || '').trim();
    const match = /(\d+)$/.exec(str);
    if (match) {
      result.add(Number(match[1]));
    }
  }
  return Array.from(result);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() private readonly changeLogService?: ChangeLogService,
  ) {}

  private serializeUser(
    u: Prisma.UserGetPayload<{
      include: {
        role: true;
        userGroup: true;
        companyAccess: true;
        branchAccess: true;
        outletAccess: true;
        departmentAccess: true;
        menuAuthorizations: true;
      };
    }>,
  ) {
    return {
      systemUserId: u.id,
      id: u.id,
      userName: u.username,
      fullName: u.fullName,
      email: u.email,
      empNo: u.empNo || `EMP-${u.id}`,
      designation: u.designation || u.role.name,
      contactNo: u.contactNo || '',
      address: u.address || '',
      remark: u.remark || '',
      avatar: u.avatar || u.fullName.slice(0, 2).toUpperCase(),
      status: u.isActive ? 1 : 0,
      isConfirmEmail: u.isConfirmEmail,
      isTemporaryPassword: u.isTemporaryPassword,
      requireChangeOnLogin: u.requireChangeOnLogin,
      twoFactorEnabled: u.twoFactorEnabled,
      systemUserRoleId: u.roleId,
      roleCode: u.role.code,
      roleName: u.role.name,
      userGroupId: u.userGroup?.userGroupId || '',
      userGroupName: u.userGroup?.name || '',
      navMenuMode: u.navMenuMode,
      docSectionMode: u.docSectionMode,
      preferences: u.preferences || {},
      selectedBusiness: u.companyAccess.map((c) => c.companyId),
      selectedBranch: u.branchAccess.map((b) => b.branchId),
      selectedOutlet: u.outletAccess.map((o) => o.outletId),
      selectedDepartment: u.departmentAccess.map((d) => d.departmentId),
      authorization: u.menuAuthorizations.map((m) => ({
        menuId: m.menuId,
        auth: m.authLevel,
      })),
    };
  }

  async findAll(query?: {
    search?: string;
    roleId?: number;
    groupId?: string;
    status?: string;
  }) {
    const where: Prisma.UserWhereInput = {};
    if (query?.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.roleId) where.roleId = Number(query.roleId);
    if (query?.status === '1') where.isActive = true;
    if (query?.status === '0') where.isActive = false;
    if (query?.groupId) {
      where.userGroup = { userGroupId: query.groupId };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: true,
        userGroup: true,
        companyAccess: true,
        branchAccess: true,
        outletAccess: true,
        departmentAccess: true,
        menuAuthorizations: true,
      },
      orderBy: { id: 'asc' },
    });

    return users.map((u) => this.serializeUser(u));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        userGroup: true,
        companyAccess: true,
        branchAccess: true,
        outletAccess: true,
        departmentAccess: true,
        menuAuthorizations: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found.`);
    }
    return this.serializeUser(user);
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.systemUserRoleId } });
    if (!role) {
      throw new BadRequestException(`Role ID ${dto.systemUserRoleId} does not exist.`);
    }
    if (role.code === 'ADM' && actor.roleCode !== 'ADM') {
      throw new ForbiddenException('Only System Administrators can provision ADM users.');
    }
    if (dto.userName.trim().toLowerCase() === 'system') {
      throw new BadRequestException('Username "system" is reserved for internal automation.');
    }

    let userGroupDbId: number | null = null;
    if (dto.userGroupId) {
      const grp = await this.prisma.userGroup.findUnique({
        where: { userGroupId: dto.userGroupId },
      });
      if (grp) userGroupDbId = grp.id;
    }

    const hasExplicitPassword = Boolean(dto.password && dto.password.trim().length > 0);
    const effectivePassword = hasExplicitPassword
      ? dto.password!.trim()
      : crypto.randomBytes(16).toString('base64url');
    const passwordHash = await bcrypt.hash(effectivePassword, 12);
    const companyIds = extractNumericIds(dto.selectedBusiness);
    const branchIds = extractNumericIds(dto.selectedBranch);
    const outletIds = extractNumericIds(dto.selectedOutlet);
    const departmentIds = extractNumericIds(dto.selectedDepartment);
    const initials = dto.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('');

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.userName.trim().toLowerCase(),
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          isTemporaryPassword: !hasExplicitPassword,
          requireChangeOnLogin: !hasExplicitPassword,
          empNo: dto.empNo || null,
          designation: dto.designation || role.name,
          contactNo: dto.contactNo || null,
          address: dto.address || null,
          remark: dto.remark || null,
          avatar: initials || 'US',
          roleId: role.id,
          userGroupId: userGroupDbId,
          employeeId: dto.employeeId || null,
          isActive: dto.status === undefined ? true : dto.status === 1,
          isConfirmEmail: dto.isConfirmEmail ?? true,
          navMenuMode: dto.navMenuMode || 'both',
          docSectionMode: dto.docSectionMode || 'boxes',
          createUserId: actor.id,
          updateUserId: actor.id,
        },
      });

      if (companyIds.length > 0) {
        await tx.userCompanyAccess.createMany({
          data: companyIds.map((companyId) => ({
            userId: user.id,
            companyId,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }
      if (branchIds.length > 0) {
        await tx.userBranchAccess.createMany({
          data: branchIds.map((branchId) => ({
            userId: user.id,
            branchId,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }
      if (outletIds.length > 0) {
        await tx.userOutletAccess.createMany({
          data: outletIds.map((outletId) => ({
            userId: user.id,
            outletId,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }
      if (departmentIds.length > 0) {
        await tx.userDepartmentAccess.createMany({
          data: departmentIds.map((departmentId) => ({
            userId: user.id,
            departmentId,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }
      if (dto.authorization && dto.authorization.length > 0) {
        await tx.userMenuAuthorization.createMany({
          data: dto.authorization.map((a) => ({
            userId: user.id,
            menuId: a.menuId,
            authLevel: a.auth,
            createUserId: actor.id,
            updateUserId: actor.id,
          })),
          skipDuplicates: true,
        });
      }

      // Seed default screen authorizations from userGroup if provided
      if (userGroupDbId) {
        const grp = await tx.userGroup.findUnique({
          where: { id: userGroupDbId },
          include: { screenDefaults: true },
        });
        const allScreens = await tx.screen.findMany();
        if (grp?.isAllFullAuth) {
          await tx.userScreenAuthorization.createMany({
            data: allScreens.map((s) => ({
              userId: user.id,
              screenId: s.id,
              authLevel: 0,
              canAccess: true,
              canCreate: true,
              canEdit: true,
              canApprove: true,
              canExport: true,
              createUserId: actor.id,
              updateUserId: actor.id,
            })),
            skipDuplicates: true,
          });
        } else if (grp && grp.screenDefaults.length > 0) {
          const defMap = new Map(grp.screenDefaults.map((d) => [d.screenId, d]));
          await tx.userScreenAuthorization.createMany({
            data: allScreens.map((s) => {
              const d = defMap.get(s.id);
              return {
                userId: user.id,
                screenId: s.id,
                authLevel: d?.authLevel ?? 6,
                canAccess: d?.canAccess ?? false,
                canCreate: d?.canCreate ?? false,
                canEdit: d?.canEdit ?? false,
                canApprove: d?.canApprove ?? false,
                canExport: d?.canExport ?? false,
                createUserId: actor.id,
                updateUserId: actor.id,
              };
            }),
            skipDuplicates: true,
          });
        }
      }

      if (this.changeLogService) {
        await this.changeLogService.logCreate({
          tableName: 'User',
          recordId: user.id,
          recordCode: user.username,
          newValues: { ...user, companyIds, branchIds, outletIds, departmentIds },
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'user',
        entityId: user.id,
        action: 'CREATE',
        step: `Provisioned user ${user.username} (${role.name})`,
        toStatus: user.isActive ? 'Active' : 'Inactive',
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return user;
    });

    return this.findOne(created.id);
  }

  async update(actor: AuthenticatedUser, id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        companyAccess: true,
        branchAccess: true,
        outletAccess: true,
        departmentAccess: true,
      },
    });
    if (!existing) {
      throw new NotFoundException(`User #${id} not found.`);
    }
    if (existing.username === 'system') {
      throw new ForbiddenException('The internal system automation account cannot be modified.');
    }
    if (existing.role.code === 'ADM' && actor.roleCode !== 'ADM') {
      throw new ForbiddenException('Only System Administrators can modify ADM accounts.');
    }
    if (dto.systemUserRoleId !== undefined) {
      const nextRole = await this.prisma.role.findUnique({ where: { id: dto.systemUserRoleId } });
      if (!nextRole) {
        throw new BadRequestException(`Role ID ${dto.systemUserRoleId} does not exist.`);
      }
      if (nextRole.code === 'ADM' && actor.roleCode !== 'ADM') {
        throw new ForbiddenException('Only System Administrators can assign the ADM role.');
      }
    }

    let userGroupDbId: number | null | undefined = undefined;
    if (dto.userGroupId !== undefined) {
      if (!dto.userGroupId) {
        userGroupDbId = null;
      } else {
        const grp = await this.prisma.userGroup.findUnique({
          where: { userGroupId: dto.userGroupId },
        });
        userGroupDbId = grp ? grp.id : null;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
          ...(dto.empNo !== undefined ? { empNo: dto.empNo } : {}),
          ...(dto.designation !== undefined ? { designation: dto.designation } : {}),
          ...(dto.contactNo !== undefined ? { contactNo: dto.contactNo } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.systemUserRoleId !== undefined ? { roleId: dto.systemUserRoleId } : {}),
          ...(userGroupDbId !== undefined ? { userGroupId: userGroupDbId } : {}),
          ...(dto.status !== undefined ? { isActive: dto.status === 1 } : {}),
          ...(dto.isConfirmEmail !== undefined ? { isConfirmEmail: dto.isConfirmEmail } : {}),
          ...(dto.navMenuMode !== undefined ? { navMenuMode: dto.navMenuMode } : {}),
          ...(dto.docSectionMode !== undefined ? { docSectionMode: dto.docSectionMode } : {}),
          updateUserId: actor.id,
        },
      });

      if (dto.selectedBusiness !== undefined) {
        const ids = extractNumericIds(dto.selectedBusiness);
        await tx.userCompanyAccess.deleteMany({ where: { userId: id } });
        if (ids.length > 0) {
          await tx.userCompanyAccess.createMany({
            data: ids.map((companyId) => ({ userId: id, companyId, createUserId: actor.id, updateUserId: actor.id })),
            skipDuplicates: true,
          });
        }
      }
      if (dto.selectedBranch !== undefined) {
        const ids = extractNumericIds(dto.selectedBranch);
        await tx.userBranchAccess.deleteMany({ where: { userId: id } });
        if (ids.length > 0) {
          await tx.userBranchAccess.createMany({
            data: ids.map((branchId) => ({ userId: id, branchId, createUserId: actor.id, updateUserId: actor.id })),
            skipDuplicates: true,
          });
        }
      }
      if (dto.selectedOutlet !== undefined) {
        const ids = extractNumericIds(dto.selectedOutlet);
        await tx.userOutletAccess.deleteMany({ where: { userId: id } });
        if (ids.length > 0) {
          await tx.userOutletAccess.createMany({
            data: ids.map((outletId) => ({ userId: id, outletId, createUserId: actor.id, updateUserId: actor.id })),
            skipDuplicates: true,
          });
        }
      }
      if (dto.selectedDepartment !== undefined) {
        const ids = extractNumericIds(dto.selectedDepartment);
        await tx.userDepartmentAccess.deleteMany({ where: { userId: id } });
        if (ids.length > 0) {
          await tx.userDepartmentAccess.createMany({
            data: ids.map((departmentId) => ({ userId: id, departmentId, createUserId: actor.id, updateUserId: actor.id })),
            skipDuplicates: true,
          });
        }
      }
      if (dto.authorization !== undefined) {
        await tx.userMenuAuthorization.deleteMany({ where: { userId: id } });
        if (dto.authorization.length > 0) {
          await tx.userMenuAuthorization.createMany({
            data: dto.authorization.map((a) => ({
              userId: id,
              menuId: a.menuId,
              authLevel: a.auth,
              createUserId: actor.id,
              updateUserId: actor.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (this.changeLogService) {
        const oldCompanies = existing.companyAccess.map((c) => c.companyId).sort((a, b) => a - b);
        const oldBranches = existing.branchAccess.map((b) => b.branchId).sort((a, b) => a - b);
        const oldOutlets = existing.outletAccess.map((o) => o.outletId).sort((a, b) => a - b);
        const oldDepts = existing.departmentAccess.map((d) => d.departmentId).sort((a, b) => a - b);
        const nextCompanies = dto.selectedBusiness !== undefined ? extractNumericIds(dto.selectedBusiness).sort((a, b) => a - b) : oldCompanies;
        const nextBranches = dto.selectedBranch !== undefined ? extractNumericIds(dto.selectedBranch).sort((a, b) => a - b) : oldBranches;
        const nextOutlets = dto.selectedOutlet !== undefined ? extractNumericIds(dto.selectedOutlet).sort((a, b) => a - b) : oldOutlets;
        const nextDepts = dto.selectedDepartment !== undefined ? extractNumericIds(dto.selectedDepartment).sort((a, b) => a - b) : oldDepts;

        await this.changeLogService.logUpdate({
          tableName: 'User',
          recordId: id,
          recordCode: updatedUser.username,
          oldValues: {
            fullName: existing.fullName,
            email: existing.email,
            empNo: existing.empNo,
            designation: existing.designation,
            roleId: existing.roleId,
            userGroupId: existing.userGroupId,
            isActive: existing.isActive,
            companyIds: oldCompanies,
            branchIds: oldBranches,
            outletIds: oldOutlets,
            departmentIds: oldDepts,
          },
          newValues: {
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            empNo: updatedUser.empNo,
            designation: updatedUser.designation,
            roleId: updatedUser.roleId,
            userGroupId: updatedUser.userGroupId,
            isActive: updatedUser.isActive,
            companyIds: nextCompanies,
            branchIds: nextBranches,
            outletIds: nextOutlets,
            departmentIds: nextDepts,
          },
          actor,
          tx,
        });
      }

      await this.auditService.log({
        entityType: 'user',
        entityId: id,
        action: 'UPDATE',
        step: `Updated user profile & access boundaries for ${existing.username}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });

    return this.findOne(id);
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: user.id } });
      if (!existing) throw new NotFoundException(`User #${user.id} not found.`);
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
          ...(dto.contactNo !== undefined ? { contactNo: dto.contactNo } : {}),
          ...(dto.designation !== undefined ? { designation: dto.designation } : {}),
          ...(dto.address !== undefined ? { address: dto.address } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.navMenuMode !== undefined ? { navMenuMode: dto.navMenuMode } : {}),
          ...(dto.docSectionMode !== undefined ? { docSectionMode: dto.docSectionMode } : {}),
          ...(dto.twoFactorEnabled !== undefined ? { twoFactorEnabled: dto.twoFactorEnabled } : {}),
          ...(dto.preferences !== undefined
            ? { preferences: dto.preferences as Prisma.InputJsonValue }
            : {}),
          updateUserId: user.id,
        },
      });
      if (this.changeLogService) {
        await this.changeLogService.logUpdate({
          tableName: 'User',
          recordId: user.id,
          recordCode: updated.username,
          oldValues: existing,
          newValues: updated,
          actor: user,
          tx,
        });
      }
    });
    return this.findOne(user.id);
  }

  async toggleStatus(actor: AuthenticatedUser, id: number) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!existing) throw new NotFoundException(`User #${id} not found.`);
    if (existing.username === 'system') {
      throw new ForbiddenException('The internal system automation account cannot be activated or modified.');
    }
    if (existing.role.code === 'ADM' && actor.roleCode !== 'ADM') {
      throw new ForbiddenException('Only System Administrators can toggle ADM account status.');
    }
    if (existing.id === actor.id) {
      throw new BadRequestException('You cannot deactivate your own active account.');
    }
    const nextActive = !existing.isActive;
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { isActive: nextActive, updateUserId: actor.id },
      });
      if (!nextActive) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'STATUS_CHANGE',
          tableName: 'User',
          recordId: id,
          recordCode: existing.username,
          oldValues: { isActive: existing.isActive },
          newValues: { isActive: updated.isActive },
          description: `Set user ${existing.username} status to ${nextActive ? 'Active' : 'Inactive'}`,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'user',
        entityId: id,
        action: 'TOGGLE_STATUS',
        step: `Set user ${existing.username} status to ${nextActive ? 'Active' : 'Inactive'}`,
        fromStatus: existing.isActive ? 'Active' : 'Inactive',
        toStatus: nextActive ? 'Active' : 'Inactive',
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return this.findOne(id);
  }

  async resetPassword(actor: AuthenticatedUser, id: number, dto: ResetPasswordDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!existing) throw new NotFoundException(`User #${id} not found.`);
    if (existing.username === 'system') {
      throw new ForbiddenException('The internal system automation account cannot have its password reset.');
    }
    if (existing.role.code === 'ADM' && actor.roleCode !== 'ADM') {
      throw new ForbiddenException('Only System Administrators can reset ADM passwords.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          isTemporaryPassword: true,
          requireChangeOnLogin: dto.requireChangeOnLogin ?? true,
          updateUserId: actor.id,
        },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (this.changeLogService) {
        await this.changeLogService.logAction({
          action: 'STATUS_CHANGE',
          tableName: 'User',
          recordId: id,
          recordCode: existing.username,
          oldValues: {
            isTemporaryPassword: existing.isTemporaryPassword,
            requireChangeOnLogin: existing.requireChangeOnLogin,
          },
          newValues: {
            isTemporaryPassword: updated.isTemporaryPassword,
            requireChangeOnLogin: updated.requireChangeOnLogin,
          },
          description: `Administrator reset password for ${existing.username} (credentials redacted)`,
          actor,
          tx,
        });
      }
      await this.auditService.log({
        entityType: 'user',
        entityId: id,
        action: 'PASSWORD_RESET',
        step: `Administrator reset password for ${existing.username}`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });
    });
    return { reset: true, userId: id };
  }

  // ---- User Groups ----
  async listGroups() {
    const groups = await this.prisma.userGroup.findMany({
      include: {
        defaultRole: true,
        _count: { select: { users: true } },
        screenDefaults: { include: { screen: true } },
      },
      orderBy: { id: 'asc' },
    });

    return groups.map((g) => ({
      id: g.id,
      userGroupId: g.userGroupId,
      code: g.groupCode,
      name: g.name,
      description: g.description || '',
      defaultRoleId: g.defaultRoleId,
      defaultRoleName: g.defaultRole.name,
      defaultBadge: g.defaultBadge,
      membersCount: g._count.users,
      defaultScreens: g.isAllFullAuth
        ? 'ALL_FULL_AUTH'
        : g.screenDefaults.map((sd) => ({
            screenId: sd.screen.screenId,
            authLevel: sd.authLevel,
            canAccess: sd.canAccess,
            canCreate: sd.canCreate,
            canEdit: sd.canEdit,
            canApprove: sd.canApprove,
            canExport: sd.canExport,
          })),
    }));
  }

  async saveGroup(actor: AuthenticatedUser, dto: CreateUserGroupDto) {
    const code = dto.code.trim().toUpperCase();
    const userGroupId = dto.userGroupId || `UG-${code.replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

    const saved = await this.prisma.$transaction(async (tx) => {
      const existingGroup = await tx.userGroup.findUnique({ where: { userGroupId } });
      const group = await tx.userGroup.upsert({
        where: { userGroupId },
        create: {
          userGroupId,
          groupCode: code,
          name: dto.name.trim(),
          description: dto.description || '',
          defaultRoleId: dto.defaultRoleId,
          defaultBadge: dto.defaultBadge || 'User',
          isAllFullAuth: dto.isAllFullAuth ?? false,
          createUserId: actor.id,
          updateUserId: actor.id,
        },
        update: {
          groupCode: code,
          name: dto.name.trim(),
          description: dto.description || '',
          defaultRoleId: dto.defaultRoleId,
          defaultBadge: dto.defaultBadge || 'User',
          isAllFullAuth: dto.isAllFullAuth ?? false,
          updateUserId: actor.id,
        },
      });

      if (dto.defaultScreens && dto.defaultScreens.length > 0) {
        await tx.userGroupScreenDefault.deleteMany({ where: { userGroupId: group.id } });
        const screens = await tx.screen.findMany({
          where: { screenId: { in: dto.defaultScreens.map((s) => s.screenId) } },
        });
        const screenByCode = new Map(screens.map((s) => [s.screenId, s.id]));
        const rows = dto.defaultScreens
          .map((sd) => {
            const screenDbId = screenByCode.get(sd.screenId);
            if (!screenDbId) return null;
            return {
              userGroupId: group.id,
              screenId: screenDbId,
              authLevel: sd.authLevel,
              canAccess: sd.canAccess,
              canCreate: sd.canCreate,
              canEdit: sd.canEdit,
              canApprove: sd.canApprove,
              canExport: sd.canExport,
              createUserId: actor.id,
              updateUserId: actor.id,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);
        if (rows.length > 0) {
          await tx.userGroupScreenDefault.createMany({ data: rows });
        }
      }

      if (this.changeLogService) {
        if (existingGroup) {
          await this.changeLogService.logUpdate({
            tableName: 'UserGroup',
            recordId: group.id,
            recordCode: group.userGroupId,
            oldValues: existingGroup,
            newValues: group,
            actor,
            tx,
          });
        } else {
          await this.changeLogService.logCreate({
            tableName: 'UserGroup',
            recordId: group.id,
            recordCode: group.userGroupId,
            newValues: group,
            actor,
            tx,
          });
        }
      }

      await this.auditService.log({
        entityType: 'user_group',
        entityId: group.id,
        action: 'SAVE',
        step: `Saved User Group ${group.name} (${group.groupCode})`,
        performedById: actor.id,
        performedByName: actor.fullName,
        tx,
      });

      return group;
    });

    const all = await this.listGroups();
    return all.find((g) => g.id === saved.id) || all[0];
  }
}
