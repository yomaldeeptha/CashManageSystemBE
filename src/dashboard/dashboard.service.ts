import { ForbiddenException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { formatIsoDate, toDecimal, toNumber } from '../common/utils/decimal.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxResolver: ExchangeRateResolverService,
  ) {}

  async getSummary(
    user: AuthenticatedUser,
    query?: { companyId?: number; outletId?: string; date?: string },
  ) {
    const scope = await getEffectiveScope(this.prisma, user);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    if (
      query?.companyId &&
      !scope.unrestricted &&
      !scope.companyIds.includes(query.companyId)
    ) {
      throw new ForbiddenException(
        `You are not authorized to view Dashboard data for Company ID ${query.companyId}.`,
      );
    }

    const parsedOutletId =
      query?.outletId && query.outletId !== 'all' ? Number(query.outletId) : null;
    if (
      parsedOutletId !== null &&
      !Number.isNaN(parsedOutletId) &&
      !scope.unrestricted &&
      !scope.outletIds.includes(parsedOutletId)
    ) {
      throw new ForbiddenException(
        `You are not authorized to view Dashboard data for Outlet ID ${parsedOutletId}.`,
      );
    }

    const companyIds = query?.companyId ? [query.companyId] : scope.companyIds;
    const outletIds =
      parsedOutletId !== null && !Number.isNaN(parsedOutletId)
        ? [parsedOutletId]
        : scope.outletIds;

    const dateFilter = query?.date
      ? (() => {
          const parsed = new Date(`${query.date}T00:00:00.000Z`);
          if (Number.isNaN(parsed.getTime())) return undefined;
          const end = new Date(parsed.getTime() + 24 * 60 * 60 * 1000 - 1);
          return { gte: parsed, lte: end };
        })()
      : undefined;

    const [
      outlets,
      activeCashDeposits,
      periodDeposits,
      pettyRequests,
      recons,
      ious,
      pendingApprovals,
      openVariances,
      floatAccounts,
    ] = await Promise.all([
      this.prisma.outlet.findMany({
        where: {
          isActive: true,
          ...(outletIds.length > 0 ? { id: { in: outletIds } } : { id: -1 }),
          ...(companyIds.length > 0 ? { branch: { companyId: { in: companyIds } } } : {}),
        },
        include: { branch: true },
        orderBy: { id: 'asc' },
      }),
      // All active unbanked deposits in scope (cash currently in hand / transit regardless of slip date)
      this.prisma.cashDeposit.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          status: { notIn: ['Posted', 'Rejected', 'Cancelled', 'Reversed'] },
        },
        include: {
          outlet: true,
          currencies: { include: { currency: true } },
        },
        orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
      }),
      // Recent deposits in scope (optionally date-filtered for readiness matrix)
      this.prisma.cashDeposit.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          ...(dateFilter ? { collectionDate: dateFilter } : {}),
        },
        include: { outlet: true },
        orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.pettyCashRequest.findMany({
        where: {
          companyId: { in: companyIds },
          branchId: { in: scope.branchIds },
          ...(parsedOutletId !== null && !Number.isNaN(parsedOutletId)
            ? { outletId: parsedOutletId }
            : {}),
        },
        include: { department: true, requestedBy: true },
        orderBy: [{ requestDate: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
      this.prisma.salesReconciliation.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
        },
        include: { outlet: true, shift: true },
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
        take: 100,
      }),
      this.prisma.pettyCashIOU.findMany({
        where: {
          OR: [
            {
              advance: {
                companyId: { in: companyIds },
                branchId: { in: scope.branchIds },
              },
            },
            ...(scope.unrestricted ? [{ advanceId: null }] : []),
          ],
        },
      }),
      this.prisma.approvalInstance.findMany({
        where: {
          status: { in: ['Pending', 'In Review'] },
          companyId: { in: companyIds },
          ...(!scope.unrestricted || (parsedOutletId !== null && !Number.isNaN(parsedOutletId))
            ? { OR: [{ outletId: null }, { outletId: { in: outletIds } }] }
            : {}),
        },
      }),
      this.prisma.varianceIncident.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          auditStatus: 'Investigating',
        },
      }),
      this.prisma.floatAccount.findMany({
        where: {
          isActive: true,
          ...(parsedOutletId !== null && !Number.isNaN(parsedOutletId)
            ? { OR: [{ outletId: null }, { outletId: parsedOutletId }] }
            : !scope.unrestricted
              ? { OR: [{ outletId: null }, { outletId: { in: outletIds } }] }
              : {}),
        },
        select: { baseLimit: true, currentBalance: true },
      }),
    ]);

    const [screensCount, seriesCount, notifCount, printCount] = await Promise.all([
      this.prisma.screen.count({ where: { isActive: true } }),
      this.prisma.numberSeries.count({ where: { status: 'Active' } }),
      this.prisma.notificationTemplate.count({ where: { isActive: true } }),
      this.prisma.printTemplate.count({ where: { isActive: true } }),
    ]);

    // 1. Daily Close Readiness (prefer selected-date recons if present, otherwise latest outlet recon)
    const reconsForDate = dateFilter
      ? recons.filter((r) => r.docDate >= dateFilter.gte && r.docDate <= dateFilter.lte)
      : recons;
    const effectiveRecons = reconsForDate.length > 0 ? reconsForDate : recons;
    const closedOutletIds = new Set(
      effectiveRecons
        .filter((r) => ['Approved', 'Posted', 'Locked'].includes(r.status))
        .map((r) => r.outletId),
    );
    const totalOutlets = outlets.length;
    const completedOutlets = outlets.filter((o) => closedOutletIds.has(o.id)).length;
    const readinessPct = totalOutlets > 0 ? Math.round((completedOutlets / totalOutlets) * 100) : 0;

    // 2. Cash in Hand (all active unbanked deposits in scope)
    const cashInHandBase = activeCashDeposits.reduce(
      (sum, d) => sum.plus(toDecimal(d.totalBaseAmount)),
      new Decimal(0),
    );
    const curTotals: Record<string, Decimal> = {};
    for (const d of activeCashDeposits) {
      for (const c of d.currencies) {
        const code = c.currency.code;
        curTotals[code] = (curTotals[code] || new Decimal(0)).plus(toDecimal(c.amount));
      }
    }
    const breakdownParts = Object.entries(curTotals).map(
      ([code, amt]) => `${code} ${toNumber(amt).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    );

    // 3. Unreconciled Sales Variance (exclude Approved / Posted / Locked reconciliations)
    const varianceRecons = effectiveRecons.filter(
      (r) =>
        !['Approved', 'Posted', 'Locked'].includes(r.status) &&
        toDecimal(r.varianceAmount).abs().gte(0.01),
    );
    const totalUnreconciledAbs = varianceRecons.reduce(
      (sum, r) => sum.plus(toDecimal(r.varianceAmount).abs()),
      new Decimal(0),
    );

    // 4. Pending IOUs & Float Limit
    const todayMs = Date.now();
    const openIous = ious
      .map((iou) => ({
        pending: Decimal.max(
          0,
          toDecimal(iou.advAmount).minus(toDecimal(iou.settledAmount)).minus(toDecimal(iou.returnAmount)),
        ),
        ageDays: Math.max(0, Math.floor((todayMs - iou.docDate.getTime()) / (1000 * 60 * 60 * 24))),
      }))
      .filter((x) => x.pending.gt(0));

    const totalPendingIou = openIous.reduce((s, x) => s.plus(x.pending), new Decimal(0));
    const oldestDays = openIous.reduce((max, x) => Math.max(max, x.ageDays), 0);
    const floatLimitBase = floatAccounts.reduce(
      (s, f) => s.plus(toDecimal(f.baseLimit)),
      new Decimal(0),
    );
    const floatBalanceBase = floatAccounts.reduce(
      (s, f) => s.plus(toDecimal(f.currentBalance)),
      new Decimal(0),
    );

    // 5. Approvals Queue
    const depApprovals = pendingApprovals.filter((a) => a.entityType === 'cash_deposit').length;
    const pcrApprovals = pendingApprovals.filter((a) => a.entityType === 'petty_cash_request').length;
    const srecApprovals = pendingApprovals.filter((a) => a.entityType === 'sales_reconciliation').length;

    // 6. Control Exceptions
    const rejectedDeposits = periodDeposits.filter((d) => d.status === 'Rejected').length;
    const totalExceptions = openVariances.length + rejectedDeposits;

    // Outlet Readiness Matrix
    const depositsPool = periodDeposits.length > 0 ? periodDeposits : activeCashDeposits;
    const outletReadiness = outlets.map((o) => {
      const latestRecon = effectiveRecons.find((r) => r.outletId === o.id);
      const latestDeposit = depositsPool.find((d) => d.outletId === o.id);
      return {
        outletId: o.id,
        outlet: o.name,
        branch: o.branch.name,
        shift1: latestRecon
          ? latestRecon.varianceStatus.includes('Matched')
            ? 'Closed & Matched'
            : `Closed (${latestRecon.varianceStatus})`
          : 'Active Shift',
        cashDeposit: latestDeposit
          ? `${latestDeposit.docNo} (${latestDeposit.status})`
          : 'Pending Handover',
        cashDepositId: latestDeposit?.id || null,
        dayEndLock: latestRecon?.isPeriodLocked
          ? 'Locked'
          : latestRecon?.status === 'Approved'
            ? 'Ready'
            : latestRecon?.status === 'In Review'
              ? 'Pending Review'
              : 'Open',
      };
    });

    // Recent real database activities across all 3 core transaction modules
    const recentActivities = [
      ...activeCashDeposits.slice(0, 5).map((d) => ({
        id: `dep-${d.id}`,
        entityId: d.id,
        type: 'deposit',
        module: 'cash-deposit',
        docNo: d.docNo,
        date: formatIsoDate(d.collectionDate),
        label: d.outlet?.name || 'Outlet Deposit',
        amountBase: toNumber(d.totalBaseAmount),
        status: d.status,
      })),
      ...pettyRequests.slice(0, 5).map((p) => ({
        id: `pcr-${p.id}`,
        entityId: p.id,
        type: 'petty',
        module: 'petty-cash',
        docNo: p.requestId,
        date: formatIsoDate(p.requestDate),
        label: p.requestedBy?.name || p.department?.name || 'Petty Cash',
        amountBase: toNumber(p.baseAmount),
        status: p.status,
      })),
      ...recons.slice(0, 5).map((r) => ({
        id: `srec-${r.id}`,
        entityId: r.id,
        type: 'recon',
        module: 'sales-recon',
        docNo: r.docNo,
        date: formatIsoDate(r.docDate),
        label: `${r.outlet?.name || 'Outlet'}${r.shift?.name ? ` • ${r.shift.name}` : ''}`,
        amountBase: toNumber(r.netSales),
        status: r.status,
      })),
    ]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8);

    return {
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        baseCurrency: baseInfo.code,
        dailyCloseReadiness: {
          percentage: readinessPct,
          completed: completedOutlets,
          closedOutlets: completedOutlets,
          total: totalOutlets,
          totalOutlets,
          statusText: `${completedOutlets} of ${totalOutlets} Outlets Closed`,
        },
        cashInHand: {
          amountUSD: toNumber(cashInHandBase),
          amountBase: toNumber(cashInHandBase),
          baseCurrency: baseInfo.code,
          breakdown: breakdownParts.join(' | ') || `${baseInfo.code} 0`,
          trend: `${activeCashDeposits.length} active slips`,
        },
        unreconciledSales: {
          amountUSD: toNumber(totalUnreconciledAbs),
          amountBase: toNumber(totalUnreconciledAbs),
          exceptionsCount: varianceRecons.length,
          statusText:
            varianceRecons.length > 0
              ? `${varianceRecons.length} variance(s) open`
              : 'All Shifts Balanced',
        },
        pendingIOUs: {
          totalUSD: toNumber(totalPendingIou),
          totalBase: toNumber(totalPendingIou),
          count: openIous.length,
          oldestDays,
          floatLimitBase: toNumber(floatLimitBase),
          floatBalanceBase: toNumber(floatBalanceBase),
        },
        approvalQueue: {
          pendingCount: pendingApprovals.length,
          criticalCount: srecApprovals + depApprovals,
          statusText: `${depApprovals} Deposits, ${pcrApprovals} Petty Cash, ${srecApprovals} Recons`,
        },
        exceptionCount: {
          total: totalExceptions,
          shortages: openVariances.length,
          missingSlips: rejectedDeposits,
          statusText:
            totalExceptions > 0 ? 'Action Required' : 'No Active Exceptions',
        },
      },
      outletStatusRows: outletReadiness,
      recentActivities,
      counts: {
        cashDeposits: activeCashDeposits.length,
        pettyCash: pettyRequests.length,
        salesReconciliations: recons.length,
        approvals: pendingApprovals.length,
        screens: screensCount,
        numberSeries: seriesCount,
        notificationTemplates: notifCount,
        printTemplates: printCount,
        masterCatalogs: 25,
      },
    };
  }
}
