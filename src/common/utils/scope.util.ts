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

let adminScopeCache: {
  expiresAt: number;
  companyIds: number[];
  branchIds: number[];
  outletIds: number[];
} | null = null;

export function invalidateAdminScopeCache(): void {
  adminScopeCache = null;
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
    const now = Date.now();
    if (adminScopeCache && adminScopeCache.expiresAt > now) {
      return {
        unrestricted: true,
        companyIds: adminScopeCache.companyIds,
        branchIds: adminScopeCache.branchIds,
        outletIds: adminScopeCache.outletIds,
      };
    }
    const [companies, branches, outlets] = await Promise.all([
      prisma.company.findMany({ select: { id: true } }),
      prisma.branch.findMany({ select: { id: true } }),
      prisma.outlet.findMany({ select: { id: true } }),
    ]);
    const companyIds = companies.map((c) => c.id);
    const branchIds = branches.map((b) => b.id);
    const outletIds = outlets.map((o) => o.id);
    if (process.env.NODE_ENV !== 'test') {
      adminScopeCache = {
        expiresAt: now + 15_000,
        companyIds,
        branchIds,
        outletIds,
      };
    }
    return {
      unrestricted: true,
      companyIds,
      branchIds,
      outletIds,
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

  let finalBranchId = branch ? branch.id : null;
  if (finalBranchId === null) {
    const fallbackBranch = await prisma.branch.findFirst({
      where: {
        companyId: company.id,
        ...(!scope.unrestricted ? { id: { in: scope.branchIds } } : {}),
      },
      orderBy: { id: 'asc' },
    });
    if (!fallbackBranch) {
      throw new BadRequestException(
        `No authorized operating branch is configured for Company "${company.name}".`,
      );
    }
    finalBranchId = fallbackBranch.id;
  }

  return {
    companyId: company.id,
    branchId: finalBranchId,
    outletId: outlet ? outlet.id : null,
  };
}

/**
 * Safely applies entity-scope filtering AND optional query filters without allowing
 * a scoped user to escape their authorized company/branch/outlet boundaries via query params.
 */
export function applyEntityScopeToWhere(
  where: Record<string, unknown>,
  scope: {
    unrestricted: boolean;
    companyIds: number[];
    branchIds: number[];
    outletIds: number[];
  },
  query?: {
    companyId?: number | string | null;
    branchId?: number | string | null;
    outletId?: number | string | null;
  },
  options?: {
    includeBranch?: boolean;
    includeOutlet?: boolean;
    allowNullOutlet?: boolean;
  },
): void {
  const includeBranch = options?.includeBranch ?? false;
  const includeOutlet = options?.includeOutlet ?? true;
  const allowNullOutlet = options?.allowNullOutlet ?? false;

  const requestedCompanyId =
    query?.companyId !== undefined &&
    query?.companyId !== null &&
    query?.companyId !== '' &&
    query?.companyId !== 'all'
      ? Number(query.companyId)
      : null;

  const requestedBranchId =
    query?.branchId !== undefined &&
    query?.branchId !== null &&
    query?.branchId !== '' &&
    query?.branchId !== 'all'
      ? Number(query.branchId)
      : null;

  const requestedOutletId =
    query?.outletId !== undefined &&
    query?.outletId !== null &&
    query?.outletId !== '' &&
    query?.outletId !== 'all'
      ? Number(query.outletId)
      : null;

  if (requestedCompanyId !== null && !Number.isNaN(requestedCompanyId)) {
    if (!scope.unrestricted && !scope.companyIds.includes(requestedCompanyId)) {
      throw new ForbiddenException(
        `You are not authorized to query Company ID ${requestedCompanyId}.`,
      );
    }
    where.companyId = requestedCompanyId;
  } else if (!scope.unrestricted) {
    where.companyId = { in: scope.companyIds };
  }

  if (includeBranch) {
    if (requestedBranchId !== null && !Number.isNaN(requestedBranchId)) {
      if (!scope.unrestricted && !scope.branchIds.includes(requestedBranchId)) {
        throw new ForbiddenException(
          `You are not authorized to query Branch ID ${requestedBranchId}.`,
        );
      }
      where.branchId = requestedBranchId;
    } else if (!scope.unrestricted) {
      where.branchId = { in: scope.branchIds };
    }
  }

  if (includeOutlet) {
    if (requestedOutletId !== null && !Number.isNaN(requestedOutletId)) {
      if (!scope.unrestricted && !scope.outletIds.includes(requestedOutletId)) {
        throw new ForbiddenException(
          `You are not authorized to query Outlet ID ${requestedOutletId}.`,
        );
      }
      where.outletId = requestedOutletId;
    } else if (!scope.unrestricted) {
      if (allowNullOutlet) {
        const existingAnd = Array.isArray(where.AND) ? (where.AND as unknown[]) : [];
        where.AND = [
          ...existingAnd,
          { OR: [{ outletId: null }, { outletId: { in: scope.outletIds } }] },
        ];
      } else {
        where.outletId = { in: scope.outletIds };
      }
    }
  }
}
