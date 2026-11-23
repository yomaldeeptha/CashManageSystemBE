import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export function isUnrestrictedAdmin(user: AuthenticatedUser): boolean {
  const isAdmin =
    user.roleCode === 'ADM' ||
    user.roleName.toLowerCase().includes('system administrator');
  const hasExplicitScope =
    user.companyIds.length > 0 ||
    user.branchIds.length > 0 ||
    user.outletIds.length > 0;
  return isAdmin && !hasExplicitScope;
}

export async function getEffectiveScope(
  prisma: PrismaService,
  user: AuthenticatedUser,
): Promise<{
  unrestricted: boolean;
  companyIds: number[];
  branchIds: number[];
  outletIds: number[];
}> {
  if (isUnrestrictedAdmin(user)) {
    const [companies, branches, outlets] = await Promise.all([
      prisma.company.findMany({ select: { id: true } }),
      prisma.branch.findMany({ select: { id: true } }),
      prisma.outlet.findMany({ select: { id: true } }),
    ]);
    return {
      unrestricted: true,
      companyIds: companies.map((c) => c.id),
      branchIds: branches.map((b) => b.id),
      outletIds: outlets.map((o) => o.id),
    };
  }

  const companySet = new Set<number>(user.companyIds);
  const directBranchSet = new Set<number>(user.branchIds);
  const directOutletSet = new Set<number>(user.outletIds);

  const allBranches = await prisma.branch.findMany({
    where: companySet.size > 0 ? { companyId: { in: Array.from(companySet) } } : undefined,
    select: { id: true, companyId: true },
  });
  const validBranchIds = new Set(allBranches.map((b) => b.id));

  const allOutlets = await prisma.outlet.findMany({
    where: { branchId: { in: Array.from(validBranchIds) } },
    select: { id: true, branchId: true },
  });

  const allowedOutlets = allOutlets.filter((o) => {
    if (directOutletSet.size === 0 && directBranchSet.size === 0) {
      return user.roleCode === 'ADM';
    }
    if (directOutletSet.size > 0) {
      return directOutletSet.has(o.id);
    }
    return directBranchSet.has(o.branchId);
  });

  const allowedOutletIds = allowedOutlets.map((o) => o.id);
  const outletBranchSet = new Set(allowedOutlets.map((o) => o.branchId));

  const allowedBranchIds = allBranches
    .filter((b) => directBranchSet.has(b.id) || outletBranchSet.has(b.id) || (user.roleCode === 'ADM' && directBranchSet.size === 0 && directOutletSet.size === 0))
    .map((b) => b.id);

  return {
    unrestricted: false,
    companyIds: Array.from(companySet),
    branchIds: allowedBranchIds,
    outletIds: allowedOutletIds,
  };
}

export async function assertEntityScope(
  prisma: PrismaService,
  user: AuthenticatedUser,
  target: { companyId?: number | null; branchId?: number | null; outletId?: number | null },
): Promise<{ companyId: number; branchId: number; outletId: number | null }> {
  let outlet = null;
  if (target.outletId !== undefined && target.outletId !== null) {
    outlet = await prisma.outlet.findUnique({
      where: { id: target.outletId },
      include: { branch: true },
    });
    if (!outlet) {
      throw new BadRequestException(`Outlet ID ${target.outletId} does not exist.`);
    }
  }

  const resolvedBranchId = target.branchId ?? outlet?.branchId ?? null;
  let branch = null;
  if (resolvedBranchId !== null) {
    branch = await prisma.branch.findUnique({
      where: { id: resolvedBranchId },
    });
    if (!branch) {
      throw new BadRequestException(`Branch ID ${resolvedBranchId} does not exist.`);
    }
  }

  const resolvedCompanyId = target.companyId ?? branch?.companyId ?? null;
  if (resolvedCompanyId === null) {
    throw new BadRequestException('Company is required.');
  }
  const company = await prisma.company.findUnique({ where: { id: resolvedCompanyId } });
  if (!company) {
    throw new BadRequestException(`Company ID ${resolvedCompanyId} does not exist.`);
  }

  if (branch && branch.companyId !== company.id) {
    throw new BadRequestException(
      `Branch "${branch.name}" does not belong to Company "${company.name}".`,
    );
  }
  if (outlet && branch && outlet.branchId !== branch.id) {
    throw new BadRequestException(
      `Outlet "${outlet.name}" does not belong to Branch "${branch.name}".`,
    );
  }

  const scope = await getEffectiveScope(prisma, user);
  if (!scope.unrestricted) {
    if (!scope.companyIds.includes(company.id)) {
      throw new ForbiddenException(
        `You are not authorized to access Company "${company.name}".`,
      );
    }
    if (branch && !scope.branchIds.includes(branch.id)) {
      throw new ForbiddenException(
        `You are not authorized to access Branch "${branch.name}".`,
      );
    }
    if (outlet && !scope.outletIds.includes(outlet.id)) {
      throw new ForbiddenException(
        `You are not authorized to access Outlet "${outlet.name}".`,
      );
    }
  }

  return {
    companyId: company.id,
    branchId: branch ? branch.id : (await prisma.branch.findFirst({ where: { companyId: company.id } }))?.id ?? 1,
    outletId: outlet ? outlet.id : null,
  };
}
