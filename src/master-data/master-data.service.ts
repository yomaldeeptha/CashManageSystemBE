import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExchangeRateResolverService } from '../common/services/exchange-rate-resolver.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getEffectiveScope } from '../common/utils/scope.util';
import {
  formatIsoDate,
  parseDateOnly,
  toNumber,
  toPrismaDecimal,
  toPrismaRate,
} from '../common/utils/decimal.util';

type RawPayload = Record<string, unknown>;

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly fxResolver: ExchangeRateResolverService,
  ) {}

  private str(v: unknown, fallback = ''): string {
    return v === undefined || v === null ? fallback : String(v).trim();
  }

  private num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private bool(v: unknown, fallback = false): boolean {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 0 || v === '0') return false;
    return fallback;
  }

  private isActiveFromStatus(payload: RawPayload, fallback = true): boolean {
    if (payload.isActive !== undefined) return this.bool(payload.isActive, fallback);
    if (payload.status !== undefined) return String(payload.status) !== 'Inactive';
    return fallback;
  }

  async resolveCurrencyId(value: unknown): Promise<number> {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    const raw = String(value || 'USD').trim();
    if (/^\d+$/.test(raw)) return Number(raw);
    const cur = await this.prisma.currency.findUnique({
      where: { code: raw.toUpperCase() },
    });
    if (!cur) throw new BadRequestException(`Currency "${raw}" not found.`);
    return cur.id;
  }

  async listCatalog(
    catalog: string,
    user: AuthenticatedUser,
    query?: { search?: string; companyId?: number; branchId?: number; departmentId?: number },
  ): Promise<Record<string, unknown>[]> {
    const scope = await getEffectiveScope(this.prisma, user);
    const search = query?.search?.trim().toLowerCase();

    let rows: Record<string, unknown>[];

    switch (catalog) {
      case 'company':
      case 'companies': {
        const list = await this.prisma.company.findMany({
          where: scope.unrestricted ? undefined : { id: { in: scope.companyIds } },
          orderBy: { id: 'asc' },
        });
        rows = list.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          registrationNo: c.registrationNo || '',
          taxId: c.taxId || '',
          country: c.country,
          baseCurrency: c.baseCurrencyCode,
          status: c.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'branch':
      case 'branches': {
        const list = await this.prisma.branch.findMany({
          where: {
            ...(scope.unrestricted ? {} : { id: { in: scope.branchIds } }),
            ...(query?.companyId ? { companyId: Number(query.companyId) } : {}),
          },
          orderBy: { id: 'asc' },
        });
        rows = list.map((b) => ({
          id: b.id,
          companyId: b.companyId,
          code: b.code,
          name: b.name,
          city: b.city,
          manager: b.managerName || '',
          contact: b.contactNo || '',
          status: b.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'outlet':
      case 'outlets': {
        const list = await this.prisma.outlet.findMany({
          where: {
            ...(scope.unrestricted ? {} : { id: { in: scope.outletIds } }),
            ...(query?.branchId ? { branchId: Number(query.branchId) } : {}),
            ...(query?.companyId ? { branch: { companyId: Number(query.companyId) } } : {}),
          },
          include: { branch: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((o) => ({
          id: o.id,
          branchId: o.branchId,
          code: o.code,
          name: o.name,
          branch: o.branch.name,
          type: o.outletType,
          posTerminals: o.posTerminals,
          cashiersCount: o.cashiersCount,
          status: o.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'department':
      case 'departments': {
        const list = await this.prisma.department.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          head: d.headOfDepartment || '',
          budgetCode: d.budgetCode || '',
          status: d.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'location':
      case 'locations': {
        const list = await this.prisma.location.findMany({
          where: scope.unrestricted ? undefined : { branchId: { in: scope.branchIds } },
          orderBy: { id: 'asc' },
        });
        rows = list.map((l) => ({
          id: l.id,
          branchId: l.branchId,
          code: l.code,
          name: l.name,
          address: l.address || '',
          status: l.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'employee':
      case 'employees': {
        const list = await this.prisma.employee.findMany({
          where: query?.departmentId ? { departmentId: Number(query.departmentId) } : undefined,
          include: { department: true, outlet: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          outletId: e.outletId,
          empNo: e.empNo,
          name: e.name,
          department: e.department.name,
          designation: e.designation,
          contact: e.email || e.phone || '',
          status: e.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'shift':
      case 'shifts': {
        const list = await this.prisma.shift.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          hours: s.durationHours,
          status: s.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'currency':
      case 'currencies': {
        const list = await this.prisma.currency.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          rateToBase: toNumber(c.rateToBase, 6),
          localRate: c.localRate ? toNumber(c.localRate, 6) : null,
          decimalPlaces: c.decimalPlaces,
          isBase: c.isBase,
          status: c.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'exchangeRate':
      case 'exchangeRates': {
        const list = await this.prisma.exchangeRate.findMany({
          include: { fromCurrency: true, toCurrency: true },
          orderBy: [{ effectiveDate: 'desc' }, { id: 'asc' }],
        });
        rows = list.map((r) => ({
          id: r.id,
          fromCurrency: r.fromCurrency.code,
          toCurrency: r.toCurrency.code,
          rate: toNumber(r.rate, 6),
          effectiveDate: formatIsoDate(r.effectiveDate),
          source: r.source || '',
          status: r.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'denomination':
      case 'denominations': {
        const list = await this.prisma.denomination.findMany({
          include: { currency: true },
          orderBy: [{ currencyId: 'asc' }, { value: 'desc' }],
        });
        rows = list.map((d) => ({
          id: d.id,
          currencyId: d.currencyId,
          currency: d.currency.code,
          value: toNumber(d.value, 2),
          label: d.label,
          type: d.denomType,
          status: d.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'bank':
      case 'banks': {
        const list = await this.prisma.bank.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          swiftCode: b.swiftCode || '',
          country: b.country,
          contact: b.contactInfo || '',
          status: b.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'bankAccount':
      case 'bankAccounts': {
        const list = await this.prisma.bankAccount.findMany({
          include: { bank: true, currency: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((a) => ({
          id: a.id,
          bankId: a.bankId,
          currencyId: a.currencyId,
          accountNo: a.accountNo,
          name: a.name,
          currency: a.currency.code,
          branch: a.branchLocation || '',
          type: a.accountType,
          status: a.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'floatAccount':
      case 'floatAccounts': {
        const list = await this.prisma.floatAccount.findMany({
          include: { currency: true, assignedEmployee: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((f) => ({
          id: f.id,
          cashierId: f.assignedEmployeeId,
          currencyId: f.currencyId,
          code: f.code,
          name: f.name,
          accountName: f.name,
          currency: f.currency.code,
          assignedCashier: f.assignedEmployee?.name || '',
          baseLimit: toNumber(f.baseLimit),
          currentBalance: toNumber(f.currentBalance),
          status: f.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'glAccounts':
      case 'glAccount': {
        const list = await this.prisma.glAccount.findMany({ orderBy: { code: 'asc' } });
        rows = list.map((g) => ({
          id: g.id,
          code: g.code,
          name: g.name,
          category: g.category,
          isCashBank: g.isCashBank,
          status: g.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'vendor':
      case 'vendors': {
        const list = await this.prisma.vendor.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((v) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          category: v.category,
          taxId: v.taxId || '',
          contact: v.contactInfo || '',
          status: v.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'expenseCategory':
      case 'expenseCategories': {
        const list = await this.prisma.expenseCategory.findMany({
          where: query?.departmentId ? { departmentId: Number(query.departmentId) } : undefined,
          include: { department: true, glAccount: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((ec) => ({
          id: ec.id,
          departmentId: ec.departmentId,
          glAccountId: ec.glAccountId,
          code: ec.code,
          name: ec.name,
          glAccountCode: ec.glAccount.code,
          department: ec.department.name,
          status: ec.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'expenseType':
      case 'expenseTypes': {
        const list = await this.prisma.expenseType.findMany({
          include: { category: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((et) => ({
          id: et.id,
          categoryId: et.categoryId,
          code: et.code,
          name: et.name,
          taxApplicable: et.taxApplicable,
          requiresQuoteOver: toNumber(et.requiresQuoteOver),
          status: et.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'budget':
      case 'budgets': {
        const list = await this.prisma.budget.findMany({
          include: { department: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((b) => ({
          id: b.id,
          departmentId: b.departmentId,
          department: b.department.name,
          fiscalYear: b.fiscalYear,
          allocatedUSD: toNumber(b.allocatedAmount),
          monthlyLimitUSD: toNumber(b.monthlyLimit),
          consumedUSD: toNumber(b.consumedAmount),
          availableUSD: toNumber(b.availableAmount),
          status: b.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'cashAdvanceType':
      case 'cashAdvanceTypes': {
        const list = await this.prisma.cashAdvanceType.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description || '',
          defaultMaxLimitUSD: toNumber(t.defaultMaxLimit),
          status: t.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'paymentType':
      case 'paymentTypes': {
        const list = await this.prisma.paymentType.findMany({
          include: { glAccount: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((p) => ({
          id: p.id,
          glAccountId: p.glAccountId,
          code: p.code,
          name: p.name,
          autoFillFromProcess01: p.autoFillFromProcess01,
          glAccountCode: p.glAccount.code,
          status: p.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'paymentSubType':
      case 'paymentSubTypes': {
        const list = await this.prisma.paymentSubType.findMany({
          include: { currency: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((ps) => ({
          id: ps.id,
          paymentTypeId: ps.paymentTypeId,
          currencyId: ps.currencyId,
          code: ps.code,
          name: ps.name,
          currency: ps.currency.code,
          surchargePct: toNumber(ps.surchargePct, 2),
          terminalRequired: ps.terminalRequired,
          status: ps.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'paymentTerminal':
      case 'paymentTerminals': {
        const list = await this.prisma.paymentTerminal.findMany({
          where: scope.unrestricted ? undefined : { outletId: { in: scope.outletIds } },
          include: { outlet: true, bank: true },
          orderBy: { id: 'asc' },
        });
        rows = list.map((pt) => ({
          id: pt.id,
          outletId: pt.outletId,
          bankId: pt.bankId,
          code: pt.code,
          terminalName: pt.terminalName,
          serialNo: pt.serialNo,
          outlet: pt.outlet.name,
          bank: pt.bank.name,
          status: pt.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'approvalWorkflow':
      case 'approvalWorkflows': {
        const list = await this.prisma.approvalWorkflowMaster.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          stages: w.stagesCount,
          appliesTo: w.appliesTo,
          threshold: w.thresholdLabel,
          status: w.isActive ? 'Active' : 'Inactive',
        }));
        break;
      }

      case 'userScreenAccess': {
        const roles = await this.prisma.role.findMany({
          include: { permissions: true },
          orderBy: { id: 'asc' },
        });
        const totalScreens = await this.prisma.screen.count({ where: { isActive: true } });
        rows = roles.map((r) => {
          const readableModules = r.permissions.filter((p) => p.canRead).length;
          return {
            id: r.id,
            roleId: r.id,
            roleName: r.name,
            accessibleScreens: r.code === 'ADM' ? totalScreens : Math.min(totalScreens, readableModules * 3),
            hasApprovalRights: r.code === 'ADM' || r.permissions.some((p) => p.canApprove),
            canExportAudit: r.code === 'ADM' || r.permissions.some((p) => p.moduleKey === 'auditExport' && p.canUnblock),
            status: r.isActive ? 'Active' : 'Inactive',
          };
        });
        break;
      }

      case 'formMaster':
      case 'formMasters': {
        const list = await this.prisma.formMaster.findMany({ orderBy: { id: 'asc' } });
        rows = list.map((f) => ({
          id: f.id,
          formId: f.formId,
          formName: f.formName,
          category: f.category,
          module: f.module,
          screenId: f.screenId || '',
          defaultPrefix: f.defaultPrefix,
          defaultNumDigits: f.defaultNumDigits,
          isTransactional: f.isTransactional,
          makerCheckerType: f.makerCheckerType,
          status: f.isActive ? 'Active' : 'Inactive',
          description: f.description || '',
        }));
        break;
      }

      default:
        throw new BadRequestException(`Unknown master data catalog "${catalog}".`);
    }

    if (search) {
      rows = rows.filter((item) =>
        Object.values(item).some((v) => String(v ?? '').toLowerCase().includes(search)),
      );
    }

    return rows;
  }

  async getMasterBundle(user: AuthenticatedUser) {
    const catalogs = [
      'company',
      'branch',
      'outlet',
      'department',
      'location',
      'employee',
      'shift',
      'currency',
      'exchangeRate',
      'denomination',
      'bank',
      'bankAccount',
      'floatAccount',
      'glAccounts',
      'vendor',
      'expenseCategory',
      'expenseType',
      'budget',
      'cashAdvanceType',
      'paymentType',
      'paymentSubType',
      'paymentTerminal',
      'approvalWorkflow',
      'userScreenAccess',
      'formMaster',
    ];

    const entries = await Promise.all(
      catalogs.map(async (key) => [key, await this.listCatalog(key, user)] as const),
    );
    return Object.fromEntries(entries);
  }

  async createRecord(catalog: string, actor: AuthenticatedUser, payload: RawPayload) {
    const isActive = this.isActiveFromStatus(payload, true);
    let createdId = 0;

    switch (catalog) {
      case 'company': {
        const c = await this.prisma.company.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            registrationNo: this.str(payload.registrationNo) || null,
            taxId: this.str(payload.taxId) || null,
            country: this.str(payload.country, 'Maldives'),
            baseCurrencyCode: this.str(payload.baseCurrency, 'USD').toUpperCase(),
            isActive,
          },
        });
        createdId = c.id;
        break;
      }
      case 'branch': {
        const b = await this.prisma.branch.create({
          data: {
            companyId: this.num(payload.companyId, 1),
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            city: this.str(payload.city, 'Male'),
            managerName: this.str(payload.manager) || null,
            contactNo: this.str(payload.contact) || null,
            isActive,
          },
        });
        createdId = b.id;
        break;
      }
      case 'outlet': {
        const o = await this.prisma.outlet.create({
          data: {
            branchId: this.num(payload.branchId, 1),
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            outletType: this.str(payload.type, 'Dine-in & GrabGo'),
            posTerminals: this.num(payload.posTerminals, 1),
            cashiersCount: this.num(payload.cashiersCount, 2),
            isActive,
          },
        });
        createdId = o.id;
        break;
      }
      case 'department': {
        const d = await this.prisma.department.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            headOfDepartment: this.str(payload.head) || null,
            budgetCode: this.str(payload.budgetCode) || null,
            isActive,
          },
        });
        createdId = d.id;
        break;
      }
      case 'location': {
        const l = await this.prisma.location.create({
          data: {
            branchId: this.num(payload.branchId, 1),
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            address: this.str(payload.address) || null,
            isActive,
          },
        });
        createdId = l.id;
        break;
      }
      case 'employee': {
        const e = await this.prisma.employee.create({
          data: {
            empNo: this.str(payload.empNo).toUpperCase(),
            name: this.str(payload.name),
            departmentId: this.num(payload.departmentId, 1),
            outletId: payload.outletId ? this.num(payload.outletId) : null,
            designation: this.str(payload.designation, 'Staff'),
            email: this.str(payload.contact) || null,
            isActive,
          },
        });
        createdId = e.id;
        break;
      }
      case 'shift': {
        const s = await this.prisma.shift.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            startTime: this.str(payload.startTime, '06:00 AM'),
            endTime: this.str(payload.endTime, '02:00 PM'),
            durationHours: this.num(payload.hours, 8),
            isActive,
          },
        });
        createdId = s.id;
        break;
      }
      case 'currency': {
        const c = await this.prisma.currency.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            symbol: this.str(payload.symbol, '$'),
            rateToBase: toPrismaRate(this.num(payload.rateToBase, 1)),
            decimalPlaces: this.num(payload.decimalPlaces, 2),
            isBase: this.bool(payload.isBase, false),
            isActive,
          },
        });
        createdId = c.id;
        break;
      }
      case 'exchangeRate': {
        const fromId = await this.resolveCurrencyId(payload.fromCurrency);
        const toId = await this.resolveCurrencyId(payload.toCurrency);
        const er = await this.prisma.exchangeRate.create({
          data: {
            fromCurrencyId: fromId,
            toCurrencyId: toId,
            rate: toPrismaRate(this.num(payload.rate, 1)),
            effectiveDate: parseDateOnly(this.str(payload.effectiveDate) || undefined),
            source: this.str(payload.source) || null,
            isActive,
          },
        });
        createdId = er.id;
        break;
      }
      case 'denomination': {
        const currencyId = await this.resolveCurrencyId(payload.currencyId || payload.currency);
        const d = await this.prisma.denomination.create({
          data: {
            currencyId,
            value: toPrismaDecimal(this.num(payload.value, 1)),
            label: this.str(payload.label),
            denomType: this.str(payload.type, 'Bill'),
            isActive,
          },
        });
        createdId = d.id;
        break;
      }
      case 'bank': {
        const b = await this.prisma.bank.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            swiftCode: this.str(payload.swiftCode) || null,
            country: this.str(payload.country, 'Maldives'),
            contactInfo: this.str(payload.contact) || null,
            isActive,
          },
        });
        createdId = b.id;
        break;
      }
      case 'bankAccount': {
        const currencyId = await this.resolveCurrencyId(payload.currencyId || payload.currency);
        const ba = await this.prisma.bankAccount.create({
          data: {
            bankId: this.num(payload.bankId, 1),
            currencyId,
            accountNo: this.str(payload.accountNo),
            name: this.str(payload.name),
            branchLocation: this.str(payload.branch) || null,
            accountType: this.str(payload.type, 'Current'),
            isActive,
          },
        });
        createdId = ba.id;
        break;
      }
      case 'floatAccount': {
        const currencyId = await this.resolveCurrencyId(payload.currencyId || payload.currency);
        const fa = await this.prisma.floatAccount.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            currencyId,
            assignedEmployeeId: payload.cashierId ? this.num(payload.cashierId) : null,
            baseLimit: toPrismaDecimal(this.num(payload.baseLimit, 0)),
            currentBalance: toPrismaDecimal(this.num(payload.currentBalance, 0)),
            isActive,
          },
        });
        createdId = fa.id;
        break;
      }
      case 'glAccounts': {
        const g = await this.prisma.glAccount.create({
          data: {
            code: this.str(payload.code),
            name: this.str(payload.name),
            category: this.str(payload.category, 'Asset'),
            isCashBank: this.bool(payload.isCashBank, false),
            isActive,
          },
        });
        createdId = g.id;
        break;
      }
      case 'vendor': {
        const v = await this.prisma.vendor.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            category: this.str(payload.category, 'General'),
            taxId: this.str(payload.taxId) || null,
            contactInfo: this.str(payload.contact) || null,
            isActive,
          },
        });
        createdId = v.id;
        break;
      }
      case 'expenseCategory': {
        const gl = payload.glAccountId
          ? { id: this.num(payload.glAccountId) }
          : await this.prisma.glAccount.findFirst({ where: { code: this.str(payload.glAccountCode) } });
        const ec = await this.prisma.expenseCategory.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            departmentId: this.num(payload.departmentId, 1),
            glAccountId: gl?.id || 1,
            isActive,
          },
        });
        createdId = ec.id;
        break;
      }
      case 'expenseType': {
        const et = await this.prisma.expenseType.create({
          data: {
            categoryId: this.num(payload.categoryId, 1),
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            taxApplicable: this.bool(payload.taxApplicable, true),
            requiresQuoteOver: toPrismaDecimal(this.num(payload.requiresQuoteOver, 100)),
            isActive,
          },
        });
        createdId = et.id;
        break;
      }
      case 'budget': {
        let deptId = payload.departmentId ? this.num(payload.departmentId) : 0;
        if (!deptId && payload.department) {
          const dept = await this.prisma.department.findFirst({
            where: { name: { equals: this.str(payload.department), mode: 'insensitive' } },
          });
          deptId = dept?.id || 1;
        }
        const allocated = this.num(payload.allocatedUSD, 0);
        const consumed = this.num(payload.consumedUSD, 0);
        const monthlyLimit = this.num(payload.monthlyLimitUSD, allocated / 12);
        const available =
          payload.availableUSD !== undefined
            ? this.num(payload.availableUSD)
            : Math.max(0, monthlyLimit - consumed);
        const b = await this.prisma.budget.create({
          data: {
            departmentId: deptId || 1,
            fiscalYear: this.str(payload.fiscalYear, '2026'),
            allocatedAmount: toPrismaDecimal(allocated),
            monthlyLimit: toPrismaDecimal(monthlyLimit),
            consumedAmount: toPrismaDecimal(consumed),
            availableAmount: toPrismaDecimal(available),
            isActive,
          },
        });
        createdId = b.id;
        break;
      }
      case 'cashAdvanceType': {
        const t = await this.prisma.cashAdvanceType.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            description: this.str(payload.description) || null,
            defaultMaxLimit: toPrismaDecimal(this.num(payload.defaultMaxLimitUSD, 500)),
            isActive,
          },
        });
        createdId = t.id;
        break;
      }
      case 'paymentType': {
        const gl = payload.glAccountId
          ? { id: this.num(payload.glAccountId) }
          : await this.prisma.glAccount.findFirst({ where: { code: this.str(payload.glAccountCode) } });
        const pt = await this.prisma.paymentType.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            autoFillFromProcess01: this.bool(payload.autoFillFromProcess01, false),
            glAccountId: gl?.id || 1,
            isActive,
          },
        });
        createdId = pt.id;
        break;
      }
      case 'paymentSubType': {
        const currencyId = await this.resolveCurrencyId(payload.currencyId || payload.currency);
        const ps = await this.prisma.paymentSubType.create({
          data: {
            paymentTypeId: this.num(payload.paymentTypeId, 1),
            currencyId,
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            surchargePct: toPrismaDecimal(this.num(payload.surchargePct, 0), 2),
            terminalRequired: this.bool(payload.terminalRequired, false),
            isActive,
          },
        });
        createdId = ps.id;
        break;
      }
      case 'paymentTerminal': {
        const pt = await this.prisma.paymentTerminal.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            terminalName: this.str(payload.terminalName),
            serialNo: this.str(payload.serialNo),
            outletId: this.num(payload.outletId, 1),
            bankId: this.num(payload.bankId, 1),
            isActive,
          },
        });
        createdId = pt.id;
        break;
      }
      case 'approvalWorkflow': {
        const w = await this.prisma.approvalWorkflowMaster.create({
          data: {
            code: this.str(payload.code).toUpperCase(),
            name: this.str(payload.name),
            stagesCount: this.num(payload.stages, 3),
            appliesTo: this.str(payload.appliesTo),
            thresholdLabel: this.str(payload.threshold, '$0.00'),
            thresholdValue: toPrismaDecimal(
              Number(String(payload.threshold || '0').replace(/[^0-9.]/g, '')) || 0,
            ),
            isActive,
          },
        });
        createdId = w.id;
        break;
      }
      case 'formMaster': {
        const f = await this.prisma.formMaster.create({
          data: {
            formId: this.str(payload.formId).toUpperCase(),
            formName: this.str(payload.formName),
            category: this.str(payload.category, 'Operations'),
            module: this.str(payload.module, 'General'),
            screenId: this.str(payload.screenId) || null,
            defaultPrefix: this.str(payload.defaultPrefix, 'DOC-').toUpperCase(),
            defaultNumDigits: this.num(payload.defaultNumDigits, 4),
            isTransactional: this.bool(payload.isTransactional, true),
            makerCheckerType: this.str(payload.makerCheckerType, 'Standard'),
            description: this.str(payload.description) || null,
            isActive,
          },
        });
        createdId = f.id;
        break;
      }
      default:
        throw new BadRequestException(`Create not supported for catalog "${catalog}".`);
    }

    await this.auditService.log({
      entityType: `master_${catalog}`,
      entityId: createdId,
      action: 'CREATE',
      step: `Created ${catalog} record #${createdId}`,
      performedById: actor.id,
      performedByName: actor.fullName,
    });

    const list = await this.listCatalog(catalog, actor);
    return list.find((r) => Number(r.id) === createdId) || { id: createdId };
  }

  async updateRecord(
    catalog: string,
    id: number,
    actor: AuthenticatedUser,
    payload: RawPayload,
  ) {
    const isActive = this.isActiveFromStatus(payload, true);

    switch (catalog) {
      case 'company':
        await this.prisma.company.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.registrationNo !== undefined
              ? { registrationNo: this.str(payload.registrationNo) || null }
              : {}),
            ...(payload.taxId !== undefined ? { taxId: this.str(payload.taxId) || null } : {}),
            ...(payload.country !== undefined ? { country: this.str(payload.country) } : {}),
            ...(payload.baseCurrency !== undefined
              ? { baseCurrencyCode: this.str(payload.baseCurrency).toUpperCase() }
              : {}),
            isActive,
          },
        });
        break;
      case 'branch':
        await this.prisma.branch.update({
          where: { id },
          data: {
            ...(payload.companyId !== undefined ? { companyId: this.num(payload.companyId) } : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.city !== undefined ? { city: this.str(payload.city) } : {}),
            ...(payload.manager !== undefined ? { managerName: this.str(payload.manager) } : {}),
            ...(payload.contact !== undefined ? { contactNo: this.str(payload.contact) } : {}),
            isActive,
          },
        });
        break;
      case 'outlet':
        await this.prisma.outlet.update({
          where: { id },
          data: {
            ...(payload.branchId !== undefined ? { branchId: this.num(payload.branchId) } : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.type !== undefined ? { outletType: this.str(payload.type) } : {}),
            ...(payload.posTerminals !== undefined
              ? { posTerminals: this.num(payload.posTerminals) }
              : {}),
            ...(payload.cashiersCount !== undefined
              ? { cashiersCount: this.num(payload.cashiersCount) }
              : {}),
            isActive,
          },
        });
        break;
      case 'department':
        await this.prisma.department.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.head !== undefined ? { headOfDepartment: this.str(payload.head) } : {}),
            ...(payload.budgetCode !== undefined
              ? { budgetCode: this.str(payload.budgetCode) }
              : {}),
            isActive,
          },
        });
        break;
      case 'location':
        await this.prisma.location.update({
          where: { id },
          data: {
            ...(payload.branchId !== undefined ? { branchId: this.num(payload.branchId) } : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.address !== undefined ? { address: this.str(payload.address) } : {}),
            isActive,
          },
        });
        break;
      case 'employee':
        await this.prisma.employee.update({
          where: { id },
          data: {
            ...(payload.empNo !== undefined ? { empNo: this.str(payload.empNo).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.departmentId !== undefined
              ? { departmentId: this.num(payload.departmentId) }
              : {}),
            ...(payload.designation !== undefined
              ? { designation: this.str(payload.designation) }
              : {}),
            ...(payload.contact !== undefined ? { email: this.str(payload.contact) } : {}),
            isActive,
          },
        });
        break;
      case 'shift':
        await this.prisma.shift.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.startTime !== undefined ? { startTime: this.str(payload.startTime) } : {}),
            ...(payload.endTime !== undefined ? { endTime: this.str(payload.endTime) } : {}),
            ...(payload.hours !== undefined ? { durationHours: this.num(payload.hours) } : {}),
            isActive,
          },
        });
        break;
      case 'currency':
        await this.prisma.currency.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.symbol !== undefined ? { symbol: this.str(payload.symbol) } : {}),
            ...(payload.rateToBase !== undefined
              ? { rateToBase: toPrismaRate(this.num(payload.rateToBase, 1)) }
              : {}),
            ...(payload.decimalPlaces !== undefined
              ? { decimalPlaces: this.num(payload.decimalPlaces) }
              : {}),
            isActive,
          },
        });
        break;
      case 'exchangeRate': {
        const data: Record<string, unknown> = { isActive };
        if (payload.fromCurrency !== undefined) {
          data.fromCurrencyId = await this.resolveCurrencyId(payload.fromCurrency);
        }
        if (payload.toCurrency !== undefined) {
          data.toCurrencyId = await this.resolveCurrencyId(payload.toCurrency);
        }
        if (payload.rate !== undefined) data.rate = toPrismaRate(this.num(payload.rate, 1));
        if (payload.effectiveDate !== undefined) {
          data.effectiveDate = parseDateOnly(this.str(payload.effectiveDate));
        }
        if (payload.source !== undefined) data.source = this.str(payload.source);
        await this.prisma.exchangeRate.update({ where: { id }, data });
        break;
      }
      case 'denomination':
        await this.prisma.denomination.update({
          where: { id },
          data: {
            ...(payload.value !== undefined ? { value: toPrismaDecimal(this.num(payload.value, 1)) } : {}),
            ...(payload.label !== undefined ? { label: this.str(payload.label) } : {}),
            ...(payload.type !== undefined ? { denomType: this.str(payload.type) } : {}),
            isActive,
          },
        });
        break;
      case 'bank':
        await this.prisma.bank.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.swiftCode !== undefined ? { swiftCode: this.str(payload.swiftCode) } : {}),
            ...(payload.country !== undefined ? { country: this.str(payload.country) } : {}),
            ...(payload.contact !== undefined ? { contactInfo: this.str(payload.contact) } : {}),
            isActive,
          },
        });
        break;
      case 'bankAccount':
        await this.prisma.bankAccount.update({
          where: { id },
          data: {
            ...(payload.bankId !== undefined ? { bankId: this.num(payload.bankId) } : {}),
            ...(payload.accountNo !== undefined ? { accountNo: this.str(payload.accountNo) } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.branch !== undefined ? { branchLocation: this.str(payload.branch) } : {}),
            ...(payload.type !== undefined ? { accountType: this.str(payload.type) } : {}),
            isActive,
          },
        });
        break;
      case 'floatAccount':
        await this.prisma.floatAccount.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.cashierId !== undefined
              ? { assignedEmployeeId: this.num(payload.cashierId) }
              : {}),
            ...(payload.baseLimit !== undefined
              ? { baseLimit: toPrismaDecimal(this.num(payload.baseLimit, 0)) }
              : {}),
            ...(payload.currentBalance !== undefined
              ? { currentBalance: toPrismaDecimal(this.num(payload.currentBalance, 0)) }
              : {}),
            isActive,
          },
        });
        break;
      case 'glAccounts':
        await this.prisma.glAccount.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code) } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.category !== undefined ? { category: this.str(payload.category) } : {}),
            ...(payload.isCashBank !== undefined
              ? { isCashBank: this.bool(payload.isCashBank) }
              : {}),
            isActive,
          },
        });
        break;
      case 'vendor':
        await this.prisma.vendor.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.category !== undefined ? { category: this.str(payload.category) } : {}),
            ...(payload.taxId !== undefined ? { taxId: this.str(payload.taxId) } : {}),
            ...(payload.contact !== undefined ? { contactInfo: this.str(payload.contact) } : {}),
            isActive,
          },
        });
        break;
      case 'expenseCategory':
        await this.prisma.expenseCategory.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.departmentId !== undefined
              ? { departmentId: this.num(payload.departmentId) }
              : {}),
            ...(payload.glAccountId !== undefined
              ? { glAccountId: this.num(payload.glAccountId) }
              : {}),
            isActive,
          },
        });
        break;
      case 'expenseType':
        await this.prisma.expenseType.update({
          where: { id },
          data: {
            ...(payload.categoryId !== undefined
              ? { categoryId: this.num(payload.categoryId) }
              : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.taxApplicable !== undefined
              ? { taxApplicable: this.bool(payload.taxApplicable) }
              : {}),
            ...(payload.requiresQuoteOver !== undefined
              ? { requiresQuoteOver: toPrismaDecimal(this.num(payload.requiresQuoteOver, 100)) }
              : {}),
            isActive,
          },
        });
        break;
      case 'budget':
        await this.prisma.budget.update({
          where: { id },
          data: {
            ...(payload.fiscalYear !== undefined ? { fiscalYear: this.str(payload.fiscalYear) } : {}),
            ...(payload.allocatedUSD !== undefined
              ? { allocatedAmount: toPrismaDecimal(this.num(payload.allocatedUSD, 0)) }
              : {}),
            ...(payload.monthlyLimitUSD !== undefined
              ? { monthlyLimit: toPrismaDecimal(this.num(payload.monthlyLimitUSD, 0)) }
              : {}),
            ...(payload.consumedUSD !== undefined
              ? { consumedAmount: toPrismaDecimal(this.num(payload.consumedUSD, 0)) }
              : {}),
            ...(payload.availableUSD !== undefined
              ? { availableAmount: toPrismaDecimal(this.num(payload.availableUSD, 0)) }
              : {}),
            isActive,
          },
        });
        break;
      case 'cashAdvanceType':
        await this.prisma.cashAdvanceType.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.description !== undefined
              ? { description: this.str(payload.description) }
              : {}),
            ...(payload.defaultMaxLimitUSD !== undefined
              ? { defaultMaxLimit: toPrismaDecimal(this.num(payload.defaultMaxLimitUSD, 500)) }
              : {}),
            isActive,
          },
        });
        break;
      case 'paymentType':
        await this.prisma.paymentType.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.autoFillFromProcess01 !== undefined
              ? { autoFillFromProcess01: this.bool(payload.autoFillFromProcess01) }
              : {}),
            isActive,
          },
        });
        break;
      case 'paymentSubType':
        await this.prisma.paymentSubType.update({
          where: { id },
          data: {
            ...(payload.paymentTypeId !== undefined
              ? { paymentTypeId: this.num(payload.paymentTypeId) }
              : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.surchargePct !== undefined
              ? { surchargePct: toPrismaDecimal(this.num(payload.surchargePct, 0), 2) }
              : {}),
            ...(payload.terminalRequired !== undefined
              ? { terminalRequired: this.bool(payload.terminalRequired) }
              : {}),
            isActive,
          },
        });
        break;
      case 'paymentTerminal':
        await this.prisma.paymentTerminal.update({
          where: { id },
          data: {
            ...(payload.outletId !== undefined ? { outletId: this.num(payload.outletId) } : {}),
            ...(payload.bankId !== undefined ? { bankId: this.num(payload.bankId) } : {}),
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.terminalName !== undefined
              ? { terminalName: this.str(payload.terminalName) }
              : {}),
            ...(payload.serialNo !== undefined ? { serialNo: this.str(payload.serialNo) } : {}),
            isActive,
          },
        });
        break;
      case 'approvalWorkflow':
        await this.prisma.approvalWorkflowMaster.update({
          where: { id },
          data: {
            ...(payload.code !== undefined ? { code: this.str(payload.code).toUpperCase() } : {}),
            ...(payload.name !== undefined ? { name: this.str(payload.name) } : {}),
            ...(payload.stages !== undefined ? { stagesCount: this.num(payload.stages) } : {}),
            ...(payload.appliesTo !== undefined ? { appliesTo: this.str(payload.appliesTo) } : {}),
            ...(payload.threshold !== undefined
              ? { thresholdLabel: this.str(payload.threshold) }
              : {}),
            isActive,
          },
        });
        break;
      case 'formMaster':
        await this.prisma.formMaster.update({
          where: { id },
          data: {
            ...(payload.formName !== undefined ? { formName: this.str(payload.formName) } : {}),
            ...(payload.category !== undefined ? { category: this.str(payload.category) } : {}),
            ...(payload.module !== undefined ? { module: this.str(payload.module) } : {}),
            ...(payload.defaultPrefix !== undefined
              ? { defaultPrefix: this.str(payload.defaultPrefix).toUpperCase() }
              : {}),
            ...(payload.defaultNumDigits !== undefined
              ? { defaultNumDigits: this.num(payload.defaultNumDigits) }
              : {}),
            ...(payload.makerCheckerType !== undefined
              ? { makerCheckerType: this.str(payload.makerCheckerType) }
              : {}),
            ...(payload.description !== undefined
              ? { description: this.str(payload.description) }
              : {}),
            isActive,
          },
        });
        break;
      default:
        throw new BadRequestException(`Update not supported for catalog "${catalog}".`);
    }

    await this.auditService.log({
      entityType: `master_${catalog}`,
      entityId: id,
      action: 'UPDATE',
      step: `Updated ${catalog} record #${id}`,
      performedById: actor.id,
      performedByName: actor.fullName,
    });

    const list = await this.listCatalog(catalog, actor);
    const updated = list.find((r) => Number(r.id) === id);
    if (!updated) throw new NotFoundException(`Record #${id} not found.`);
    return updated;
  }

  async toggleStatus(catalog: string, id: number, actor: AuthenticatedUser) {
    const list = await this.listCatalog(catalog, actor);
    const existing = list.find((r) => Number(r.id) === id);
    if (!existing) throw new NotFoundException(`${catalog} record #${id} not found.`);
    const nextStatus = existing.status === 'Active' ? 'Inactive' : 'Active';
    return this.updateRecord(catalog, id, actor, { status: nextStatus });
  }

  async deleteRecord(catalog: string, id: number, actor: AuthenticatedUser) {
    const map: Record<string, { delete: (args: { where: { id: number } }) => Promise<unknown> }> = {
      company: this.prisma.company,
      branch: this.prisma.branch,
      outlet: this.prisma.outlet,
      department: this.prisma.department,
      location: this.prisma.location,
      employee: this.prisma.employee,
      shift: this.prisma.shift,
      currency: this.prisma.currency,
      exchangeRate: this.prisma.exchangeRate,
      denomination: this.prisma.denomination,
      bank: this.prisma.bank,
      bankAccount: this.prisma.bankAccount,
      floatAccount: this.prisma.floatAccount,
      glAccounts: this.prisma.glAccount,
      vendor: this.prisma.vendor,
      expenseCategory: this.prisma.expenseCategory,
      expenseType: this.prisma.expenseType,
      budget: this.prisma.budget,
      cashAdvanceType: this.prisma.cashAdvanceType,
      paymentType: this.prisma.paymentType,
      paymentSubType: this.prisma.paymentSubType,
      paymentTerminal: this.prisma.paymentTerminal,
      approvalWorkflow: this.prisma.approvalWorkflowMaster,
      formMaster: this.prisma.formMaster,
    };

    const delegate = map[catalog];
    if (!delegate) {
      throw new BadRequestException(`Delete not supported for catalog "${catalog}".`);
    }

    await delegate.delete({ where: { id } });

    await this.auditService.log({
      entityType: `master_${catalog}`,
      entityId: id,
      action: 'DELETE',
      step: `Deleted ${catalog} record #${id}`,
      performedById: actor.id,
      performedByName: actor.fullName,
    });

    return { deleted: true, id };
  }

  async resolveExchangeRate(from: string, to?: string) {
    const baseInfo = await this.fxResolver.getSystemBaseCurrency();
    const target = (to || baseInfo.code).toUpperCase();
    const rate = await this.fxResolver.resolveRate(from, target);
    return {
      from: from.toUpperCase(),
      to: target,
      rate: Number(rate.toFixed(6)),
      systemBaseCurrency: baseInfo.code,
      systemBaseSymbol: baseInfo.symbol,
    };
  }
}
