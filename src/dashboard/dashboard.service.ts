import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { toDecimal, toNumber } from '../common/utils/decimal.util';

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

    const companyIds =
      query?.companyId && (scope.unrestricted || scope.companyIds.includes(query.companyId))
        ? [query.companyId]
        : scope.companyIds;

    const outletIds =
      query?.outletId && query.outletId !== 'all'
        ? [Number(query.outletId)].filter((id) => scope.unrestricted || scope.outletIds.includes(id))
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
      deposits,
      pettyRequests,
      recons,
      ious,
      pendingApprovals,
      openVariances,
      screensCount,
      seriesCount,
    ] = await Promise.all([
      this.prisma.outlet.findMany({
        where: {
          isActive: true,
          id: { in: outletIds },
          branch: { companyId: { in: companyIds } },
        },
        include: { branch: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.cashDeposit.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          ...(dateFilter ? { collectionDate: dateFilter } : {}),
        },
        include: { currencies: { include: { currency: true } } },
        orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.pettyCashRequest.findMany({
        where: {
          companyId: { in: companyIds },
          branchId: { in: scope.branchIds },
          ...(dateFilter ? { requestDate: dateFilter } : {}),
        },
        orderBy: [{ requestDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.salesReconciliation.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          ...(dateFilter ? { docDate: dateFilter } : {}),
        },
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.pettyCashIOU.findMany({
        where: {
          advance: {
            companyId: { in: companyIds },
            branchId: { in: scope.branchIds },
          },
        },
      }),
      this.prisma.approvalInstance.findMany({
        where: {
          status: { in: ['Pending', 'In Review'] },
          companyId: { in: companyIds },
          ...(!scope.unrestricted
            ? { OR: [{ outletId: null }, { outletId: { in: outletIds } }] }
            : query?.outletId && query.outletId !== 'all'
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
      this.prisma.screen.count({ where: { isActive: true } }),
      this.prisma.numberSeries.count({ where: { status: 'Active' } }),
    ]);

    // 1. Daily Close Readiness
    const closedOutletIds = new Set(
      recons
        .filter((r) => ['Approved', 'Posted', 'Locked'].includes(r.status))
        .map((r) => r.outletId),
    );
    const totalOutlets = outlets.length;
    const completedOutlets = outlets.filter((o) => closedOutletIds.has(o.id)).length;
    const readinessPct = totalOutlets > 0 ? Math.round((completedOutlets / totalOutlets) * 100) : 0;

    // 2. Cash in Hand (active unbanked deposits — exclude Posted, Rejected, Cancelled, Reversed)
    const activeDeposits = deposits.filter(
      (d) => !['Posted', 'Rejected', 'Cancelled', 'Reversed'].includes(d.status),
    );
    const cashInHandBase = activeDeposits.reduce(
      (sum, d) => sum.plus(toDecimal(d.totalBaseAmount)),
      new Decimal(0),
    );
    const curTotals: Record<string, Decimal> = {};
    for (const d of activeDeposits) {
      for (const c of d.currencies) {
        const code = c.currency.code;
        curTotals[code] = (curTotals[code] || new Decimal(0)).plus(toDecimal(c.amount));
      }
    }
    const breakdownParts = Object.entries(curTotals).map(
      ([code, amt]) => `${code} ${toNumber(amt).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    );

    // 3. Unreconciled Sales Variance
    const varianceRecons = recons.filter((r) => toDecimal(r.varianceAmount).abs().gte(0.01));
    const totalUnreconciledAbs = varianceRecons.reduce(
      (sum, r) => sum.plus(toDecimal(r.varianceAmount).abs()),
      new Decimal(0),
    );

    // 4. Pending IOUs
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

    // 5. Approvals Queue
    const depApprovals = pendingApprovals.filter((a) => a.entityType === 'cash_deposit').length;
    const pcrApprovals = pendingApprovals.filter((a) => a.entityType === 'petty_cash_request').length;
    const srecApprovals = pendingApprovals.filter((a) => a.entityType === 'sales_reconciliation').length;

    // 6. Control Exceptions
    const rejectedDeposits = deposits.filter((d) => d.status === 'Rejected').length;
    const totalExceptions = openVariances.length + rejectedDeposits;

    // Outlet Readiness Matrix
    const outletReadiness = outlets.map((o) => {
      const latestRecon = recons.find((r) => r.outletId === o.id);
      const latestDeposit = deposits.find((d) => d.outletId === o.id);
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

    return {
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        dailyCloseReadiness: {
          percentage: readinessPct,
          completed: completedOutlets,
          total: totalOutlets,
          statusText: `${completedOutlets} of ${totalOutlets} Outlets Closed & Verified`,
        },
        cashInHand: {
          amountUSD: toNumber(cashInHandBase),
          amountBase: toNumber(cashInHandBase),
          baseCurrency: baseInfo.code,
          breakdown: breakdownParts.join(' | ') || `${baseInfo.code} 0`,
          trend: `${activeDeposits.length} active slips`,
        },
        unreconciledSales: {
          amountUSD: toNumber(totalUnreconciledAbs),
          amountBase: toNumber(totalUnreconciledAbs),
          exceptionsCount: varianceRecons.length,
          statusText:
            varianceRecons.length > 0
              ? `${varianceRecons.length} Variance awaiting explanation`
              : 'All Shifts Balanced',
        },
        pendingIOUs: {
          totalUSD: toNumber(totalPendingIou),
          totalBase: toNumber(totalPendingIou),
          count: openIous.length,
          oldestDays,
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
            totalExceptions > 0 ? 'Requires Operational Resolution' : 'No Active Exceptions',
        },
      },
      outletStatusRows: outletReadiness,
      counts: {
        cashDeposits: deposits.length,
        pettyCash: pettyRequests.length,
        salesReconciliations: recons.length,
        approvals: pendingApprovals.length,
        screens: screensCount,
        numberSeries: seriesCount,
      },
    };
  }
}
