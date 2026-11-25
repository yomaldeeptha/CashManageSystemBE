import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { formatIsoDate, parseDateOnly, toDecimal, toNumber } from '../common/utils/decimal.util';

export interface ReportFilterQuery {
  dateRange?: string;
  fromDate?: string;
  toDate?: string;
  companyId?: number;
  outletId?: string;
  status?: string;
  search?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxResolver: ExchangeRateResolverService,
  ) {}

  private resolveDateBounds(query?: ReportFilterQuery): { gte?: Date; lte?: Date } | undefined {
    if (query?.fromDate || query?.toDate) {
      return {
        ...(query.fromDate ? { gte: parseDateOnly(query.fromDate) } : {}),
        ...(query.toDate ? { lte: parseDateOnly(query.toDate) } : {}),
      };
    }
    const range = query?.dateRange || 'all';
    if (range === 'all') return undefined;

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (range === 'today') {
      return { gte: today, lte: today };
    }
    if (range === 'yesterday') {
      const y = new Date(today.getTime() - 86400000);
      return { gte: y, lte: y };
    }
    if (range === 'last7') {
      const start = new Date(today.getTime() - 7 * 86400000);
      return { gte: start, lte: today };
    }
    if (range === 'mtd') {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { gte: start, lte: today };
    }
    return undefined;
  }

  private async resolveScopedEntityIds(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const scope = await getEffectiveScope(this.prisma, user);
    const companyIds =
      query?.companyId && (scope.unrestricted || scope.companyIds.includes(query.companyId))
        ? [query.companyId]
        : scope.companyIds;

    let outletIds = scope.outletIds;
    if (query?.outletId && query.outletId !== 'all') {
      const numericOutlet = Number(query.outletId);
      if (Number.isInteger(numericOutlet) && numericOutlet > 0) {
        outletIds = [numericOutlet].filter((id) => scope.unrestricted || scope.outletIds.includes(id));
      } else {
        const matched = await this.prisma.outlet.findFirst({
          where: { name: { equals: query.outletId, mode: 'insensitive' } },
        });
        outletIds = matched && (scope.unrestricted || scope.outletIds.includes(matched.id)) ? [matched.id] : [];
      }
    }

    return { scope, companyIds, outletIds };
  }

  // ---- View 0: Hub Cockpit ----
  async getHub(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    // Run in 2 batches of 3 to avoid DB connection pool spikes
    const [rpt1, rpt2, rpt3] = await Promise.all([
      this.getCashBankingReport(user, query),
      this.getSalesTenderReport(user, query),
      this.getPettyIouReport(user, query),
    ]);
    const [rpt4, rpt5, rpt6] = await Promise.all([
      this.getVarianceAuditReport(user, query),
      this.getCurrencyValuationReport(user, query),
      this.getAuditGovernanceReport(user, query),
    ]);

    return {
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      summary: {
        totalBankedBase: rpt1.kpis.bankedTotal,
        bankingCompliancePct: rpt1.kpis.bankingCompliancePct,
        posGrossSalesBase: rpt2.kpis.totalPosGross,
        netShiftVarianceBase: rpt2.kpis.netVariance,
        activePendingIousBase: rpt3.kpis.totalOutstanding,
        overdueIouCount: rpt3.kpis.overdueCount,
        multiCurrencyValuationBase: rpt5.totalBaseValuation,
      },
      catalogPreviews: {
        'cash-banking': { value: rpt1.kpis.totalCollections, rate: `${rpt1.kpis.bankingCompliancePct}% Banked` },
        'sales-tender': { value: rpt2.kpis.totalPosGross, rate: `${rpt2.kpis.exceptionCount} Exceptions` },
        'petty-iou': { value: rpt3.kpis.totalOutstanding, rate: `${rpt3.kpis.overdueCount} Overdue >30d` },
        'variance-audit': { value: rpt4.rows.length, rate: `${rpt4.kpis.openCount} Open` },
        'currency-valuation': { value: rpt5.totalBaseValuation, rate: `${rpt5.holdings.length} Currencies` },
        'audit-governance': { value: rpt6.kpis.firstPassRate, rate: `${rpt6.kpis.periodLockCompliance}% Locked` },
      },
    };
  }

  // ---- RPT-001: Daily Cash Collection & Treasury Banking ----
  async getCashBankingReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { companyIds, outletIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const dateFilter = this.resolveDateBounds(query);

    const deposits = await this.prisma.cashDeposit.findMany({
      where: {
        companyId: { in: companyIds },
        outletId: { in: outletIds },
        ...(dateFilter ? { collectionDate: dateFilter } : {}),
        ...(query?.status && query.status !== 'all'
          ? { status: { equals: query.status, mode: 'insensitive' } }
          : {}),
        ...(query?.search
          ? {
              OR: [
                { docNo: { contains: query.search, mode: 'insensitive' } },
                { outlet: { name: { contains: query.search, mode: 'insensitive' } } },
                { cashier: { name: { contains: query.search, mode: 'insensitive' } } },
                { envelopeNo: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        outlet: true,
        branch: true,
        cashier: true,
        cashCollector: true,
        currencies: { include: { currency: true } },
        bankDepositItems: { include: { bankDeposit: true } },
      },
      orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
    });

    let totalCollections = new Decimal(0);
    let bankedTotal = new Decimal(0);
    let inVaultTotal = new Decimal(0);
    let discrepanciesTotal = new Decimal(0);
    const currencyMixBase: Record<string, Decimal> = {};

    let activeEnvelopeCount = 0;
    const rows = deposits.map((d) => {
      const amt = toDecimal(d.totalBaseAmount);
      const isVoid = ['Cancelled', 'Reversed'].includes(d.status);
      const linkedBank = d.bankDepositItems[0]?.bankDeposit;

      const curMap: Record<string, number> = {};
      for (const c of d.currencies) {
        curMap[c.currency.code] = toNumber(c.amount);
        if (!isVoid) {
          currencyMixBase[c.currency.code] = (currencyMixBase[c.currency.code] || new Decimal(0)).plus(
            toDecimal(c.baseAmount),
          );
        }
      }

      if (!isVoid) {
        activeEnvelopeCount += 1;
        totalCollections = totalCollections.plus(amt);
        if (d.status === 'Posted' || Boolean(linkedBank)) bankedTotal = bankedTotal.plus(amt);
        else if (d.status === 'Rejected') discrepanciesTotal = discrepanciesTotal.plus(amt);
        else inVaultTotal = inVaultTotal.plus(amt);
      }

      return {
        id: d.id,
        docNo: d.docNo,
        date: formatIsoDate(d.collectionDate),
        collectionTime: d.collectionTime,
        outlet: d.outlet.name,
        branch: d.branch.name,
        cashier: d.cashier.name,
        collector: d.cashCollector.name,
        envelopeNo: d.envelopeNo,
        currencies: d.currencies.map((c) => ({
          currency: c.currency.code,
          amount: toNumber(c.amount),
          exRate: toNumber(c.exRate, 6),
          baseAmount: toNumber(c.baseAmount),
        })),
        currencyMap: curMap,
        totalBaseUSD: toNumber(amt),
        totalBaseAmount: toNumber(amt),
        baseCurrency: d.baseCurrencyCode || baseInfo.code,
        bankName: linkedBank?.depositAccountName || 'Pending Bank Deposit',
        bankSlipRef: linkedBank?.depositBankRefNo || '-',
        status: d.status,
      };
    });

    const currencyMix = Object.entries(currencyMixBase).map(([code, val]) => ({
      currency: code,
      baseAmount: toNumber(val),
      percentage: totalCollections.gt(0)
        ? Number(val.div(totalCollections).times(100).toFixed(1))
        : 0,
    }));

    return {
      reportCode: 'RPT-001',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        totalCollections: toNumber(totalCollections),
        bankedTotal: toNumber(bankedTotal),
        bankingCompliancePct: totalCollections.gt(0)
          ? Number(bankedTotal.div(totalCollections).times(100).toFixed(1))
          : 0,
        inVaultTotal: toNumber(inVaultTotal),
        discrepanciesTotal: toNumber(discrepanciesTotal),
        envelopeCount: activeEnvelopeCount,
      },
      currencyMix,
      rows,
    };
  }

  // ---- RPT-002: Sales Tender & Channel Reconciliation ----
  async getSalesTenderReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { companyIds, outletIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const dateFilter = this.resolveDateBounds(query);

    const recons = await this.prisma.salesReconciliation.findMany({
      where: {
        companyId: { in: companyIds },
        outletId: { in: outletIds },
        ...(dateFilter ? { docDate: dateFilter } : {}),
        ...(query?.status && query.status !== 'all'
          ? query.status === 'exceptions'
            ? { NOT: { varianceAmount: 0 } }
            : { status: { equals: query.status, mode: 'insensitive' } }
          : {}),
        ...(query?.search
          ? {
              OR: [
                { docNo: { contains: query.search, mode: 'insensitive' } },
                { outlet: { name: { contains: query.search, mode: 'insensitive' } } },
                { cashier: { name: { contains: query.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { outlet: true, shift: true, cashier: true, lines: true },
      orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
    });

    let totalPosGross = new Decimal(0);
    let totalCash = new Decimal(0);
    let totalCardOnline = new Decimal(0);
    let netVariance = new Decimal(0);
    let exceptionCount = 0;

    const rows = recons.map((r) => {
      let cash = new Decimal(0);
      let bmlCard = new Decimal(0);
      let amexOnline = new Decimal(0);

      for (const l of r.lines) {
        const mode = `${l.paymentTypeName} ${l.subTypeName}`.toLowerCase();
        if (mode.includes('cash')) cash = cash.plus(toDecimal(l.baseAmount));
        else if (mode.includes('visa') || mode.includes('master') || mode.includes('bml') || mode.includes('terminal')) {
          bmlCard = bmlCard.plus(toDecimal(l.baseAmount));
        } else {
          amexOnline = amexOnline.plus(toDecimal(l.baseAmount));
        }
      }

      const v = toDecimal(r.varianceAmount);
      const hasException = v.abs().gte(0.01);
      if (hasException) exceptionCount += 1;

      totalPosGross = totalPosGross.plus(toDecimal(r.posGrossSales));
      totalCash = totalCash.plus(cash);
      totalCardOnline = totalCardOnline.plus(bmlCard).plus(amexOnline);
      netVariance = netVariance.plus(v);

      return {
        id: r.id,
        docNo: r.docNo,
        date: formatIsoDate(r.docDate),
        outlet: r.outlet.name,
        shift: r.shift?.name || 'Shift 1',
        cashier: r.cashier?.name || '-',
        posGrossSales: toNumber(r.posGrossSales),
        returns: toNumber(r.returnsAmount),
        netSales: toNumber(r.netSales),
        tenderCash: toNumber(cash),
        tenderBMLCard: toNumber(bmlCard),
        tenderAmexOnline: toNumber(amexOnline),
        totalCollected: toNumber(r.totalCollectionBase),
        variance: toNumber(v),
        variancePercent: toDecimal(r.netSales).gt(0)
          ? `${v.div(toDecimal(r.netSales)).times(100).toFixed(2)}%`
          : '0.00%',
        hasException,
        isPeriodLocked: r.isPeriodLocked,
        lockStatus: r.isPeriodLocked ? 'Locked' : r.status,
        checkerSign: r.approverName || 'Pending Sign-off',
      };
    });

    return {
      reportCode: 'RPT-002',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        totalPosGross: toNumber(totalPosGross),
        totalCash: toNumber(totalCash),
        totalCardOnline: toNumber(totalCardOnline),
        netVariance: toNumber(netVariance),
        exceptionCount,
        shiftCount: rows.length,
      },
      rows,
    };
  }

  // ---- RPT-003: Petty Cash Float & IOU Aging Analysis ----
  async getPettyIouReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { scope, companyIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const dateFilter = this.resolveDateBounds(query);

    const ious = await this.prisma.pettyCashIOU.findMany({
      where: {
        advance: {
          companyId: { in: companyIds },
          branchId: { in: scope.branchIds },
        },
        ...(dateFilter ? { docDate: dateFilter } : {}),
        ...(query?.search
          ? {
              OR: [
                { docId: { contains: query.search, mode: 'insensitive' } },
                { employeeName: { contains: query.search, mode: 'insensitive' } },
                { departmentName: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { docDate: 'asc' },
    });

    const todayMs = Date.now();
    let b0_15 = new Decimal(0);
    let b16_30 = new Decimal(0);
    let b31_60 = new Decimal(0);
    let b60Plus = new Decimal(0);
    let overdueCount = 0;

    let rows = ious.map((iou) => {
      const adv = toDecimal(iou.advAmount);
      const settled = toDecimal(iou.settledAmount);
      const ret = toDecimal(iou.returnAmount);
      const pending = Decimal.max(0, adv.minus(settled).minus(ret));
      const daysPending = Math.max(
        0,
        Math.floor((todayMs - iou.docDate.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const agingBucket =
        pending.eq(0)
          ? 'Settled'
          : daysPending <= 15
            ? '0-15 Days'
            : daysPending <= 30
              ? '16-30 Days'
              : daysPending <= 60
                ? '31-60 Days'
                : '>60 Days Overdue';

      return {
        id: iou.id,
        docId: iou.docId,
        docDate: formatIsoDate(iou.docDate),
        employeeName: iou.employeeName,
        employeeId: iou.employeeNo,
        department: iou.departmentName || 'Operations',
        purpose: iou.purpose || 'Operational Advance',
        advanceAmount: toNumber(adv),
        billsSubmitted: toNumber(settled),
        returnAmount: toNumber(ret),
        outstandingBalance: toNumber(pending),
        daysPending,
        agingBucket,
        status: pending.eq(0) ? 'Fully Settled' : iou.status,
      };
    });

    if (query?.status && query.status !== 'all') {
      const target = query.status.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.agingBucket.toLowerCase() === target ||
          r.status.toLowerCase() === target,
      );
    }

    for (const r of rows) {
      if (r.outstandingBalance <= 0) continue;
      if (r.daysPending <= 15) b0_15 = b0_15.plus(r.outstandingBalance);
      else if (r.daysPending <= 30) b16_30 = b16_30.plus(r.outstandingBalance);
      else if (r.daysPending <= 60) {
        b31_60 = b31_60.plus(r.outstandingBalance);
        overdueCount += 1;
      } else {
        b60Plus = b60Plus.plus(r.outstandingBalance);
        overdueCount += 1;
      }
    }

    const totalOutstanding = b0_15.plus(b16_30).plus(b31_60).plus(b60Plus);

    return {
      reportCode: 'RPT-003',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        bucket0_15: toNumber(b0_15),
        bucket16_30: toNumber(b16_30),
        bucket31_60: toNumber(b31_60),
        bucket60Plus: toNumber(b60Plus),
        totalOutstanding: toNumber(totalOutstanding),
        overdueCount,
      },
      rows,
    };
  }

  // ---- RPT-004: Cash Over / Short & Discrepancy Exception Log ----
  async getVarianceAuditReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { companyIds, outletIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const dateFilter = this.resolveDateBounds(query);

    const incidents = await this.prisma.varianceIncident.findMany({
      where: {
        companyId: { in: companyIds },
        outletId: { in: outletIds },
        ...(dateFilter ? { incidentDate: dateFilter } : {}),
        ...(query?.status && query.status !== 'all'
          ? {
              OR: [
                { auditStatus: { equals: query.status, mode: 'insensitive' } },
                { type: { equals: query.status, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query?.search
          ? {
              OR: [
                { incidentCode: { contains: query.search, mode: 'insensitive' } },
                { outlet: { name: { contains: query.search, mode: 'insensitive' } } },
                { cashierName: { contains: query.search, mode: 'insensitive' } },
                { rootCause: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { outlet: true },
      orderBy: [{ incidentDate: 'desc' }, { id: 'desc' }],
    });

    let totalShortages = new Decimal(0);
    let totalOverages = new Decimal(0);
    let payrollDeductions = new Decimal(0);
    let openCount = 0;

    const rows = incidents.map((v) => {
      const amt = toDecimal(v.varianceAmount);
      if (v.type === 'Shortage' || amt.lt(0)) totalShortages = totalShortages.plus(amt);
      else totalOverages = totalOverages.plus(amt);

      if (v.recoveryMode?.toLowerCase().includes('payroll')) {
        payrollDeductions = payrollDeductions.plus(amt.abs());
      }
      if (v.auditStatus === 'Investigating') openCount += 1;

      return {
        id: v.incidentCode,
        dbId: v.id,
        incidentDate: formatIsoDate(v.incidentDate),
        shiftTime: v.shiftTime,
        outlet: v.outlet.name,
        cashier: v.cashierName,
        type: v.type,
        posExpectedAmount: toNumber(v.posExpectedAmount),
        actualCountAmount: toNumber(v.actualCountAmount),
        varianceAmount: toNumber(amt),
        rootCause: v.rootCause,
        cashierExplanation: v.cashierExplanation || '',
        checkerAction: v.checkerAction || 'Pending Audit Review',
        recoveryMode: v.recoveryMode || '-',
        auditStatus: v.auditStatus,
      };
    });

    return {
      reportCode: 'RPT-004',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        totalShortages: toNumber(totalShortages),
        totalOverages: toNumber(totalOverages),
        payrollDeductions: toNumber(payrollDeductions),
        openCount,
      },
      rows,
    };
  }

  // ---- RPT-005: Multi-Currency Treasury Holdings & Valuation ----
  async getCurrencyValuationReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { companyIds, outletIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    const [currencies, deposits, denomRows, floats] = await Promise.all([
      this.prisma.currency.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } }),
      this.prisma.cashDeposit.findMany({
        where: {
          companyId: { in: companyIds },
          outletId: { in: outletIds },
          status: { notIn: ['Rejected', 'Cancelled', 'Reversed', 'Posted'] },
        },
        include: { currencies: true },
      }),
      this.prisma.cashDepositDenomination.findMany({
        where: {
          cashDeposit: {
            companyId: { in: companyIds },
            outletId: { in: outletIds },
            status: { notIn: ['Rejected', 'Cancelled', 'Reversed', 'Posted'] },
          },
        },
        include: { currency: true },
      }),
      this.prisma.floatAccount.findMany({
        where: {
          isActive: true,
          OR: [{ outletId: null }, { outletId: { in: outletIds } }],
        },
      }),
    ]);

    const holdingMap = new Map<
      number,
      {
        currencyCode: string;
        currencyName: string;
        symbol: string;
        outletsTill: Decimal;
        transitBags: Decimal;
        centralVault: Decimal;
        denominations: Map<number, number>;
      }
    >();

    for (const c of currencies) {
      holdingMap.set(c.id, {
        currencyCode: c.code,
        currencyName: c.name,
        symbol: c.symbol,
        outletsTill: new Decimal(0),
        transitBags: new Decimal(0),
        centralVault: new Decimal(0),
        denominations: new Map(),
      });
    }

    for (const fl of floats) {
      const h = holdingMap.get(fl.currencyId);
      if (h) h.outletsTill = h.outletsTill.plus(toDecimal(fl.currentBalance));
    }

    for (const d of deposits) {
      for (const c of d.currencies) {
        const h = holdingMap.get(c.currencyId);
        if (!h) continue;
        if (d.status === 'Draft') {
          h.outletsTill = h.outletsTill.plus(toDecimal(c.amount));
        } else if (['Submitted', 'In Review'].includes(d.status)) {
          h.transitBags = h.transitBags.plus(toDecimal(c.amount));
        } else {
          h.centralVault = h.centralVault.plus(toDecimal(c.amount));
        }
      }
    }

    for (const dn of denomRows) {
      const h = holdingMap.get(dn.currencyId);
      if (!h) continue;
      const val = toNumber(dn.denominationValue, 2);
      h.denominations.set(val, (h.denominations.get(val) || 0) + dn.noteCount);
    }

    let grandTotalBase = new Decimal(0);
    const holdingsRaw: Array<{
      currency: string;
      name: string;
      symbol: string;
      totalFaceValue: number;
      rateToBase: number;
      baseAmount: number;
      distribution: { outletsTill: number; transitBags: number; centralVault: number };
      denominations: Array<{ denom: number; count: number; faceValue: number; baseValue: number }>;
    }> = [];

    for (const h of holdingMap.values()) {
      const faceTotal = h.outletsTill.plus(h.transitBags).plus(h.centralVault);
      if (faceTotal.eq(0) && h.denominations.size === 0) continue;
      if (
        query?.search &&
        !h.currencyCode.toLowerCase().includes(query.search.toLowerCase()) &&
        !h.currencyName.toLowerCase().includes(query.search.toLowerCase())
      ) {
        continue;
      }

      const { rate, baseAmount } = await this.fxResolver.convertToBase(faceTotal, h.currencyCode);
      grandTotalBase = grandTotalBase.plus(baseAmount);

      const denomBreakdown = Array.from(h.denominations.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([denom, count]) => {
          const faceVal = toDecimal(denom).times(count);
          return {
            denom,
            count,
            faceValue: toNumber(faceVal),
            baseValue: toNumber(faceVal.times(rate)),
          };
        });

      holdingsRaw.push({
        currency: h.currencyCode,
        name: h.currencyName,
        symbol: h.symbol,
        totalFaceValue: toNumber(faceTotal),
        rateToBase: Number(rate.toFixed(6)),
        baseAmount: toNumber(baseAmount),
        distribution: {
          outletsTill: toNumber(h.outletsTill),
          transitBags: toNumber(h.transitBags),
          centralVault: toNumber(h.centralVault),
        },
        denominations: denomBreakdown,
      });
    }

    const holdings = holdingsRaw.map((h) => ({
      ...h,
      sharePercent: grandTotalBase.gt(0)
        ? Number(toDecimal(h.baseAmount).div(grandTotalBase).times(100).toFixed(1))
        : 0,
    }));

    return {
      reportCode: 'RPT-005',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      totalBaseValuation: toNumber(grandTotalBase),
      holdings,
    };
  }

  // ---- RPT-006: Maker-Checker Audit SLA & Governance Compliance ----
  async getAuditGovernanceReport(user: AuthenticatedUser, query?: ReportFilterQuery) {
    const { companyIds, outletIds } = await this.resolveScopedEntityIds(user, query);
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();

    const instanceWhere: Prisma.ApprovalInstanceWhereInput = {
      companyId: { in: companyIds },
      OR: [{ outletId: null }, { outletId: { in: outletIds } }],
    };

    const [instances, decisions, recons] = await Promise.all([
      this.prisma.approvalInstance.findMany({
        where: instanceWhere,
      }),
      this.prisma.approvalDecision.findMany({
        where: { instance: instanceWhere },
        include: {
          decidedBy: { include: { role: true } },
          instance: true,
        },
        orderBy: { decidedAt: 'desc' },
      }),
      this.prisma.salesReconciliation.findMany({
        where: { companyId: { in: companyIds }, outletId: { in: outletIds } },
      }),
    ]);

    const completed = instances.filter((i) => i.completedAt);
    const approvedCount = instances.filter((i) => i.status === 'Approved').length;
    const rejectedCount = instances.filter((i) => ['Rejected', 'Clarification'].includes(i.status)).length;
    const avgHours =
      completed.length > 0
        ? Number(
            (
              completed.reduce(
                (sum, i) => sum + Math.max(0.1, (i.completedAt!.getTime() - i.createdAt.getTime()) / 3600000),
                0,
              ) / completed.length
            ).toFixed(1),
          )
        : 0;

    const firstPassRate =
      approvedCount + rejectedCount > 0
        ? Number(((approvedCount / (approvedCount + rejectedCount)) * 100).toFixed(1))
        : 100;
    const returnRate = Number((100 - firstPassRate).toFixed(1));

    const lockedRecons = recons.filter((r) => r.isPeriodLocked || r.status === 'Locked').length;
    const periodLockCompliance =
      recons.length > 0 ? Number(((lockedRecons / recons.length) * 100).toFixed(1)) : 100;

    const reviewerMap = new Map<
      number,
      {
        userId: number;
        name: string;
        empNo: string;
        role: string;
        slipsAudited: number;
        flagged: number;
        totalHours: number;
      }
    >();

    for (const d of decisions) {
      const existing = reviewerMap.get(d.decidedById) || {
        userId: d.decidedById,
        name: d.decidedBy.fullName,
        empNo: d.decidedBy.empNo || `USR-${d.decidedById}`,
        role: d.decidedBy.role.name,
        slipsAudited: 0,
        flagged: 0,
        totalHours: 0,
      };
      existing.slipsAudited += 1;
      if (d.decision !== 'approve') existing.flagged += 1;
      existing.totalHours += Math.max(
        0.1,
        (d.decidedAt.getTime() - d.instance.createdAt.getTime()) / 3600000,
      );
      reviewerMap.set(d.decidedById, existing);
    }

    let reviewers = Array.from(reviewerMap.values()).map((r) => {
      const avgTurnaround = Number((r.totalHours / Math.max(1, r.slipsAudited)).toFixed(1));
      const withinSlaCount = decisions.filter(
        (dec) =>
          dec.decidedById === r.userId &&
          (dec.decidedAt.getTime() - dec.instance.createdAt.getTime()) / 3600000 <= 8,
      ).length;
      const score = Math.round((withinSlaCount / Math.max(1, r.slipsAudited)) * 100);
      return {
        id: r.userId,
        name: r.name,
        empNo: r.empNo,
        role: r.role,
        slipsAudited: r.slipsAudited,
        shortagesFlagged: r.flagged,
        avgTurnaroundHours: `${avgTurnaround}h`,
        complianceScore: `${score}%`,
        rating: score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : 'Needs Review',
      };
    });

    if (query?.search) {
      const q = query.search.toLowerCase();
      reviewers = reviewers.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.empNo.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q),
      );
    }

    return {
      reportCode: 'RPT-006',
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      kpis: {
        avgVerificationSlaHours: avgHours,
        firstPassRate,
        returnRate,
        returnedCount: rejectedCount,
        approvedCount,
        periodLockCompliance,
      },
      reviewers,
    };
  }
}
