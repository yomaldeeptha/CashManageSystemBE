import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const d = (val: number | string) => new Prisma.Decimal(val);
const dt = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  console.log('Seeding BNF Connect Cash Management System database...');

  // 1. Companies
  const comp1 = await prisma.company.upsert({
    where: { code: 'BF-MDV' },
    update: {},
    create: {
      code: 'BF-MDV',
      name: 'Brew & Feast Maldives Pvt Ltd',
      registrationNo: 'C-0891/2018',
      taxId: 'TIN-994012',
      country: 'Maldives',
      baseCurrencyCode: 'USD',
    },
  });
  const comp2 = await prisma.company.upsert({
    where: { code: 'BF-HLD' },
    update: {},
    create: {
      code: 'BF-HLD',
      name: 'B&F Hospitality Holdings Ltd',
      registrationNo: 'H-4410/2021',
      taxId: 'TIN-889100',
      country: 'Maldives',
      baseCurrencyCode: 'USD',
    },
  });

  // 2. Branches
  const br1 = await prisma.branch.upsert({
    where: { code: 'BR-VIA' },
    update: {},
    create: {
      companyId: comp1.id,
      code: 'BR-VIA',
      name: 'Velana Int. Airport',
      city: 'Hulhule',
      managerName: 'Aishath Nawaal',
      contactNo: '+960 791-0021',
    },
  });
  const br2 = await prisma.branch.upsert({
    where: { code: 'BR-HLC' },
    update: {},
    create: {
      companyId: comp1.id,
      code: 'BR-HLC',
      name: 'Hulhumale Central',
      city: 'Hulhumale Phase 1',
      managerName: 'Ibrahim Naseem',
      contactNo: '+960 792-4411',
    },
  });
  const br3 = await prisma.branch.upsert({
    where: { code: 'BR-SMA' },
    update: {},
    create: {
      companyId: comp2.id,
      code: 'BR-SMA',
      name: 'South Male Atoll',
      city: 'Maafushi Island',
      managerName: 'Mariyam Ziyana',
      contactNo: '+960 798-2200',
    },
  });
  const br4 = await prisma.branch.upsert({
    where: { code: 'BR-MLC' },
    update: {},
    create: {
      companyId: comp1.id,
      code: 'BR-MLC',
      name: 'Male Commercial Harbor',
      city: 'Male Capital',
      managerName: 'Mohamed Latheef',
      contactNo: '+960 799-3311',
    },
  });

  // 3. Outlets
  const out1 = await prisma.outlet.upsert({
    where: { code: 'OUT-01' },
    update: {},
    create: {
      branchId: br1.id,
      code: 'OUT-01',
      name: 'Male Airport Outlet',
      outletType: 'Dine-in & GrabGo',
      posTerminals: 3,
      cashiersCount: 4,
    },
  });
  const out2 = await prisma.outlet.upsert({
    where: { code: 'OUT-02' },
    update: {},
    create: {
      branchId: br2.id,
      code: 'OUT-02',
      name: 'Hulhumale Grand Cafe',
      outletType: 'Flagship Restaurant',
      posTerminals: 4,
      cashiersCount: 6,
    },
  });
  const out3 = await prisma.outlet.upsert({
    where: { code: 'OUT-03' },
    update: {},
    create: {
      branchId: br3.id,
      code: 'OUT-03',
      name: 'Maafushi Bistro & Lounge',
      outletType: 'Resort Dining',
      posTerminals: 2,
      cashiersCount: 3,
    },
  });
  const out4 = await prisma.outlet.upsert({
    where: { code: 'OUT-04' },
    update: {},
    create: {
      branchId: br1.id,
      code: 'OUT-04',
      name: 'Velana Express Kiosk',
      outletType: 'Express Kiosk',
      posTerminals: 1,
      cashiersCount: 2,
    },
  });
  const out5 = await prisma.outlet.upsert({
    where: { code: 'OUT-05' },
    update: {},
    create: {
      branchId: br3.id,
      code: 'OUT-05',
      name: 'Cinnamon Island Dining',
      outletType: 'Fine Dining',
      posTerminals: 2,
      cashiersCount: 3,
    },
  });

  // 4. Departments
  const deptData = [
    { code: 'DEP-OPS', name: 'Outlet Operations & Retail', headOfDepartment: 'Hassan Shareef', budgetCode: 'BDG-OPS-2026' },
    { code: 'DEP-KTN', name: 'Kitchen & Bakery Operations', headOfDepartment: 'Executive Chef Jean', budgetCode: 'BDG-KTN-2026' },
    { code: 'DEP-FMT', name: 'Facilities & Maintenance', headOfDepartment: 'Ibrahim Rasheed', budgetCode: 'BDG-FMT-2026' },
    { code: 'DEP-LOG', name: 'Logistics & Island Transport', headOfDepartment: 'Mohamed Latheef', budgetCode: 'BDG-LOG-2026' },
    { code: 'DEP-FIN', name: 'Finance & Treasury Control', headOfDepartment: 'Aishath Nawaal', budgetCode: 'BDG-FIN-2026' },
    { code: 'DEP-MGT', name: 'Executive Management', headOfDepartment: 'Pramuditha Bandara', budgetCode: 'BDG-MGT-2026' },
  ];
  const depts = [];
  for (const dep of deptData) {
    depts.push(await prisma.department.upsert({ where: { code: dep.code }, update: {}, create: dep }));
  }

  // 5. Locations
  const locations = [
    { branchId: br1.id, code: 'LOC-VIA-T1', name: 'Terminal 1 Gate Lounge 4', address: 'Departure Hall, Velana Airport' },
    { branchId: br2.id, code: 'LOC-HLC-01', name: 'Hulhumale Central Plaza', address: 'Nirolhu Magu, Hulhumale Phase 1' },
    { branchId: br3.id, code: 'LOC-SMA-01', name: 'Maafushi Beachfront Pier', address: 'South Male Atoll' },
  ];
  for (const loc of locations) {
    await prisma.location.upsert({ where: { code: loc.code }, update: {}, create: loc });
  }

  // 6. Employees
  const empData = [
    { empNo: 'CSH-104', name: 'Ahmed Shujau', departmentId: depts[0].id, outletId: out1.id, designation: 'Head Cashier', email: 'ahmed.s@bnf.mv', phone: '+960 771-1001' },
    { empNo: 'COL-882', name: 'Mohamed Latheef', departmentId: depts[3].id, outletId: null, designation: 'Cash Collector', email: 'latheef.m@bnf.mv', phone: '+960 771-1002' },
    { empNo: 'AST-201', name: 'Fathimath Reema', departmentId: depts[4].id, outletId: null, designation: 'Assistant Cashier', email: 'reema.f@bnf.mv', phone: '+960 771-1003' },
    { empNo: 'FIN-091', name: 'Hassan Shareef', departmentId: depts[4].id, outletId: null, designation: 'Finance Checker', email: 'hassan.s@bnf.mv', phone: '+960 771-1004' },
    { empNo: 'MGR-004', name: 'Aishath Nawaal', departmentId: depts[4].id, outletId: null, designation: 'Finance Manager', email: 'nawaal.a@bnf.mv', phone: '+960 771-1005' },
    { empNo: 'EMP-402', name: 'Ali Moosa', departmentId: depts[1].id, outletId: out1.id, designation: 'Senior Sous Chef', email: 'ali.m@bnf.mv', phone: '+960 771-1006' },
    { empNo: 'CSH-109', name: 'Ibrahim Naseem', departmentId: depts[0].id, outletId: out2.id, designation: 'Cashier', email: 'ibrahim.n@bnf.mv', phone: '+960 771-1007' },
    { empNo: 'EMP-215', name: 'Ibrahim Rasheed', departmentId: depts[2].id, outletId: out2.id, designation: 'Maintenance Lead', email: 'rasheed.i@bnf.mv', phone: '+960 771-1008' },
    { empNo: 'CSH-112', name: 'Mariyam Ziyana', departmentId: depts[0].id, outletId: out3.id, designation: 'Cashier', email: 'ziyana.m@bnf.mv', phone: '+960 771-1009' },
    { empNo: 'CSH-115', name: 'Yoosuf Fazil', departmentId: depts[0].id, outletId: out4.id, designation: 'Cashier', email: 'yoosuf.f@bnf.mv', phone: '+960 771-1010' },
    { empNo: 'ADM-001', name: 'Pramuditha Bandara', departmentId: depts[5].id, outletId: null, designation: 'System Administrator', email: 'admin@brewfeast.mv', phone: '+960 771-1000' },
  ];
  const emps = [];
  for (const e of empData) {
    emps.push(await prisma.employee.upsert({ where: { empNo: e.empNo }, update: {}, create: e }));
  }

  // 7. Shifts
  const shiftsData = [
    { code: 'SFT-01', name: 'Shift 1 - Morning', startTime: '06:00 AM', endTime: '02:00 PM', durationHours: 8 },
    { code: 'SFT-02', name: 'Shift 2 - Evening', startTime: '02:00 PM', endTime: '10:00 PM', durationHours: 8 },
    { code: 'SFT-03', name: 'Shift 3 - Night Flight', startTime: '10:00 PM', endTime: '06:00 AM', durationHours: 8 },
    { code: 'SFT-04', name: 'Shift 4 - Split Lunch Peak', startTime: '11:00 AM', endTime: '03:00 PM', durationHours: 4 },
  ];
  const shifts = [];
  for (const s of shiftsData) {
    shifts.push(await prisma.shift.upsert({ where: { code: s.code }, update: {}, create: s }));
  }

  // 8. Currencies (Supports system-wide base currency switching across USD, MVR, EUR, GBP, LKR, etc.)
  const currenciesData = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rateToBase: d(1), localRate: d(1), decimalPlaces: 2, isBase: true },
    { code: 'EUR', name: 'Euro', symbol: '€', rateToBase: d(1.09), localRate: null, decimalPlaces: 2, isBase: false },
    { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', rateToBase: d(0.06485), localRate: d(15.42), decimalPlaces: 2, isBase: false },
    { code: 'GBP', name: 'British Pound', symbol: '£', rateToBase: d(1.27), localRate: null, decimalPlaces: 2, isBase: false },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', rateToBase: d(0.0033), localRate: d(303), decimalPlaces: 2, isBase: false },
  ];
  const curMap = new Map<string, number>();
  for (const c of currenciesData) {
    const rec = await prisma.currency.upsert({ where: { code: c.code }, update: {}, create: c });
    curMap.set(rec.code, rec.id);
  }

  // 9. Exchange Rates
  const ratePairs = [
    { from: 'EUR', to: 'USD', rate: 1.09, source: 'Maldives Monetary Authority (MMA)' },
    { from: 'MVR', to: 'USD', rate: 0.065, source: 'Maldives Monetary Authority (MMA)' },
    { from: 'USD', to: 'MVR', rate: 15.42, source: 'Maldives Monetary Authority (MMA)' },
    { from: 'GBP', to: 'USD', rate: 1.27, source: 'MMA Daily Fixing' },
    { from: 'LKR', to: 'USD', rate: 0.0033, source: 'CBSL Reference Rate' },
  ];
  const existingRatesCount = await prisma.exchangeRate.count();
  if (existingRatesCount === 0) {
    for (const rp of ratePairs) {
      await prisma.exchangeRate.create({
        data: {
          fromCurrencyId: curMap.get(rp.from)!,
          toCurrencyId: curMap.get(rp.to)!,
          rate: d(rp.rate),
          effectiveDate: dt('2026-10-19'),
          source: rp.source,
        },
      });
    }
  }

  // 10. Denominations
  const denomSeed: Array<{ cur: string; vals: number[]; sym: string }> = [
    { cur: 'USD', vals: [100, 50, 20, 10, 5, 1], sym: '$' },
    { cur: 'EUR', vals: [500, 200, 100, 50, 20, 10, 5], sym: '€' },
    { cur: 'MVR', vals: [500, 100, 50, 20, 10], sym: 'Rf ' },
    { cur: 'GBP', vals: [50, 20, 10, 5], sym: '£' },
    { cur: 'LKR', vals: [5000, 1000, 500, 100, 50, 20], sym: 'Rs ' },
  ];
  for (const ds of denomSeed) {
    const cid = curMap.get(ds.cur)!;
    for (let i = 0; i < ds.vals.length; i++) {
      const val = ds.vals[i];
      await prisma.denomination.upsert({
        where: { currencyId_value: { currencyId: cid, value: d(val) } },
        update: {},
        create: {
          currencyId: cid,
          value: d(val),
          label: `${ds.sym}${val} Note`,
          denomType: 'Bill',
          displayOrder: i + 1,
        },
      });
    }
  }

  // 11. Banks & Bank Accounts
  const bml = await prisma.bank.upsert({
    where: { code: 'BML' },
    update: {},
    create: { code: 'BML', name: 'Bank of Maldives PLC', swiftCode: 'MALBMVMV', country: 'Maldives', contactInfo: 'corporate@bml.com.mv' },
  });
  const mib = await prisma.bank.upsert({
    where: { code: 'MIB' },
    update: {},
    create: { code: 'MIB', name: 'Maldives Islamic Bank', swiftCode: 'MALBMVMI', country: 'Maldives', contactInfo: 'treasury@mib.com.mv' },
  });
  const sbi = await prisma.bank.upsert({
    where: { code: 'SBI' },
    update: {},
    create: { code: 'SBI', name: 'State Bank of India (Maldives)', swiftCode: 'SBINMVMV', country: 'Maldives', contactInfo: 'male@sbimaldives.com' },
  });

  const bankAccounts = [
    { bankId: bml.id, currencyId: curMap.get('USD')!, accountNo: '7701-094-11', name: 'BML Corporate Main USD', branchLocation: 'Boduthakurufaanu Magu, Male', accountType: 'Current' },
    { bankId: bml.id, currencyId: curMap.get('MVR')!, accountNo: '7701-094-12', name: 'BML Corporate Main MVR', branchLocation: 'Boduthakurufaanu Magu, Male', accountType: 'Current' },
    { bankId: sbi.id, currencyId: curMap.get('USD')!, accountNo: '8820-110-01', name: 'SBI Treasury Collection USD', branchLocation: 'Male Commercial District', accountType: 'Current' },
  ];
  for (const ba of bankAccounts) {
    await prisma.bankAccount.upsert({ where: { accountNo: ba.accountNo }, update: {}, create: ba });
  }

  // 12. Float Accounts
  const floats = [
    { code: 'FLT-VIA-01', name: 'Outlet Primary Float USD (Airport)', currencyId: curMap.get('USD')!, assignedEmployeeId: emps[0].id, outletId: out1.id, baseLimit: d(1500), currentBalance: d(1320) },
    { code: 'FLT-HLC-02', name: 'Outlet Float Account Hulhumale (MVR)', currencyId: curMap.get('MVR')!, assignedEmployeeId: emps[6].id, outletId: out2.id, baseLimit: d(15000), currentBalance: d(12500) },
    { code: 'FLT-TRS-03', name: 'Central Treasury Master Physical Float', currencyId: curMap.get('USD')!, assignedEmployeeId: emps[2].id, outletId: null, baseLimit: d(10000), currentBalance: d(9850) },
    { code: 'FLT-PCF-04', name: 'Central Airport Petty Cash Float - Acc #7704', currencyId: curMap.get('USD')!, assignedEmployeeId: emps[2].id, outletId: out1.id, baseLimit: d(3500), currentBalance: d(3500) },
  ];
  for (const fl of floats) {
    await prisma.floatAccount.upsert({ where: { code: fl.code }, update: {}, create: fl });
  }

  // 13. GL Accounts
  const glData = [
    { code: '1010-01', name: 'Cash in Hand - Central Physical Vault', category: 'Asset', isCashBank: true },
    { code: '1015-00', name: 'Common Bank Clearing Account', category: 'Asset', isCashBank: true },
    { code: '1020-01', name: 'BML Corporate Main USD Account', category: 'Asset', isCashBank: true },
    { code: '1020-05', name: 'BML POS Merchant Clearing Account', category: 'Asset', isCashBank: true },
    { code: '1030-02', name: 'QR & Electronic Settlement Gateway', category: 'Asset', isCashBank: true },
    { code: '2010-05', name: 'Outlet Sales Clearing Account', category: 'Liability', isCashBank: false },
    { code: '4000-10', name: 'Outlet Daily F&B Gross Sales Revenue', category: 'Revenue', isCashBank: false },
    { code: '5010-00', name: 'Kitchen & Emergency Ingredient Expense', category: 'Expense', isCashBank: false },
    { code: '5020-00', name: 'Store Repairs & Maintenance Expense', category: 'Expense', isCashBank: false },
    { code: '5030-00', name: 'Courier & Island Freight Expense', category: 'Expense', isCashBank: false },
    { code: '5040-00', name: 'Staff Welfare & General Operations Expense', category: 'Expense', isCashBank: false },
    { code: '5090-00', name: 'Cash Over / Short Variance Account', category: 'Expense', isCashBank: false },
  ];
  const glMap = new Map<string, number>();
  for (const g of glData) {
    const rec = await prisma.glAccount.upsert({ where: { code: g.code }, update: {}, create: g });
    glMap.set(rec.code, rec.id);
  }

  // 14. Vendors
  const vendors = [
    { code: 'VND-001', name: 'Airport Cargo & Ground Handling', category: 'Logistics', taxId: 'TIN-77881', contactInfo: 'ops@macl.aero' },
    { code: 'VND-002', name: 'Local Island Produce Supplier', category: 'Fresh Produce', taxId: 'TIN-66120', contactInfo: 'orders@islandproduce.mv' },
    { code: 'VND-003', name: 'Male Hardware Mart', category: 'Maintenance', taxId: 'TIN-55410', contactInfo: 'sales@malehardware.mv' },
    { code: 'VND-004', name: 'Cooling Tech Maldives Ltd', category: 'HVAC & Repairs', taxId: 'TIN-44109', contactInfo: 'service@coolingtech.mv' },
    { code: 'VND-005', name: 'Island Express Couriers', category: 'Courier', taxId: 'TIN-33192', contactInfo: 'dispatch@islandexpress.mv' },
  ];
  for (const v of vendors) {
    await prisma.vendor.upsert({ where: { code: v.code }, update: {}, create: v });
  }

  // 15. Expense Categories & Types
  const expCatsData = [
    { code: 'EXP-CAT-01', name: 'Emergency Ingredient Sourcing', departmentId: depts[1].id, glAccountId: glMap.get('5010-00')! },
    { code: 'EXP-CAT-02', name: 'Store Repairs & Hardware', departmentId: depts[2].id, glAccountId: glMap.get('5020-00')! },
    { code: 'EXP-CAT-03', name: 'Courier & Island Freight', departmentId: depts[3].id, glAccountId: glMap.get('5030-00')! },
    { code: 'EXP-CAT-04', name: 'Staff Refreshments & Kit', departmentId: depts[0].id, glAccountId: glMap.get('5040-00')! },
    { code: 'EXP-CAT-05', name: 'General Treasury Operations', departmentId: depts[4].id, glAccountId: glMap.get('5040-00')! },
  ];
  const expCats = [];
  for (const ec of expCatsData) {
    expCats.push(await prisma.expenseCategory.upsert({ where: { code: ec.code }, update: {}, create: ec }));
  }

  const expTypes = [
    { categoryId: expCats[0].id, code: 'TYP-ING-01', name: 'Dairy & Organic Specialty Baking Items', taxApplicable: true, requiresQuoteOver: d(150) },
    { categoryId: expCats[1].id, code: 'TYP-REP-01', name: 'Chiller & Kitchen Equipment Parts', taxApplicable: true, requiresQuoteOver: d(200) },
    { categoryId: expCats[2].id, code: 'TYP-FRT-01', name: 'Speedboat & Air Cargo Dispatch', taxApplicable: false, requiresQuoteOver: d(100) },
    { categoryId: expCats[3].id, code: 'TYP-STF-01', name: 'Overtime Shift Staff Meals', taxApplicable: true, requiresQuoteOver: d(75) },
  ];
  for (const et of expTypes) {
    await prisma.expenseType.upsert({ where: { code: et.code }, update: {}, create: et });
  }

  // 16. Budgets
  const budgets = [
    { departmentId: depts[0].id, fiscalYear: '2026', allocatedAmount: d(30000), monthlyLimit: d(2500), consumedAmount: d(1100), availableAmount: d(1400) },
    { departmentId: depts[1].id, fiscalYear: '2026', allocatedAmount: d(36000), monthlyLimit: d(3000), consumedAmount: d(1850), availableAmount: d(1150) },
    { departmentId: depts[2].id, fiscalYear: '2026', allocatedAmount: d(54000), monthlyLimit: d(4500), consumedAmount: d(2900), availableAmount: d(1600) },
    { departmentId: depts[3].id, fiscalYear: '2026', allocatedAmount: d(24000), monthlyLimit: d(2000), consumedAmount: d(1420), availableAmount: d(580) },
  ];
  for (const b of budgets) {
    await prisma.budget.upsert({
      where: { departmentId_fiscalYear: { departmentId: b.departmentId, fiscalYear: b.fiscalYear } },
      update: {},
      create: b,
    });
  }

  // 17. Cash Advance Types
  const advTypes = [
    { code: 'ADV-GEN', name: 'Gen Purchase', description: 'Direct supplier purchases and emergency procurement', defaultMaxLimit: d(500) },
    { code: 'ADV-PCV', name: 'Petty Cash', description: 'Departmental petty cash imprest replenishment', defaultMaxLimit: d(350) },
    { code: 'ADV-FX', name: 'Handle Money Exchange', description: 'Counter tourist currency exchange float handling', defaultMaxLimit: d(1000) },
  ];
  for (const at of advTypes) {
    await prisma.cashAdvanceType.upsert({ where: { code: at.code }, update: {}, create: at });
  }

  // 18. Payment Types, Sub-Types, Terminals
  const ptCash = await prisma.paymentType.upsert({
    where: { code: 'PAY-CASH' },
    update: {},
    create: { code: 'PAY-CASH', name: 'Cash', autoFillFromProcess01: true, glAccountId: glMap.get('1010-01')! },
  });
  const ptCard = await prisma.paymentType.upsert({
    where: { code: 'PAY-CARD' },
    update: {},
    create: { code: 'PAY-CARD', name: 'Terminal (Card Payment)', autoFillFromProcess01: false, glAccountId: glMap.get('1020-05')! },
  });
  const ptOnline = await prisma.paymentType.upsert({
    where: { code: 'PAY-ONLINE' },
    update: {},
    create: { code: 'PAY-ONLINE', name: 'Bank Transfer (Online)', autoFillFromProcess01: false, glAccountId: glMap.get('1020-01')! },
  });
  const ptQr = await prisma.paymentType.upsert({
    where: { code: 'PAY-QR' },
    update: {},
    create: { code: 'PAY-QR', name: 'QR Payment Gateway', autoFillFromProcess01: false, glAccountId: glMap.get('1030-02')! },
  });

  const subTypes = [
    { paymentTypeId: ptCard.id, currencyId: curMap.get('USD')!, code: 'SUB-VISA-USD', name: 'Visa USD', surchargePct: d(0), terminalRequired: true },
    { paymentTypeId: ptCard.id, currencyId: curMap.get('MVR')!, code: 'SUB-VISA-MVR', name: 'Visa MVR', surchargePct: d(0), terminalRequired: true },
    { paymentTypeId: ptCard.id, currencyId: curMap.get('USD')!, code: 'SUB-MC-USD', name: 'MasterCard USD', surchargePct: d(0), terminalRequired: true },
    { paymentTypeId: ptCard.id, currencyId: curMap.get('MVR')!, code: 'SUB-MC-MVR', name: 'MasterCard MVR', surchargePct: d(0), terminalRequired: true },
    { paymentTypeId: ptCard.id, currencyId: curMap.get('USD')!, code: 'SUB-AMEX', name: 'Amex / UnionPay', surchargePct: d(1.5), terminalRequired: true },
    { paymentTypeId: ptOnline.id, currencyId: curMap.get('USD')!, code: 'SUB-BML-ONL', name: 'BML Direct Transfer', surchargePct: d(0), terminalRequired: false },
    { paymentTypeId: ptQr.id, currencyId: curMap.get('USD')!, code: 'SUB-QR-GPAY', name: 'GPay / Dialog QR', surchargePct: d(0), terminalRequired: false },
  ];
  for (const st of subTypes) {
    await prisma.paymentSubType.upsert({ where: { code: st.code }, update: {}, create: st });
  }

  const terminals = [
    { code: 'TRM-VIA-01', terminalName: 'Card Terminal 01 (Airport)', serialNo: 'POS-ING-9011', outletId: out1.id, bankId: bml.id },
    { code: 'TRM-VIA-02', terminalName: 'Card Terminal 02 (Airport SBI)', serialNo: 'POS-ING-9012', outletId: out1.id, bankId: sbi.id },
    { code: 'TRM-HLC-01', terminalName: 'Card Terminal 01 (Hulhumale)', serialNo: 'POS-ING-9021', outletId: out2.id, bankId: bml.id },
    { code: 'TRM-SMA-01', terminalName: 'Card Terminal 01 (Maafushi)', serialNo: 'POS-ING-9031', outletId: out3.id, bankId: mib.id },
  ];
  for (const trm of terminals) {
    await prisma.paymentTerminal.upsert({ where: { code: trm.code }, update: {}, create: trm });
  }

  // 19. Approval Workflow Master Catalog
  const wfMasters = [
    { code: 'WF-CCD-01', name: 'Cash Collection Deposit Matrix', stagesCount: 3, appliesTo: 'Cash Handover & Bank Deposit', thresholdLabel: '$1,000.00', thresholdValue: d(1000) },
    { code: 'WF-PCV-01', name: 'Petty Cash Advance & Settlement', stagesCount: 2, appliesTo: 'Petty Cash Requests & Bills', thresholdLabel: '$250.00', thresholdValue: d(250) },
    { code: 'WF-SREC-01', name: 'Sales Day-End Reconciliation', stagesCount: 3, appliesTo: 'Shift Close & Period Lock', thresholdLabel: 'Variance != 0', thresholdValue: d(50) },
  ];
  for (const wf of wfMasters) {
    await prisma.approvalWorkflowMaster.upsert({ where: { code: wf.code }, update: {}, create: wf });
  }

  // 20. Form Masters (26 forms)
  const formMasters = [
    { formId: 'FRM-PCR-REQ', formName: 'Petty Cash Advance Request', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'REQ-', defaultNumDigits: 3, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Employee departmental petty cash request form' },
    { formId: 'FRM-PCA-ADV', formName: 'Petty Cash Advance Payment Voucher', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'PCA-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Disbursement voucher for approved petty cash advance' },
    { formId: 'FRM-BSUB-BILL', formName: 'Staff Bill Submission & Verification', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'BSUB-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Tax invoice settlement against petty cash advance' },
    { formId: 'FRM-RET-CASH', formName: 'Unspent Advance Cash Return Receipt', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'RET-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Employee cash refund receipt to vault' },
    { formId: 'FRM-FLT-REIMB', formName: 'Petty Cash Float Reimbursement Claim', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'REIMB-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Baseline float replenishment claim' },
    { formId: 'FRM-CCD-COLLECT', formName: 'Cash Collection Deposit & Handover', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-002', routeKey: 'cash-deposit', defaultPrefix: 'CCD-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Outlet multi-currency cash envelope handover' },
    { formId: 'FRM-CCD-PAY', formName: 'Direct Cashier Payment Voucher', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-002', routeKey: 'cash-deposit', defaultPrefix: 'PV-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Frontline cashier cash disbursement voucher' },
    { formId: 'FRM-CCD-SETTLE', formName: 'Shift Handover Settlement', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-002', routeKey: 'cash-deposit', defaultPrefix: 'DS-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Cashier-to-cashier shift handover settlement' },
    { formId: 'FRM-CCD-BANK', formName: 'Outlet Cash Bank Deposit Slip', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-002', routeKey: 'cash-deposit', defaultPrefix: 'BD-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Outlet cash deposit to bank or carry forward' },
    { formId: 'FRM-MAIN-PAY', formName: 'Main Cashier Payment', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-007', routeKey: 'cash-deposit', defaultPrefix: 'MPAY-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Central treasury main cashier payment voucher' },
    { formId: 'FRM-MAIN-SETTLE', formName: 'Main Cashier Settlement', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-008', routeKey: 'cash-deposit', defaultPrefix: 'MSET-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Central treasury vault settlement to bank' },
    { formId: 'FRM-SREC-DAYEND', formName: 'POS Sales Day-End Reconciliation', category: 'Operations', module: 'Sales Recon', screenId: 'SCR-RECON-004', routeKey: 'sales-recon', defaultPrefix: 'SREC-2026-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Checker', description: 'Multi-shift POS sales reconciliation & lock' },
    { formId: 'FRM-DASH-001', formName: 'Control Dashboard', category: 'Operations', module: 'Dashboard', screenId: 'SCR-DASH-001', routeKey: 'dashboard', defaultPrefix: 'DSH-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Standard', description: 'Executive finance operations cockpit' },
    { formId: 'FRM-CASH-002', formName: 'Cash Collection Deposit Workspace', category: 'Operations', module: 'Cash Deposit', screenId: 'SCR-CASH-002', routeKey: 'cash-deposit', defaultPrefix: 'CCD-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Process 01 main screen' },
    { formId: 'FRM-PETTY-003', formName: 'Petty Cash & IOUs Workspace', category: 'Operations', module: 'Petty Cash', screenId: 'SCR-PETTY-003', routeKey: 'petty-cash', defaultPrefix: 'PCV-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Dual Control', description: 'Process 02 main screen' },
    { formId: 'FRM-RECON-004', formName: 'Sales Day-End Recon Workspace', category: 'Operations', module: 'Sales Recon', screenId: 'SCR-RECON-004', routeKey: 'sales-recon', defaultPrefix: 'SREC-', defaultNumDigits: 4, isTransactional: true, makerCheckerType: 'Checker', description: 'Process 03 main screen' },
    { formId: 'FRM-APPRV-005', formName: 'Governance & Approvals Queue', category: 'Governance', module: 'Approvals', screenId: 'SCR-APPRV-005', routeKey: 'approvals', defaultPrefix: 'APR-', defaultNumDigits: 4, isTransactional: false, makerCheckerType: 'Checker', description: 'Central Maker-Checker approval queue' },
    { formId: 'FRM-APSTP-006', formName: 'Approval Stages & Templates Setup', category: 'Governance', module: 'Approvals', screenId: 'SCR-APSTP-006', routeKey: 'approval-setup', defaultPrefix: 'WF-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'Workflow rules configuration' },
    { formId: 'FRM-SCRN-007', formName: 'Screen Registry & User Authorization', category: 'Administration', module: 'Security', screenId: 'SCR-SCRN-007', routeKey: 'screen-auth', defaultPrefix: 'SEC-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'User screen authorization matrix' },
    { formId: 'FRM-USER-008', formName: 'User Management Directory', category: 'Administration', module: 'Security', screenId: 'SCR-USER-008', routeKey: 'user-management', defaultPrefix: 'USR-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'User directory and entity boundaries' },
    { formId: 'FRM-ROLE-009', formName: 'Roles & Permissions Matrix', category: 'Administration', module: 'Security', screenId: 'SCR-ROLE-009', routeKey: 'roles-permissions', defaultPrefix: 'ROL-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'RBAC module permissions matrix' },
    { formId: 'FRM-NOTIF-010', formName: 'Notification Formats & Triggers', category: 'Administration', module: 'Administration', screenId: 'SCR-NOTIF-010', routeKey: 'notifications', defaultPrefix: 'NTF-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'Alert template setup' },
    { formId: 'FRM-PRNT-011', formName: 'Print Formats & Voucher Layouts', category: 'Administration', module: 'Administration', screenId: 'SCR-PRNT-011', routeKey: 'print-formats', defaultPrefix: 'PRT-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'Official voucher layouts' },
    { formId: 'FRM-AUDT-012', formName: 'Audit Log & File Export', category: 'Administration', module: 'Administration', screenId: 'SCR-AUDT-012', routeKey: 'audit-export', defaultPrefix: 'LOG-', defaultNumDigits: 4, isTransactional: false, makerCheckerType: 'Admin Only', description: 'Immutable audit trail and ledger export' },
    { formId: 'FRM-MAST-013', formName: 'Master Data Management Hub', category: 'Master Data', module: 'Master Data', screenId: 'SCR-MAST-013', routeKey: 'master-data', defaultPrefix: 'MST-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'All 25 master data catalogs' },
    { formId: 'FRM-BIZ-CONFIG-025', formName: 'Business Configuration Setup', category: 'Administration', module: 'Administration', screenId: 'SCR-BIZ-CONFIG-025', routeKey: 'business-config', defaultPrefix: 'CFG-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'System base currency, fiscal, limits & regional config' },
    { formId: 'FRM-USER-GRP-026', formName: 'User Groups & Defaults', category: 'Administration', module: 'Security', screenId: 'SCR-USER-GRP-026', routeKey: 'user-groups', defaultPrefix: 'GRP-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'User group screen presets' },
    { formId: 'FRM-RPT-027', formName: 'Financial Reports & Analytics Hub', category: 'Reports', module: 'Reports', screenId: 'SCR-RPT-027', routeKey: 'reports', defaultPrefix: 'RPT-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Standard', description: 'Executive reports hub' },
    { formId: 'FRM-NUMSER-034', formName: 'Document Number Series Management', category: 'Administration', module: 'Administration', screenId: 'SCR-NUMSER-034', routeKey: 'number-series', defaultPrefix: 'SER-', defaultNumDigits: 3, isTransactional: false, makerCheckerType: 'Admin Only', description: 'Automated sequence generators' },
  ];
  for (const fm of formMasters) {
    await prisma.formMaster.upsert({ where: { formId: fm.formId }, update: {}, create: fm });
  }

  // 21. Screens Registry (Core screens)
  const screensSeed = [
    { screenId: 'SCR-DASH-001', formId: 'FRM-DASH-001', screenName: 'Control Dashboard', category: 'Operations', routeKey: 'dashboard', makerCheckerType: 'Standard' },
    { screenId: 'SCR-CASH-002', formId: 'FRM-CASH-002', screenName: 'Cash Collection Deposit & Handover', category: 'Operations', routeKey: 'cash-deposit', makerCheckerType: 'Dual Control' },
    { screenId: 'SCR-CASH-007', formId: 'FRM-MAIN-PAY', screenName: 'Main Cashier Payment', category: 'Operations', routeKey: 'cash-deposit', makerCheckerType: 'Dual Control' },
    { screenId: 'SCR-CASH-008', formId: 'FRM-MAIN-SETTLE', screenName: 'Main Cashier Settlement', category: 'Operations', routeKey: 'cash-deposit', makerCheckerType: 'Dual Control' },
    { screenId: 'SCR-PETTY-003', formId: 'FRM-PETTY-003', screenName: 'Petty Cash Vouchers & IOUs', category: 'Operations', routeKey: 'petty-cash', makerCheckerType: 'Dual Control' },
    { screenId: 'SCR-RECON-004', formId: 'FRM-RECON-004', screenName: 'Sales Day-End Reconciliation', category: 'Operations', routeKey: 'sales-recon', makerCheckerType: 'Checker' },
    { screenId: 'SCR-APPRV-005', formId: 'FRM-APPRV-005', screenName: 'Governance & Approvals Queue', category: 'Governance', routeKey: 'approvals', makerCheckerType: 'Checker' },
    { screenId: 'SCR-APSTP-006', formId: 'FRM-APSTP-006', screenName: 'Approval Stages & Templates Setup', category: 'Governance', routeKey: 'approval-setup', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-SCRN-007', formId: 'FRM-SCRN-007', screenName: 'Screen Registry & User Authorization', category: 'Administration', routeKey: 'screen-auth', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-USER-008', formId: 'FRM-USER-008', screenName: 'User Management Directory', category: 'Administration', routeKey: 'user-management', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-ROLE-009', formId: 'FRM-ROLE-009', screenName: 'Roles & Permissions Matrix', category: 'Administration', routeKey: 'roles-permissions', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-NOTIF-010', formId: 'FRM-NOTIF-010', screenName: 'Notification Formats & Triggers', category: 'Administration', routeKey: 'notifications', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-PRNT-011', formId: 'FRM-PRNT-011', screenName: 'Print Formats & Voucher Layouts', category: 'Administration', routeKey: 'print-formats', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-AUDT-012', formId: 'FRM-AUDT-012', screenName: 'Audit Log & File Export', category: 'Administration', routeKey: 'audit-export', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-MAST-013', formId: 'FRM-MAST-013', screenName: 'Master Data Management Hub', category: 'Master Data', routeKey: 'master-data', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-BIZ-CONFIG-025', formId: 'FRM-BIZ-CONFIG-025', screenName: 'Business Configuration Setup', category: 'Administration', routeKey: 'business-config', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-USER-GRP-026', formId: 'FRM-USER-GRP-026', screenName: 'User Groups & Group Defaults', category: 'Administration', routeKey: 'user-groups', makerCheckerType: 'Admin Only' },
    { screenId: 'SCR-RPT-027', formId: 'FRM-RPT-027', screenName: 'Financial Reports & Analytics Hub', category: 'Reports', routeKey: 'reports', makerCheckerType: 'Standard' },
    { screenId: 'SCR-NUMSER-034', formId: 'FRM-NUMSER-034', screenName: 'Document Number Series Management', category: 'Administration', routeKey: 'number-series', makerCheckerType: 'Admin Only' },
  ];
  const allScreens = [];
  for (const sc of screensSeed) {
    allScreens.push(await prisma.screen.upsert({ where: { screenId: sc.screenId }, update: {}, create: sc }));
  }

  // 22. Menu Nodes (100..706)
  const menuNodes = [
    { menuId: 100, parentId: 0, rootParent: 100, name: 'Cash Collection Deposit', type: 'Module', level: 1 },
    { menuId: 101, parentId: 100, rootParent: 100, name: 'Create Cash Collection Slip', type: 'Screen', level: 2 },
    { menuId: 102, parentId: 100, rootParent: 100, name: 'Multi-Currency Denominations', type: 'Feature', level: 2 },
    { menuId: 103, parentId: 100, rootParent: 100, name: 'Collector Handover & Accept', type: 'Feature', level: 2 },
    { menuId: 104, parentId: 100, rootParent: 100, name: 'Cashier-to-Cashier Settlement', type: 'Feature', level: 2 },
    { menuId: 105, parentId: 100, rootParent: 100, name: 'Bank Deposit & Reconciliation', type: 'Screen', level: 2 },
    { menuId: 107, parentId: 100, rootParent: 100, name: 'Main Cashier Payment (Spent)', type: 'Screen', level: 2 },
    { menuId: 108, parentId: 100, rootParent: 100, name: 'Main Cashier Settlement', type: 'Screen', level: 2 },
    { menuId: 200, parentId: 0, rootParent: 200, name: 'Petty Cash Management', type: 'Module', level: 1 },
    { menuId: 201, parentId: 200, rootParent: 200, name: 'Advance Request (PCV)', type: 'Screen', level: 2 },
    { menuId: 202, parentId: 200, rootParent: 200, name: 'Disbursement & Cash Issue', type: 'Feature', level: 2 },
    { menuId: 203, parentId: 200, rootParent: 200, name: 'Bill Submission & GST Offset', type: 'Screen', level: 2 },
    { menuId: 204, parentId: 200, rootParent: 200, name: 'IOU Aging Matrix & Escalations', type: 'Screen', level: 2 },
    { menuId: 205, parentId: 200, rootParent: 200, name: 'Till Float Balance Proof', type: 'Feature', level: 2 },
    { menuId: 300, parentId: 0, rootParent: 300, name: 'Sales Day-End Reconciliation', type: 'Module', level: 1 },
    { menuId: 301, parentId: 300, rootParent: 300, name: 'Daily Shift Close', type: 'Screen', level: 2 },
    { menuId: 302, parentId: 300, rootParent: 300, name: 'Payment Channel Breakdown', type: 'Feature', level: 2 },
    { menuId: 303, parentId: 300, rootParent: 300, name: 'Variance Exception Override', type: 'Feature', level: 2 },
    { menuId: 304, parentId: 300, rootParent: 300, name: 'Period Lock / Day Finalization', type: 'Feature', level: 2 },
    { menuId: 400, parentId: 0, rootParent: 400, name: 'Central Governance & Approvals', type: 'Module', level: 1 },
    { menuId: 401, parentId: 400, rootParent: 400, name: 'Approvals Queue & Review', type: 'Screen', level: 2 },
    { menuId: 402, parentId: 400, rootParent: 400, name: 'Stage Approvals (Maker-Checker)', type: 'Feature', level: 2 },
    { menuId: 403, parentId: 400, rootParent: 400, name: 'Approval Stages Setup', type: 'Screen', level: 2 },
    { menuId: 404, parentId: 400, rootParent: 400, name: 'Approval Templates Setup', type: 'Screen', level: 2 },
    { menuId: 405, parentId: 400, rootParent: 400, name: 'Document Unblocking Authority', type: 'Feature', level: 2 },
    { menuId: 500, parentId: 0, rootParent: 500, name: 'Administration', type: 'Module', level: 1 },
    { menuId: 501, parentId: 500, rootParent: 500, name: 'User Management', type: 'Screen', level: 2 },
    { menuId: 502, parentId: 500, rootParent: 500, name: 'Roles & Permissions', type: 'Screen', level: 2 },
    { menuId: 503, parentId: 500, rootParent: 500, name: 'Notifications Formats', type: 'Screen', level: 2 },
    { menuId: 504, parentId: 500, rootParent: 500, name: 'Print Formats', type: 'Screen', level: 2 },
    { menuId: 505, parentId: 500, rootParent: 500, name: 'Audit & File Export', type: 'Screen', level: 2 },
    { menuId: 600, parentId: 0, rootParent: 600, name: 'Master Data Management', type: 'Module', level: 1 },
    { menuId: 700, parentId: 0, rootParent: 700, name: 'Financial Reports & Analytics', type: 'Module', level: 1 },
  ];
  for (const mn of menuNodes) {
    await prisma.menuNode.upsert({ where: { menuId: mn.menuId }, update: {}, create: mn });
  }

  // 23. Roles & Module Permissions
  const allModules = [
    'cashDeposit', 'pettyCash', 'salesRecon', 'approvals', 'masterData',
    'userManagement', 'rolesPermissions', 'notifications', 'printFormats', 'auditExport', 'reports',
  ];
  const roleDefs = [
    { code: 'ADM', name: 'System Administrator', description: 'Unrestricted enterprise security & system configuration' },
    { code: 'FIN-MGR', name: 'Finance Manager', description: 'Senior treasury approver, period unblocking & audit exports' },
    { code: 'FIN-CHK', name: 'Finance Checker', description: 'Daily operational auditor, Maker-Checker verification & reports' },
    { code: 'AST-CSH', name: 'Assistant Cashier', description: 'Central treasury receiver, settlements & vault receipts' },
    { code: 'OUT-CSH', name: 'Outlet Cashier', description: 'Frontline outlet maker for cash slips, petty cash & shift close' },
    { code: 'COL-OFF', name: 'Cash Collector', description: 'Transit envelope handover & courier verification' },
  ];
  const roleMap = new Map<string, number>();
  for (const rd of roleDefs) {
    const role = await prisma.role.upsert({ where: { code: rd.code }, update: {}, create: rd });
    roleMap.set(role.code, role.id);

    for (const mod of allModules) {
      const isAdm = rd.code === 'ADM';
      const isMgr = rd.code === 'FIN-MGR';
      const isChk = rd.code === 'FIN-CHK';
      const isOpsMod = ['cashDeposit', 'pettyCash', 'salesRecon', 'reports', 'printFormats'].includes(mod);
      const isApproveMod = ['cashDeposit', 'pettyCash', 'salesRecon', 'approvals'].includes(mod);

      const isAdminOnlyMod = ['userManagement', 'rolesPermissions'].includes(mod);
      await prisma.rolePermission.upsert({
        where: { roleId_moduleKey: { roleId: role.id, moduleKey: mod } },
        update: {},
        create: {
          roleId: role.id,
          moduleKey: mod,
          canRead: isAdm || isMgr || isChk || isOpsMod || (rd.code === 'AST-CSH' && mod === 'approvals'),
          canCreate: isAdm || (isMgr && !isAdminOnlyMod) || (isChk && !isAdminOnlyMod) || (['OUT-CSH', 'AST-CSH', 'COL-OFF'].includes(rd.code) && isOpsMod),
          canUpdate: isAdm || (isMgr && !isAdminOnlyMod) || (isChk && !isAdminOnlyMod) || (['OUT-CSH', 'AST-CSH', 'COL-OFF'].includes(rd.code) && isOpsMod),
          canDelete: isAdm || (isMgr && !isAdminOnlyMod),
          canApprove: isAdm || ((isMgr || isChk) && isApproveMod) || (rd.code === 'AST-CSH' && mod === 'cashDeposit'),
          canUnblock: isAdm || (isMgr && !isAdminOnlyMod) || (isChk && mod === 'auditExport'),
        },
      });
    }
  }

  // 24. User Groups
  const groupDefs = [
    { userGroupId: 'UG-CSH-01', groupCode: 'GRP-CASHIER', name: 'Outlet Cashiers Group', defaultRoleId: roleMap.get('OUT-CSH')!, defaultBadge: 'Maker', isAllFullAuth: false },
    { userGroupId: 'UG-COL-02', groupCode: 'GRP-COLLECTOR', name: 'Cash Transit Collectors Group', defaultRoleId: roleMap.get('COL-OFF')!, defaultBadge: 'Handover', isAllFullAuth: false },
    { userGroupId: 'UG-AST-03', groupCode: 'GRP-ASST-CASH', name: 'Assistant Treasury Cashiers', defaultRoleId: roleMap.get('AST-CSH')!, defaultBadge: 'Receiver', isAllFullAuth: false },
    { userGroupId: 'UG-CHK-04', groupCode: 'GRP-CHECKER', name: 'Finance Checkers & Auditors', defaultRoleId: roleMap.get('FIN-CHK')!, defaultBadge: 'Checker', isAllFullAuth: false },
    { userGroupId: 'UG-MGR-05', groupCode: 'GRP-FIN-MGR', name: 'Finance Managers & Treasury Controllers', defaultRoleId: roleMap.get('FIN-MGR')!, defaultBadge: 'Approver', isAllFullAuth: true },
    { userGroupId: 'UG-ADM-06', groupCode: 'GRP-SYS-ADMIN', name: 'System Security & Administrators', defaultRoleId: roleMap.get('ADM')!, defaultBadge: 'Admin', isAllFullAuth: true },
  ];
  const groupMap = new Map<string, number>();
  for (const gd of groupDefs) {
    const grp = await prisma.userGroup.upsert({ where: { userGroupId: gd.userGroupId }, update: {}, create: gd });
    groupMap.set(grp.userGroupId, grp.id);
  }

  // 25a. Non-loginable System Automated Process Actor (used for background jobs & audit backfill)
  await prisma.user.upsert({
    where: { username: 'system' },
    update: { isActive: false },
    create: {
      username: 'system',
      fullName: 'System Automated Process',
      email: 'system@bnf-cms.internal',
      passwordHash: '!SYSTEM_NON_LOGINABLE_ACCOUNT!',
      empNo: 'SYS-000',
      designation: 'Automated System Actor',
      avatar: 'SY',
      roleId: roleMap.get('ADM')!,
      userGroupId: groupMap.get('UG-ADM-06')!,
      isActive: false,
    },
  });

  // 25. Users (6 Demo Accounts with strong bcrypt cost-12 hashes)
  const usersSeed = [
    {
      username: 'ashujau', fullName: 'Ahmed Shujau', email: 'ashujau@brewfeast.mv', pass: 'bnf@maker2026',
      empNo: 'CSH-104', designation: 'Head Cashier', roleCode: 'OUT-CSH', groupCode: 'UG-CSH-01', employeeId: emps[0].id,
      companies: [comp1.id], branches: [br1.id], outlets: [out1.id, out4.id], departments: [depts[0].id],
    },
    {
      username: 'mlatheef', fullName: 'Mohamed Latheef', email: 'mlatheef@brewfeast.mv', pass: 'bnf@transit2026',
      empNo: 'COL-882', designation: 'Cash Collector', roleCode: 'COL-OFF', groupCode: 'UG-COL-02', employeeId: emps[1].id,
      companies: [comp1.id, comp2.id], branches: [br1.id, br2.id, br3.id, br4.id], outlets: [out1.id, out2.id, out3.id, out4.id, out5.id], departments: [depts[3].id],
    },
    {
      username: 'freema', fullName: 'Fathimath Reema', email: 'freema@brewfeast.mv', pass: 'bnf@vault2026',
      empNo: 'AST-201', designation: 'Assistant Cashier', roleCode: 'AST-CSH', groupCode: 'UG-AST-03', employeeId: emps[2].id,
      companies: [comp1.id], branches: [br1.id, br2.id], outlets: [out1.id, out2.id], departments: [depts[4].id],
    },
    {
      username: 'hshareef', fullName: 'Hassan Shareef', email: 'hshareef@brewfeast.mv', pass: 'bnf@checker2026',
      empNo: 'FIN-091', designation: 'Finance Checker', roleCode: 'FIN-CHK', groupCode: 'UG-CHK-04', employeeId: emps[3].id,
      companies: [comp1.id, comp2.id], branches: [br1.id, br2.id, br3.id, br4.id], outlets: [out1.id, out2.id, out3.id, out4.id, out5.id], departments: [depts[0].id, depts[4].id],
    },
    {
      username: 'anawaal', fullName: 'Aishath Nawaal', email: 'anawaal@brewfeast.mv', pass: 'bnf@approver2026',
      empNo: 'FIN-002', designation: 'Finance Manager', roleCode: 'FIN-MGR', groupCode: 'UG-MGR-05', employeeId: emps[4].id,
      companies: [comp1.id, comp2.id], branches: [br1.id, br2.id, br3.id, br4.id], outlets: [out1.id, out2.id, out3.id, out4.id, out5.id], departments: [depts[4].id, depts[5].id],
    },
    {
      username: 'superadmin', fullName: 'Pramuditha Bandara', email: 'admin@brewfeast.mv', pass: 'bnf@admin2026',
      empNo: 'ADM-001', designation: 'System Administrator', roleCode: 'ADM', groupCode: 'UG-ADM-06', employeeId: emps[10].id,
      companies: [], branches: [], outlets: [], departments: depts.map((dp) => dp.id), // Empty company/branch/outlet -> unrestricted root admin
    },
  ];

  const userMap = new Map<string, number>();
  for (const us of usersSeed) {
    const hash = await bcrypt.hash(us.pass, 12);
    const user = await prisma.user.upsert({
      where: { username: us.username },
      update: {},
      create: {
        username: us.username,
        fullName: us.fullName,
        email: us.email,
        passwordHash: hash,
        empNo: us.empNo,
        designation: us.designation,
        avatar: us.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
        roleId: roleMap.get(us.roleCode)!,
        userGroupId: groupMap.get(us.groupCode)!,
        employeeId: us.employeeId,
        contactNo: '+960 779-1122',
        address: 'Boduthakurufaanu Magu, Male, Maldives',
      },
    });
    userMap.set(user.username, user.id);

    for (const cid of us.companies) {
      await prisma.userCompanyAccess.upsert({
        where: { userId_companyId: { userId: user.id, companyId: cid } },
        update: {},
        create: { userId: user.id, companyId: cid },
      });
    }
    for (const bid of us.branches) {
      await prisma.userBranchAccess.upsert({
        where: { userId_branchId: { userId: user.id, branchId: bid } },
        update: {},
        create: { userId: user.id, branchId: bid },
      });
    }
    for (const oid of us.outlets) {
      await prisma.userOutletAccess.upsert({
        where: { userId_outletId: { userId: user.id, outletId: oid } },
        update: {},
        create: { userId: user.id, outletId: oid },
      });
    }
    for (const did of us.departments) {
      await prisma.userDepartmentAccess.upsert({
        where: { userId_departmentId: { userId: user.id, departmentId: did } },
        update: {},
        create: { userId: user.id, departmentId: did },
      });
    }

    // Seed per-user screen authorizations
    const isFull = us.roleCode === 'ADM' || us.roleCode === 'FIN-MGR';
    const isChecker = us.roleCode === 'FIN-CHK';
    for (const sc of allScreens) {
      const opsOrReport = ['Operations', 'Reports'].includes(sc.category) || sc.screenId === 'SCR-PRNT-011';
      const canAccess = isFull || (isChecker && sc.category !== 'Master Data' ? true : isChecker ? true : opsOrReport);
      const canApprove = isFull || (isChecker && ['Operations', 'Governance'].includes(sc.category));
      await prisma.userScreenAuthorization.upsert({
        where: { userId_screenId: { userId: user.id, screenId: sc.id } },
        update: {},
        create: {
          userId: user.id,
          screenId: sc.id,
          authLevel: isFull ? 0 : canApprove ? 3 : canAccess ? 2 : 6,
          canAccess,
          canCreate: isFull || (canAccess && sc.category === 'Operations'),
          canEdit: isFull || (canAccess && sc.category === 'Operations'),
          canApprove,
          canExport: canAccess,
        },
      });
    }
  }

  // 26. Number Series (14 active series)
  const seriesSeed = [
    { seriesId: 'SER-REQ-001', seriesName: 'Primary-REQ-2026', formId: 'FRM-PCR-REQ', prefix: 'REQ-', suffix: '', initialNumber: 1, nextNumber: 17, numDigits: 3, isDefault: true, branchId: null },
    { seriesId: 'SER-REQ-002', seriesName: 'Airport-VIA-REQ', formId: 'FRM-PCR-REQ', prefix: 'REQ-VIA-', suffix: '', initialNumber: 1, nextNumber: 101, numDigits: 4, isDefault: false, branchId: br1.id },
    { seriesId: 'SER-PCA-003', seriesName: 'Primary-PCA-2026', formId: 'FRM-PCA-ADV', prefix: 'PCA-2026-', suffix: '', initialNumber: 1, nextNumber: 46, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-BSUB-004', seriesName: 'Primary-BSUB-2026', formId: 'FRM-BSUB-BILL', prefix: 'BSUB-2026-', suffix: '', initialNumber: 1, nextNumber: 83, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-RET-005', seriesName: 'Primary-RET-2026', formId: 'FRM-RET-CASH', prefix: 'RET-2026-', suffix: '', initialNumber: 1, nextNumber: 15, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-REIMB-006', seriesName: 'Primary-REIMB-2026', formId: 'FRM-FLT-REIMB', prefix: 'REIMB-2026-', suffix: '', initialNumber: 1, nextNumber: 9, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-CCD-007', seriesName: 'Primary-CCD-2026', formId: 'FRM-CCD-COLLECT', prefix: 'CCD-2026-', suffix: '', initialNumber: 1, nextNumber: 90, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-CCD-008', seriesName: 'Hulhumale-HLC-CCD', formId: 'FRM-CCD-COLLECT', prefix: 'CCD-HLC-', suffix: '-2026', initialNumber: 1, nextNumber: 201, numDigits: 4, isDefault: false, branchId: br2.id },
    { seriesId: 'SER-PV-009', seriesName: 'Primary-PV-2026', formId: 'FRM-CCD-PAY', prefix: 'PV-2026-', suffix: '', initialNumber: 1, nextNumber: 45, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-DS-010', seriesName: 'Primary-DS-2026', formId: 'FRM-CCD-SETTLE', prefix: 'DS-2026-', suffix: '', initialNumber: 1, nextNumber: 13, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-BD-011', seriesName: 'Primary-BD-2026', formId: 'FRM-CCD-BANK', prefix: 'BD-2026-', suffix: '', initialNumber: 1, nextNumber: 56, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-MPAY-013', seriesName: 'Primary-MPAY-2026', formId: 'FRM-MAIN-PAY', prefix: 'MPAY-2026-', suffix: '', initialNumber: 1, nextNumber: 15, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-MSET-014', seriesName: 'Primary-MSET-2026', formId: 'FRM-MAIN-SETTLE', prefix: 'MSET-2026-', suffix: '', initialNumber: 1, nextNumber: 9, numDigits: 4, isDefault: true, branchId: null },
    { seriesId: 'SER-SREC-012', seriesName: 'Primary-SREC-2026', formId: 'FRM-SREC-DAYEND', prefix: 'SREC-2026-', suffix: '', initialNumber: 1, nextNumber: 91, numDigits: 4, isDefault: true, branchId: null },
  ];
  for (const s of seriesSeed) {
    await prisma.numberSeries.upsert({ where: { seriesId: s.seriesId }, update: {}, create: s });
  }

  // 27. Business Configuration (single default tenant row)
  const existingCfg = await prisma.businessConfig.findFirst();
  if (!existingCfg) {
    await prisma.businessConfig.create({
      data: {
        primaryOperatingCompanyId: comp1.id,
        baseCurrency: 'USD',
        baseSymbol: '$',
        operationalCurrency: 'MVR',
        operationalSymbol: 'Rf',
        fixedExchangeRateMVR: d(15.42),
        fixedExchangeRateEUR: d(1.09),
        pettyCashGstRate: d(8.0),
        defaultTGSTRate: d(16.0),
      },
    });
  }

  // 28. Notification Templates (5)
  const notifTemplates = [
    {
      code: 'NOTIF-01', name: 'Pending Cashier Settlement Alert',
      triggerEvent: 'Cashier submits settlement / Overdue > 24 hours',
      targetRoles: ['Assistant Cashier', 'Finance Checker'],
      subject: '[BNF Alert] Pending Settlement {DocNo} from {Outlet}',
      body: 'Cashier {Employee} submitted settlement {DocNo} ({Amount}, Envelope {EnvelopeNo}) awaiting treasury verification.',
      variables: ['{DocNo}', '{Outlet}', '{Employee}', '{Amount}', '{EnvelopeNo}'],
    },
    {
      code: 'NOTIF-02', name: 'Petty Cash Advance Approval Request',
      triggerEvent: 'Employee submits petty cash advance > threshold',
      targetRoles: ['Finance Checker', 'Finance Manager'],
      subject: '[BNF Approval] Petty Cash Request {RequestId} ({Amount})',
      body: '{Employee} ({Department}) submitted request {RequestId} for {Amount}: {Purpose}.',
      variables: ['{RequestId}', '{Employee}', '{Amount}', '{Department}', '{Purpose}'],
    },
    {
      code: 'NOTIF-03', name: 'IOU Ageing & Overdue Advance Warning',
      triggerEvent: 'Advance unsettled for > 30 / 60 / 90 days',
      emailEnabled: true, systemAlertEnabled: true, mobilePushEnabled: false,
      targetRoles: ['Finance Manager', 'Department Head', 'Employee'],
      subject: '[BNF Overdue IOU] Voucher {VoucherNo} aged {Days} days',
      body: 'Advance {VoucherNo} issued to {Employee} on {IssueDate} ({Amount}) remains unsettled after {Days} days.',
      variables: ['{VoucherNo}', '{Employee}', '{Amount}', '{IssueDate}', '{Days}'],
    },
    {
      code: 'NOTIF-04', name: 'Sales Shift Day-End Variance Shortage Exception',
      triggerEvent: 'Shift close variance exceeds -$50.00',
      targetRoles: ['Finance Checker', 'Finance Manager', 'Head of Finance'],
      subject: '[BNF Exception] Sales Variance {VarianceAmount} at {Outlet}',
      body: '{Outlet} ({Shift}) reported POS Sales {PosSales} vs Collections {Collections} (Variance: {VarianceAmount}).',
      variables: ['{Outlet}', '{Shift}', '{VarianceAmount}', '{PosSales}', '{Collections}'],
    },
    {
      code: 'NOTIF-05', name: 'Float Replenishment Alert',
      triggerEvent: 'Float account drops below 30% baseline threshold',
      emailEnabled: false, systemAlertEnabled: true, mobilePushEnabled: true,
      targetRoles: ['Outlet Cashier', 'Assistant Cashier'],
      subject: '[BNF Float] Low Balance Alert on {FloatAccount}',
      body: '{FloatAccount} current balance {Balance} dropped below baseline threshold {Threshold}.',
      variables: ['{FloatAccount}', '{Balance}', '{Threshold}'],
    },
  ];
  for (const nt of notifTemplates) {
    await prisma.notificationTemplate.upsert({ where: { code: nt.code }, update: {}, create: nt });
  }

  // 29. Print Templates (6)
  const printTemplates = [
    { templateKey: 'PRINT-01', code: 'FMT-CCD-VOUCHER', name: 'Cash Collection Receipt Voucher', process: 'Process 01', orientation: 'Portrait', paperSize: 'A4', sections: ['Header', 'Denominations', 'Signatures'], sampleDoc: 'CCD-2026-0042' },
    { templateKey: 'PRINT-02', code: 'FMT-CPAY-VOUCHER', name: 'Cashier Payment / Spending Voucher', process: 'Process 01', orientation: 'Portrait', paperSize: 'A5', sections: ['Header', 'Payment Details', 'Signatures'], sampleDoc: 'PV-BNF-4412' },
    { templateKey: 'PRINT-03', code: 'FMT-PCA-VOUCHER', name: 'Petty Cash Advance & IOU Voucher', process: 'Process 02', orientation: 'Portrait', paperSize: 'A5', sections: ['Header', 'Advance Details', 'Covenant'], sampleDoc: 'PCA-2026-0044' },
    { templateKey: 'PRINT-04', code: 'FMT-BSUB-VOUCHER', name: 'Petty Cash Bill Settlement & Return Receipt', process: 'Process 02', orientation: 'Portrait', paperSize: 'A4', sections: ['Header', 'Bills', 'GST Summary', 'Signatures'], sampleDoc: 'BSUB-2026-0029' },
    { templateKey: 'PRINT-05', code: 'FMT-SREC-STATEMENT', name: 'Daily Shift Sales Reconciliation Statement', process: 'Process 03', orientation: 'Landscape', paperSize: 'A4', sections: ['Header', 'Shifts', 'Tenders', 'GL Voucher'], sampleDoc: 'SREC-2026-0043' },
    { templateKey: 'PRINT-06', code: 'FMT-DAYEND-LOCK', name: 'Outlet Day-End Readiness Summary', process: 'Process 03', orientation: 'Portrait', paperSize: 'A4', sections: ['Header', 'Outlets', 'Lock Certificate'], sampleDoc: 'DAYEND-LOCK-2026-10-19' },
  ];
  for (const pt of printTemplates) {
    await prisma.printTemplate.upsert({ where: { templateKey: pt.templateKey }, update: {}, create: pt });
  }

  // 30. Approval Stages & Templates
  const stg1 = await prisma.approvalStage.upsert({
    where: { code: 'STG-01' },
    update: {},
    create: {
      code: 'STG-01',
      name: 'Cashier Supervisor Verification',
      noOfApproval: 1,
      noOfReject: 1,
      description: 'First-line treasury supervisor verification',
      approvers: {
        create: [
          { userId: userMap.get('freema')!, maxLimitBase: d(5000) },
          { userId: userMap.get('hshareef')!, maxLimitBase: d(15000) },
        ],
      },
    },
  });
  const stg2 = await prisma.approvalStage.upsert({
    where: { code: 'STG-02' },
    update: {},
    create: {
      code: 'STG-02',
      name: 'Finance Checker Audit',
      noOfApproval: 1,
      noOfReject: 1,
      description: 'Independent Finance Checker verification',
      approvers: {
        create: [{ userId: userMap.get('hshareef')!, maxLimitBase: d(15000) }],
      },
    },
  });
  const stg3 = await prisma.approvalStage.upsert({
    where: { code: 'STG-03' },
    update: {},
    create: {
      code: 'STG-03',
      name: 'Finance Manager Sign-off',
      noOfApproval: 1,
      noOfReject: 1,
      description: 'Senior Finance Manager final authorization',
      approvers: {
        create: [{ userId: userMap.get('anawaal')!, maxLimitBase: d(50000) }],
      },
    },
  });
  await prisma.approvalStage.upsert({
    where: { code: 'STG-04' },
    update: {},
    create: {
      code: 'STG-04',
      name: 'Head of Finance / CFO Approval',
      noOfApproval: 1,
      noOfReject: 1,
      description: 'Executive Controller high-value authorization',
      approvers: {
        create: [{ userId: userMap.get('superadmin')!, maxLimitBase: d(250000) }],
      },
    },
  });

  const tplCcd = await prisma.approvalTemplate.upsert({
    where: { code: 'TPL-CCD-HIGH' },
    update: {},
    create: {
      code: 'TPL-CCD-HIGH',
      name: 'Cash Collection & Treasury Deposit Workflow',
      description: 'Multi-stage approval chain for outlet cash handovers',
      governedDocuments: ['cashCollectionDeposit', 'cashierTransfer', 'bankDepositJournal'],
      stages: {
        create: [
          { stageId: stg1.id, stageOrder: 1 },
          { stageId: stg2.id, stageOrder: 2 },
          { stageId: stg3.id, stageOrder: 3 },
        ],
      },
      terms: {
        create: [
          { field: 'Total Base USD', operator: '>=', value: '1000', description: 'Amount >= 1,000 requires multi-tier sign-off' },
        ],
      },
    },
  });

  const tplPcv = await prisma.approvalTemplate.upsert({
    where: { code: 'TPL-PCV-ADV' },
    update: {},
    create: {
      code: 'TPL-PCV-ADV',
      name: 'Petty Cash Advance & Bill Settlement Workflow',
      description: 'Two-stage Finance Checker & Manager approval',
      governedDocuments: ['pettyCashAdvance', 'pettyCashBillSettlement'],
      stages: {
        create: [
          { stageId: stg2.id, stageOrder: 1 },
          { stageId: stg3.id, stageOrder: 2 },
        ],
      },
      terms: {
        create: [
          { field: 'Request Amount', operator: '>', value: '250', description: 'Request > 250 requires Finance Manager approval' },
        ],
      },
    },
  });

  const tplSrec = await prisma.approvalTemplate.upsert({
    where: { code: 'TPL-SREC-CLOSE' },
    update: {},
    create: {
      code: 'TPL-SREC-CLOSE',
      name: 'Sales Day-End Reconciliation & Lock Workflow',
      description: 'Checker and Finance Manager sign-off for daily shift closures',
      governedDocuments: ['salesReconciliation'],
      stages: {
        create: [
          { stageId: stg2.id, stageOrder: 1 },
          { stageId: stg3.id, stageOrder: 2 },
        ],
      },
      terms: {
        create: [
          { field: 'Variance Diff', operator: '!=', value: '0', description: 'Non-zero shift variance requires Checker audit' },
        ],
      },
    },
  });

  // 31. Optional Sample Operational Transactions
  // Production/default seed MUST NOT auto-insert sample financial transactions.
  // Set SEED_DEMO_TRANSACTIONS=true (and NODE_ENV !== 'production') only for isolated test/dev fixtures.
  if (process.env.SEED_DEMO_TRANSACTIONS !== 'true' || process.env.NODE_ENV === 'production') {
    console.log('✅ Configuration & Master Data seed completed (no sample financial transactions inserted).');
    return;
  }

  console.log('ℹ️ SEED_DEMO_TRANSACTIONS=true enabled (non-production): seeding isolated test transaction fixtures...');
  const dep1 = await prisma.cashDeposit.upsert({
    where: { docNo: 'CCD-2026-0042' },
    update: {},
    create: {
      docNo: 'CCD-2026-0042',
      docDate: dt('2026-10-19'),
      collectionDate: dt('2026-10-19'),
      collectionTime: '08:45 AM',
      companyId: comp1.id,
      branchId: br1.id,
      outletId: out1.id,
      cashierId: emps[0].id,
      cashCollectorId: emps[1].id,
      paymentTypeId: ptCash.id,
      envelopeNo: 'ENV-8921-A',
      receiveFrom: 'Ahmed Shujau (CSH-104) - Male Airport Outlet',
      baseCurrencyCode: 'USD',
      totalBaseAmount: d(3189),
      status: 'Submitted',
      remark: 'Morning shift cash handover with sealed security envelope #8921-A.',
      createdById: userMap.get('ashujau')!,
      currencies: {
        create: [
          { currencyId: curMap.get('USD')!, amount: d(1450), exRate: d(1), baseAmount: d(1450) },
          { currencyId: curMap.get('EUR')!, amount: d(850), exRate: d(1.09), baseAmount: d(926.5) },
          { currencyId: curMap.get('MVR')!, amount: d(12500), exRate: d(0.065), baseAmount: d(812.5) },
        ],
      },
      denominations: {
        create: [
          { currencyId: curMap.get('USD')!, denominationValue: d(100), noteCount: 10 },
          { currencyId: curMap.get('USD')!, denominationValue: d(50), noteCount: 9 },
          { currencyId: curMap.get('MVR')!, denominationValue: d(500), noteCount: 25 },
        ],
      },
    },
  });

  await prisma.cashDeposit.upsert({
    where: { docNo: 'CCD-2026-0041' },
    update: {},
    create: {
      docNo: 'CCD-2026-0041',
      docDate: dt('2026-10-18'),
      collectionDate: dt('2026-10-18'),
      collectionTime: '09:15 PM',
      companyId: comp1.id,
      branchId: br2.id,
      outletId: out2.id,
      cashierId: emps[6].id,
      cashCollectorId: emps[1].id,
      paymentTypeId: ptCash.id,
      envelopeNo: 'ENV-8919-C',
      baseCurrencyCode: 'USD',
      totalBaseAmount: d(4968),
      status: 'Approved',
      remark: 'Evening close verified and stamped by Bank of Maldives.',
      createdById: userMap.get('ashujau')!,
      approvedById: userMap.get('anawaal')!,
      approvedAt: new Date('2026-10-18T17:30:00Z'),
      currencies: {
        create: [
          { currencyId: curMap.get('USD')!, amount: d(2100), exRate: d(1), baseAmount: d(2100) },
          { currencyId: curMap.get('EUR')!, amount: d(1200), exRate: d(1.09), baseAmount: d(1308) },
          { currencyId: curMap.get('MVR')!, amount: d(24000), exRate: d(0.065), baseAmount: d(1560) },
        ],
      },
    },
  });

  // Sample Petty Cash Request
  const pcr1 = await prisma.pettyCashRequest.upsert({
    where: { requestId: 'REQ-015' },
    update: {},
    create: {
      requestId: 'REQ-015',
      requestDate: dt('2026-10-19'),
      companyId: comp1.id,
      branchId: br1.id,
      outletId: out1.id,
      departmentId: depts[1].id,
      requestedById: emps[5].id,
      requesterTitle: 'Ali Moosa (EMP-402) - Senior Sous Chef',
      expenseCategoryId: expCats[0].id,
      currencyId: curMap.get('USD')!,
      requestAmount: d(250),
      baseCurrencyCode: 'USD',
      baseAmount: d(250),
      purpose: 'Urgent purchase of organic vanilla beans and dairy cream for airport VIP flight catering.',
      remark: 'Authorized by Executive Pastry Chef.',
      status: 'Submitted',
      createdById: userMap.get('ashujau')!,
    },
  });

  const pcr2 = await prisma.pettyCashRequest.upsert({
    where: { requestId: 'REQ-014' },
    update: {},
    create: {
      requestId: 'REQ-014',
      requestDate: dt('2026-10-18'),
      companyId: comp1.id,
      branchId: br2.id,
      outletId: out2.id,
      departmentId: depts[2].id,
      requestedById: emps[7].id,
      expenseCategoryId: expCats[1].id,
      currencyId: curMap.get('USD')!,
      requestAmount: d(420),
      baseCurrencyCode: 'USD',
      baseAmount: d(420),
      approvedAmount: d(420),
      paidAmount: d(420),
      approvedById: userMap.get('anawaal')!,
      approvedByName: 'Aishath Nawaal',
      approvedDate: dt('2026-10-18'),
      purpose: 'Replacement compressor capacitor and copper piping for walk-in chiller unit 2.',
      status: 'Approved',
      createdById: userMap.get('ashujau')!,
    },
  });

  // Sample Petty Cash Advance & IOU
  const adv1 = await prisma.pettyCashAdvance.upsert({
    where: { docNo: 'PCA-2026-0044' },
    update: {},
    create: {
      docNo: 'PCA-2026-0044',
      docDate: dt('2026-10-18'),
      requestId: pcr2.id,
      requestRefLabel: 'REQ-014 / 18 Oct 2026',
      companyId: comp1.id,
      branchId: br2.id,
      outletId: out2.id,
      departmentId: depts[2].id,
      departmentName: 'Facilities & Maintenance',
      expenseCategoryId: expCats[1].id,
      expenseCategory: 'Store Repairs & Hardware',
      requesterId: emps[7].id,
      requesterName: 'Ibrahim Rasheed',
      employeeNo: 'EMP-215',
      requestedAmount: d(420),
      approvedAmount: d(420),
      amountPaid: d(420),
      balanceDue: d(420),
      paymentType: 'Cash Handover',
      bankOrCashAccount: 'Central Airport Petty Cash Float - Acc #7704',
      currencyId: curMap.get('USD')!,
      baseCurrencyCode: 'USD',
      baseAmountPaid: d(420),
      narration: 'Advance issued for walk-in chiller emergency repair.',
      status: 'Paid',
      createdById: userMap.get('freema')!,
    },
  });

  await prisma.pettyCashIOU.upsert({
    where: { docId: 'PCA-2026-0044' },
    update: {},
    create: {
      docId: 'PCA-2026-0044',
      docDate: dt('2026-10-18'),
      advanceId: adv1.id,
      employeeId: emps[7].id,
      employeeName: 'Ibrahim Rasheed',
      employeeNo: 'EMP-215',
      departmentName: 'Facilities & Maintenance',
      purpose: 'Walk-in chiller compressor replacement',
      baseCurrencyCode: 'USD',
      advAmount: d(420),
      settledAmount: d(0),
      returnAmount: d(0),
      pendingAmount: d(420),
      status: 'Active Advance',
    },
  });

  // Sample Sales Reconciliations
  await prisma.salesReconciliation.upsert({
    where: { docNo: 'SREC-2026-0042' },
    update: {},
    create: {
      docNo: 'SREC-2026-0042',
      docDate: dt('2026-10-19'),
      companyId: comp1.id,
      branchId: br1.id,
      outletId: out1.id,
      shiftId: shifts[0].id,
      cashierId: emps[0].id,
      shiftStatus: 'Closed',
      baseCurrencyCode: 'USD',
      posGrossSales: d(4850),
      returnsAmount: d(65),
      netSales: d(4785),
      totalCollectionBase: d(4785),
      varianceAmount: d(0),
      varianceStatus: 'Matched (Zero Variance)',
      status: 'Approved',
      approverName: 'Hassan Shareef',
      approvedById: userMap.get('hshareef')!,
      approvedAt: new Date('2026-10-19T10:30:00Z'),
      linkedCashDepositId: dep1.id,
      remark: 'Morning shift closed with 100% matched card batches and verified cash envelope.',
      createdById: userMap.get('ashujau')!,
      lines: {
        create: [
          { shiftId: shifts[0].id, shiftName: 'Shift 1', cashierName: 'Ahmed Shujau', shiftTotalSales: d(4850), bankOrSafe: 'Safe / Till', paymentTypeId: ptCash.id, paymentTypeName: 'Cash', subTypeName: 'Physical Cash', currencyId: curMap.get('USD')!, amount: d(1450), exRate: d(1), baseAmount: d(1450), autoFilledFromDepositId: dep1.id },
          { shiftId: shifts[0].id, shiftName: 'Shift 1', cashierName: 'Ahmed Shujau', shiftTotalSales: d(4850), bankOrSafe: 'BML Terminal 01', paymentTypeId: ptCard.id, paymentTypeName: 'Card Terminal 01', subTypeName: 'Visa', currencyId: curMap.get('USD')!, amount: d(2100), exRate: d(1), baseAmount: d(2100) },
          { shiftId: shifts[0].id, shiftName: 'Shift 1', cashierName: 'Ahmed Shujau', shiftTotalSales: d(4850), bankOrSafe: 'SBI Terminal 02', paymentTypeId: ptCard.id, paymentTypeName: 'Card Terminal 02', subTypeName: 'MasterCard', currencyId: curMap.get('USD')!, amount: d(1000), exRate: d(1), baseAmount: d(1000) },
          { shiftId: shifts[0].id, shiftName: 'Shift 1', cashierName: 'Ahmed Shujau', shiftTotalSales: d(4850), bankOrSafe: 'BML Online / QR', paymentTypeId: ptQr.id, paymentTypeName: 'QR Payment', subTypeName: 'GPay / Online', currencyId: curMap.get('USD')!, amount: d(235), exRate: d(1), baseAmount: d(235) },
        ],
      },
    },
  });

  const srec2 = await prisma.salesReconciliation.upsert({
    where: { docNo: 'SREC-2026-0041' },
    update: {},
    create: {
      docNo: 'SREC-2026-0041',
      docDate: dt('2026-10-18'),
      companyId: comp1.id,
      branchId: br2.id,
      outletId: out2.id,
      shiftId: shifts[1].id,
      cashierId: emps[6].id,
      shiftStatus: 'Closed',
      baseCurrencyCode: 'USD',
      posGrossSales: d(6150),
      returnsAmount: d(120),
      netSales: d(6030),
      totalCollectionBase: d(5909.5),
      varianceAmount: d(-120.5),
      varianceStatus: 'Shortage Exception (-$120.50)',
      status: 'In Review',
      remark: 'Cash shortage detected (-$120.50). Investigating table #14 bill void.',
      createdById: userMap.get('ashujau')!,
    },
  });

  await prisma.varianceIncident.upsert({
    where: { incidentCode: 'VAR-2026-001' },
    update: {},
    create: {
      incidentCode: 'VAR-2026-001',
      reconciliationId: srec2.id,
      incidentDate: dt('2026-10-18'),
      shiftTime: 'Shift 2 - Evening',
      companyId: comp1.id,
      branchId: br2.id,
      outletId: out2.id,
      cashierId: emps[6].id,
      cashierName: 'Ibrahim Naseem',
      type: 'Shortage',
      posExpectedAmount: d(6030),
      actualCountAmount: d(5909.5),
      varianceAmount: d(-120.5),
      rootCause: 'POS Bill Void Post-Authorization',
      cashierExplanation: 'Guest table #14 voided after settlement slip printed.',
      checkerAction: 'Under Finance Checker Investigation',
      auditStatus: 'Investigating',
    },
  });

  // Seed Active Approval Instances for Submitted items
  const existingAppCount = await prisma.approvalInstance.count();
  if (existingAppCount === 0) {
    await prisma.approvalInstance.createMany({
      data: [
        {
          templateId: tplCcd.id,
          entityType: 'cash_deposit',
          entityId: dep1.id,
          docNo: dep1.docNo,
          title: 'Cash Handover: ENV-8921-A',
          companyId: comp1.id,
          branchId: br1.id,
          outletId: out1.id,
          submittedById: userMap.get('ashujau')!,
          amountBase: d(3189),
          baseCurrencyCode: 'USD',
          triggerSummary: 'Amount >= 1,000 requires multi-tier sign-off',
          currentStageOrder: 1,
          totalStages: 3,
          status: 'Pending',
        },
        {
          templateId: tplPcv.id,
          entityType: 'petty_cash_request',
          entityId: pcr1.id,
          docNo: pcr1.requestId,
          title: 'Advance: Urgent organic vanilla beans purchase',
          companyId: comp1.id,
          branchId: br1.id,
          outletId: out1.id,
          submittedById: userMap.get('ashujau')!,
          amountBase: d(250),
          baseCurrencyCode: 'USD',
          triggerSummary: 'Standard Petty Cash Review',
          currentStageOrder: 1,
          totalStages: 2,
          status: 'Pending',
        },
        {
          templateId: tplSrec.id,
          entityType: 'sales_reconciliation',
          entityId: srec2.id,
          docNo: srec2.docNo,
          title: 'Shift Recon: SREC-2026-0041 (Variance -$120.50)',
          companyId: comp1.id,
          branchId: br2.id,
          outletId: out2.id,
          submittedById: userMap.get('ashujau')!,
          amountBase: d(6030),
          baseCurrencyCode: 'USD',
          triggerSummary: 'Non-zero shift variance requires Checker audit',
          currentStageOrder: 1,
          totalStages: 2,
          status: 'In Review',
        },
      ],
    });
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
