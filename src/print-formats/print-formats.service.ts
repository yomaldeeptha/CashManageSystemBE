import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import { toNumber } from '../common/utils/decimal.util';

@Injectable()
export class PrintFormatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxResolver: ExchangeRateResolverService,
  ) {}

  async listTemplates() {
    const rows = await this.prisma.printTemplate.findMany({ orderBy: { id: 'asc' } });
    return rows.map((r) => ({
      dbId: r.id,
      id: r.templateKey,
      code: r.code,
      name: r.name,
      process: r.process,
      orientation: r.orientation,
      paperSize: r.paperSize,
      sections: r.sections,
      sampleDoc: r.sampleDoc,
      headerConfig: r.headerConfig || {},
    }));
  }

  async getPreviewData(user: AuthenticatedUser, templateKey: string) {
    const tpl = await this.prisma.printTemplate.findFirst({
      where: { OR: [{ templateKey }, { code: templateKey }] },
    });
    if (!tpl) throw new NotFoundException(`Print template "${templateKey}" not found.`);

    const scope = await getEffectiveScope(this.prisma, user);
    const companyWhere = !scope.unrestricted ? { id: { in: scope.companyIds } } : {};
    const docScopeWhere = !scope.unrestricted
      ? { companyId: { in: scope.companyIds }, outletId: { in: scope.outletIds } }
      : {};
    const branchScopeWhere = !scope.unrestricted
      ? { companyId: { in: scope.companyIds }, branchId: { in: scope.branchIds } }
      : {};

    const [company, baseInfo] = await Promise.all([
      this.prisma.company.findFirst({ where: { isActive: true, ...companyWhere }, orderBy: { id: 'asc' } }),
      this.fxResolver.getSystemBaseCurrency(),
    ]);

    let latestDocument: Record<string, unknown> | null = null;
    if (tpl.templateKey === 'PRINT-01') {
      const dep = await this.prisma.cashDeposit.findFirst({
        where: docScopeWhere,
        orderBy: { id: 'desc' },
        include: { outlet: true, branch: true, cashier: true, cashCollector: true, currencies: { include: { currency: true } } },
      });
      if (dep) {
        latestDocument = {
          docNo: dep.docNo,
          docDate: dep.docDate.toISOString().slice(0, 10),
          outlet: dep.outlet.name,
          branch: dep.branch.name,
          cashier: dep.cashier.name,
          collector: dep.cashCollector.name,
          totalBaseAmount: toNumber(dep.totalBaseAmount),
          baseCurrency: dep.baseCurrencyCode,
          status: dep.status,
          currencies: dep.currencies.map((c) => ({
            currency: c.currency.code,
            amount: toNumber(c.amount),
            exRate: toNumber(c.exRate, 6),
            baseAmount: toNumber(c.baseAmount),
          })),
        };
      }
    } else if (tpl.templateKey === 'PRINT-02') {
      const pay = await this.prisma.cashierPayment.findFirst({
        where: docScopeWhere,
        orderBy: { id: 'desc' },
        include: { currency: true, outlet: true },
      });
      if (pay) {
        latestDocument = {
          docNo: pay.paymentVoucherNo,
          docDate: pay.paymentDate.toISOString().slice(0, 10),
          vendor: pay.vendorName,
          department: pay.departmentName,
          amount: toNumber(pay.amount),
          currency: pay.currency.code,
          narration: pay.narration,
          status: pay.approvalStatus,
        };
      }
    } else if (tpl.templateKey === 'PRINT-03') {
      const adv = await this.prisma.pettyCashAdvance.findFirst({
        where: branchScopeWhere,
        orderBy: { id: 'desc' },
        include: { currency: true },
      });
      if (adv) {
        latestDocument = {
          docNo: adv.docNo,
          docDate: adv.docDate.toISOString().slice(0, 10),
          requester: adv.requesterName,
          department: adv.departmentName,
          amountPaid: toNumber(adv.amountPaid),
          currency: adv.currency.code,
          narration: adv.narration,
          status: adv.status,
        };
      }
    } else if (tpl.templateKey === 'PRINT-04') {
      const bill = await this.prisma.pettyCashBillSubmission.findFirst({
        where: branchScopeWhere,
        orderBy: { id: 'desc' },
        include: { lines: { include: { currency: true } } },
      });
      if (bill) {
        latestDocument = {
          docNo: bill.docNo,
          docDate: bill.docDate.toISOString().slice(0, 10),
          employee: bill.employeeName,
          totalBillAmount: toNumber(bill.totalBillAmount),
          taxTotal: toNumber(bill.taxTotal),
          balanceToReturn: toNumber(bill.balanceToReturn),
          status: bill.status,
          lines: bill.lines.map((l) => ({
            billNo: l.billNo,
            supplier: l.supplierName,
            amount: toNumber(l.amount),
            currency: l.currency.code,
            tax: toNumber(l.taxAmount),
          })),
        };
      }
    } else if (tpl.templateKey === 'PRINT-06') {
      const outlets = await this.prisma.outlet.findMany({
        where: !scope.unrestricted
          ? { isActive: true, id: { in: scope.outletIds } }
          : { isActive: true },
        include: { branch: true },
        orderBy: { id: 'asc' },
      });
      const recons = await this.prisma.salesReconciliation.findMany({
        where: docScopeWhere,
        orderBy: [{ docDate: 'desc' }, { id: 'desc' }],
        take: 50,
      });
      const deposits = await this.prisma.cashDeposit.findMany({
        where: docScopeWhere,
        orderBy: [{ collectionDate: 'desc' }, { id: 'desc' }],
        take: 50,
      });
      const outletRows = outlets.map((o) => {
        const latestRecon = recons.find((r) => r.outletId === o.id);
        const latestDep = deposits.find((d) => d.outletId === o.id);
        return {
          outlet: o.name,
          branch: o.branch.name,
          reconDocNo: latestRecon?.docNo || 'Pending',
          depositDocNo: latestDep?.docNo || 'Pending',
          netSalesBase: latestRecon ? toNumber(latestRecon.netSales) : 0,
          depositBase: latestDep ? toNumber(latestDep.totalBaseAmount) : 0,
          periodLock: latestRecon?.isPeriodLocked ? 'Locked' : latestRecon?.status || 'Open',
        };
      });
      const closedCount = outletRows.filter((r) => ['Approved', 'Posted', 'Locked'].includes(r.periodLock)).length;
      latestDocument = {
        docNo: `EOD-${new Date().toISOString().slice(0, 10)}`,
        docDate: new Date().toISOString().slice(0, 10),
        totalOutlets: outletRows.length,
        closedOutlets: closedCount,
        readinessPercent: outletRows.length > 0 ? Math.round((closedCount / outletRows.length) * 100) : 0,
        status: closedCount === outletRows.length && outletRows.length > 0 ? 'Ready for Close' : 'In Progress',
        outlets: outletRows,
      };
    } else {
      const recon = await this.prisma.salesReconciliation.findFirst({
        where: docScopeWhere,
        orderBy: { id: 'desc' },
        include: { outlet: true, shift: true, cashier: true },
      });
      if (recon) {
        latestDocument = {
          docNo: recon.docNo,
          docDate: recon.docDate.toISOString().slice(0, 10),
          outlet: recon.outlet.name,
          shift: recon.shift?.name || 'Shift 1',
          cashier: recon.cashier?.name || '-',
          posGrossSales: toNumber(recon.posGrossSales),
          netSales: toNumber(recon.netSales),
          totalCollectionBase: toNumber(recon.totalCollectionBase),
          variance: toNumber(recon.varianceAmount),
          status: recon.status,
        };
      }
    }

    return {
      template: {
        id: tpl.templateKey,
        code: tpl.code,
        name: tpl.name,
        process: tpl.process,
        orientation: tpl.orientation,
        paperSize: tpl.paperSize,
        sections: tpl.sections,
        sampleDoc: tpl.sampleDoc,
      },
      company: company
        ? {
            name: company.name,
            registrationNo: company.registrationNo,
            taxId: company.taxId,
            country: company.country,
          }
        : null,
      baseCurrency: baseInfo.code,
      baseSymbol: baseInfo.symbol,
      latestDocument,
    };
  }
}
