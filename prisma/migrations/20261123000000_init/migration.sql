-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "registrationNo" VARCHAR(100),
    "taxId" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Maldives',
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "managerName" VARCHAR(150),
    "contactNo" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlets" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "outletType" VARCHAR(100) NOT NULL DEFAULT 'Dine-in & GrabGo',
    "posTerminals" INTEGER NOT NULL DEFAULT 1,
    "cashiersCount" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "headOfDepartment" VARCHAR(150),
    "budgetCode" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "empNo" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "designation" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120),
    "phone" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "startTime" VARCHAR(20) NOT NULL,
    "endTime" VARCHAR(20) NOT NULL,
    "durationHours" INTEGER NOT NULL DEFAULT 8,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(15) NOT NULL,
    "rateToBase" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "localRate" DECIMAL(18,6),
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "fromCurrencyId" INTEGER NOT NULL,
    "toCurrencyId" INTEGER NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "source" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denominations" (
    "id" SERIAL NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "denomType" VARCHAR(20) NOT NULL DEFAULT 'Bill',
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "swiftCode" VARCHAR(50),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Maldives',
    "contactInfo" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "bankId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "accountNo" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "branchLocation" VARCHAR(150),
    "accountType" VARCHAR(50) NOT NULL DEFAULT 'Current',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "float_accounts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "assignedEmployeeId" INTEGER,
    "outletId" INTEGER,
    "baseLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "float_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gl_accounts" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "isCashBank" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "taxId" VARCHAR(100),
    "contactInfo" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "glAccountId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_types" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "taxApplicable" BOOLEAN NOT NULL DEFAULT true,
    "requiresQuoteOver" DECIMAL(18,2) NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "fiscalYear" VARCHAR(10) NOT NULL,
    "allocatedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthlyLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "consumedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_advance_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "defaultMaxLimit" DECIMAL(18,2) NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_advance_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "autoFillFromProcess01" BOOLEAN NOT NULL DEFAULT false,
    "glAccountId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_sub_types" (
    "id" SERIAL NOT NULL,
    "paymentTypeId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "surchargePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "terminalRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_sub_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terminals" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "terminalName" VARCHAR(150) NOT NULL,
    "serialNo" VARCHAR(100) NOT NULL,
    "outletId" INTEGER NOT NULL,
    "bankId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflows" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "stagesCount" INTEGER NOT NULL DEFAULT 3,
    "appliesTo" VARCHAR(150) NOT NULL,
    "thresholdLabel" VARCHAR(80) NOT NULL,
    "thresholdValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_masters" (
    "id" SERIAL NOT NULL,
    "formId" VARCHAR(60) NOT NULL,
    "formName" VARCHAR(150) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "module" VARCHAR(80) NOT NULL,
    "screenId" VARCHAR(60),
    "routeKey" VARCHAR(100),
    "defaultPrefix" VARCHAR(30) NOT NULL,
    "defaultNumDigits" INTEGER NOT NULL DEFAULT 4,
    "isTransactional" BOOLEAN NOT NULL DEFAULT true,
    "makerCheckerType" VARCHAR(60) NOT NULL DEFAULT 'Standard',
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "moduleKey" VARCHAR(60) NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canUpdate" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canUnblock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "id" SERIAL NOT NULL,
    "groupCode" VARCHAR(50) NOT NULL,
    "userGroupId" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "defaultRoleId" INTEGER NOT NULL,
    "defaultBadge" VARCHAR(40) NOT NULL DEFAULT 'User',
    "isAllFullAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screens" (
    "id" SERIAL NOT NULL,
    "screenId" VARCHAR(60) NOT NULL,
    "formId" VARCHAR(60) NOT NULL,
    "screenName" VARCHAR(150) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "routeKey" VARCHAR(120) NOT NULL,
    "iconName" VARCHAR(60),
    "description" VARCHAR(255),
    "makerCheckerType" VARCHAR(60) NOT NULL DEFAULT 'Standard',
    "supportedActions" TEXT[] DEFAULT ARRAY['view']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_screen_defaults" (
    "id" SERIAL NOT NULL,
    "userGroupId" INTEGER NOT NULL,
    "screenId" INTEGER NOT NULL,
    "authLevel" INTEGER NOT NULL DEFAULT 4,
    "canAccess" BOOLEAN NOT NULL DEFAULT true,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_group_screen_defaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_nodes" (
    "menuId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "rootParent" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "menu_nodes_pkey" PRIMARY KEY ("menuId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "empNo" VARCHAR(50),
    "designation" VARCHAR(120),
    "contactNo" VARCHAR(50),
    "address" VARCHAR(255),
    "remark" TEXT,
    "avatar" VARCHAR(10),
    "roleId" INTEGER NOT NULL,
    "userGroupId" INTEGER,
    "employeeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isConfirmEmail" BOOLEAN NOT NULL DEFAULT true,
    "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT false,
    "requireChangeOnLogin" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "navMenuMode" VARCHAR(20) NOT NULL DEFAULT 'both',
    "docSectionMode" VARCHAR(20) NOT NULL DEFAULT 'boxes',
    "preferences" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "deviceInfo" VARCHAR(255),
    "ipAddress" VARCHAR(64),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_access" (
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("userId","companyId")
);

-- CreateTable
CREATE TABLE "user_branch_access" (
    "userId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,

    CONSTRAINT "user_branch_access_pkey" PRIMARY KEY ("userId","branchId")
);

-- CreateTable
CREATE TABLE "user_outlet_access" (
    "userId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,

    CONSTRAINT "user_outlet_access_pkey" PRIMARY KEY ("userId","outletId")
);

-- CreateTable
CREATE TABLE "user_department_access" (
    "userId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "user_department_access_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "user_screen_authorizations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "screenId" INTEGER NOT NULL,
    "authLevel" INTEGER NOT NULL DEFAULT 6,
    "canAccess" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canExport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_screen_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_menu_authorizations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "menuId" INTEGER NOT NULL,
    "authLevel" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "user_menu_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_series" (
    "id" SERIAL NOT NULL,
    "seriesId" VARCHAR(60) NOT NULL,
    "seriesName" VARCHAR(150) NOT NULL,
    "formId" VARCHAR(60) NOT NULL,
    "prefix" VARCHAR(40) NOT NULL,
    "suffix" VARCHAR(40) NOT NULL DEFAULT '',
    "initialNumber" INTEGER NOT NULL DEFAULT 1,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "lastNumber" INTEGER NOT NULL DEFAULT 99999,
    "numDigits" INTEGER NOT NULL DEFAULT 4,
    "periodIndicator" VARCHAR(30) NOT NULL DEFAULT 'FY2026',
    "branchId" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "number_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_configs" (
    "id" SERIAL NOT NULL,
    "primaryOperatingCompanyId" INTEGER,
    "baseCurrency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseSymbol" VARCHAR(15) NOT NULL DEFAULT '$',
    "operationalCurrency" VARCHAR(10) NOT NULL DEFAULT 'MVR',
    "operationalSymbol" VARCHAR(15) NOT NULL DEFAULT 'Rf',
    "exchangeRateMode" VARCHAR(30) NOT NULL DEFAULT 'Fixed',
    "fixedExchangeRateMVR" DECIMAL(18,6) NOT NULL DEFAULT 15.42,
    "fixedExchangeRateEUR" DECIMAL(18,6) NOT NULL DEFAULT 1.09,
    "decimalPrecision" INTEGER NOT NULL DEFAULT 2,
    "roundingMethod" VARCHAR(30) NOT NULL DEFAULT 'standard',
    "varianceTolerancePercent" DECIMAL(6,3) NOT NULL DEFAULT 0.5,
    "fiscalYearStartMonth" VARCHAR(20) NOT NULL DEFAULT 'January',
    "currentFiscalYear" VARCHAR(10) NOT NULL DEFAULT '2026',
    "dailyShiftCutOffTime" VARCHAR(10) NOT NULL DEFAULT '23:59',
    "periodLockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "transitGracePeriodHours" INTEGER NOT NULL DEFAULT 48,
    "taxRegistrationNo" VARCHAR(100) NOT NULL DEFAULT 'TIN-994012',
    "defaultTGSTRate" DECIMAL(6,2) NOT NULL DEFAULT 16.0,
    "pettyCashGstRate" DECIMAL(6,2) NOT NULL DEFAULT 8.0,
    "serviceChargeRate" DECIMAL(6,2) NOT NULL DEFAULT 10.0,
    "maxCashAdvanceVoucherBase" DECIMAL(18,2) NOT NULL DEFAULT 500.0,
    "dualSignatoryRequiredBase" DECIMAL(18,2) NOT NULL DEFAULT 1000.0,
    "mandatoryReceiptThresholdBase" DECIMAL(18,2) NOT NULL DEFAULT 25.0,
    "defaultOutletTillFloatBase" DECIMAL(18,2) NOT NULL DEFAULT 2000.0,
    "highVarianceAlertBase" DECIMAL(18,2) NOT NULL DEFAULT 100.0,
    "iouOverdueEscalationDays" INTEGER NOT NULL DEFAULT 14,
    "maximumIOUValidityDays" INTEGER NOT NULL DEFAULT 30,
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Indian/Maldives (UTC+5)',
    "dateFormat" VARCHAR(30) NOT NULL DEFAULT 'DD-MMM-YYYY',
    "timeFormat" VARCHAR(20) NOT NULL DEFAULT '12-hour',
    "currencyPosition" VARCHAR(20) NOT NULL DEFAULT 'prefix',
    "businessWeekDays" TEXT[] DEFAULT ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "triggerEvent" VARCHAR(255) NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "systemAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mobilePushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER,
    "recipientUserId" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "channel" VARCHAR(30) NOT NULL DEFAULT 'system',
    "severity" VARCHAR(30) NOT NULL DEFAULT 'info',
    "entityType" VARCHAR(60),
    "entityId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_templates" (
    "id" SERIAL NOT NULL,
    "templateKey" VARCHAR(40) NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "process" VARCHAR(60) NOT NULL,
    "orientation" VARCHAR(20) NOT NULL DEFAULT 'Portrait',
    "paperSize" VARCHAR(10) NOT NULL DEFAULT 'A4',
    "sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sampleDoc" VARCHAR(80) NOT NULL,
    "headerConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "id" SERIAL NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "lineRef" VARCHAR(60),
    "fileName" VARCHAR(255) NOT NULL,
    "storedName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "fileSizeLabel" VARCHAR(40) NOT NULL,
    "docType" VARCHAR(60) NOT NULL DEFAULT 'Document',
    "remark" VARCHAR(500) NOT NULL DEFAULT '',
    "storagePath" VARCHAR(500) NOT NULL,
    "uploadedById" INTEGER,
    "uploadedByName" VARCHAR(150) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "docNo" VARCHAR(80),
    "action" VARCHAR(60) NOT NULL,
    "step" VARCHAR(180) NOT NULL,
    "fromStatus" VARCHAR(50),
    "toStatus" VARCHAR(50),
    "performedById" INTEGER,
    "performedByName" VARCHAR(150) NOT NULL,
    "remarks" TEXT,
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_export_batches" (
    "id" SERIAL NOT NULL,
    "batchCode" VARCHAR(80) NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "totalBaseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "baseCurrency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "exportedById" INTEGER NOT NULL,
    "payloadSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_export_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposits" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "collectionDate" DATE NOT NULL,
    "collectionTime" VARCHAR(20) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "cashCollectorId" INTEGER NOT NULL,
    "paymentTypeId" INTEGER NOT NULL,
    "envelopeNo" VARCHAR(100) NOT NULL,
    "receiveFrom" VARCHAR(200),
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "totalBaseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Draft',
    "remark" TEXT,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposit_currencies" (
    "id" SERIAL NOT NULL,
    "cashDepositId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "exRate" DECIMAL(18,6) NOT NULL,
    "baseAmount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "cash_deposit_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposit_denominations" (
    "id" SERIAL NOT NULL,
    "cashDepositId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "denominationValue" DECIMAL(18,2) NOT NULL,
    "noteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cash_deposit_denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashier_payments" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "paymentVoucherNo" VARCHAR(60) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "cashierId" INTEGER,
    "cashierName" VARCHAR(150) NOT NULL,
    "requesterId" INTEGER,
    "requesterName" VARCHAR(150) NOT NULL,
    "vendorId" INTEGER,
    "vendorName" VARCHAR(150) NOT NULL,
    "departmentId" INTEGER,
    "departmentName" VARCHAR(150) NOT NULL,
    "floatAccountId" INTEGER,
    "floatAccountName" VARCHAR(180) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "cashAdvanceType" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBalanceInHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receiptNumber" VARCHAR(80),
    "narration" TEXT,
    "denominations" JSONB,
    "approvalStatus" VARCHAR(40) NOT NULL DEFAULT 'Submitted',
    "approvedByName" VARCHAR(150),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashier_settlements" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "fromCashierId" INTEGER,
    "fromCashierName" VARCHAR(150) NOT NULL,
    "toCashierId" INTEGER,
    "toCashierName" VARCHAR(150) NOT NULL,
    "floatAccountId" INTEGER,
    "floatAccountName" VARCHAR(180) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "totalTransferBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Pending Acceptance',
    "acceptedById" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashier_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashier_settlement_lines" (
    "id" SERIAL NOT NULL,
    "settlementId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "collection" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cashOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transferAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseTransferAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "denominations" JSONB,

    CONSTRAINT "cashier_settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_collection_receipts" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "receiptVoucherNo" VARCHAR(60) NOT NULL,
    "receiptDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "settlementId" INTEGER,
    "settledDocNo" VARCHAR(60),
    "settledDocDate" DATE,
    "receivedFromName" VARCHAR(150) NOT NULL,
    "receiptType" VARCHAR(80) NOT NULL DEFAULT 'Main Cash Collection',
    "collectionAccount" VARCHAR(180),
    "bankAccountId" INTEGER,
    "bankAccountName" VARCHAR(180) NOT NULL,
    "cashAccountName" VARCHAR(180) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "settlementBaseAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receiptBaseAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "differenceBaseAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "postedStatus" VARCHAR(60) NOT NULL DEFAULT 'Posted to Ledger',
    "postedById" INTEGER,
    "postedByName" VARCHAR(150),
    "narration" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_collection_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_collection_receipt_lines" (
    "id" SERIAL NOT NULL,
    "receiptId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "settlementAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receiptAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "remark" VARCHAR(255),
    "denominations" JSONB,

    CONSTRAINT "cash_collection_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_cashier_payments" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "paymentVoucherNo" VARCHAR(60) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "vendorId" INTEGER,
    "vendorName" VARCHAR(150) NOT NULL,
    "cashAdvanceType" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "departmentId" INTEGER,
    "departmentName" VARCHAR(150) NOT NULL,
    "requesterId" INTEGER,
    "requesterName" VARCHAR(150) NOT NULL,
    "floatAccountId" INTEGER,
    "floatAccountName" VARCHAR(180) NOT NULL,
    "totalBalanceInHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceCurrency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "approvalStatus" VARCHAR(40) NOT NULL DEFAULT 'Submitted',
    "approvedByName" VARCHAR(150),
    "receiptNumber" VARCHAR(80),
    "narration" TEXT,
    "denominations" JSONB,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_cashier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_cashier_settlements" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "fromCashierId" INTEGER,
    "fromCashierName" VARCHAR(150) NOT NULL,
    "toBankAccountId" INTEGER,
    "toBankName" VARCHAR(180) NOT NULL,
    "primaryCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "totalTransferBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Submitted',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_cashier_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_cashier_settlement_lines" (
    "id" SERIAL NOT NULL,
    "settlementId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "collection" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cashOut" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transferAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseTransferAmt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "denominations" JSONB,

    CONSTRAINT "main_cashier_settlement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_bank_deposits" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "depositDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "depositBankRefNo" VARCHAR(100) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "bankAccountId" INTEGER,
    "depositAccountName" VARCHAR(200) NOT NULL,
    "processFlowDecision" VARCHAR(30) NOT NULL,
    "totalCollectionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "glAccounting" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Completed Deposit',
    "remark" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_bank_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_bank_deposit_items" (
    "id" SERIAL NOT NULL,
    "bankDepositId" INTEGER NOT NULL,
    "cashDepositId" INTEGER,
    "collectionDocNo" VARCHAR(60) NOT NULL,
    "collectionDate" DATE NOT NULL,
    "collectionAmount" DECIMAL(18,2) NOT NULL,
    "settledAmount" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "outlet_bank_deposit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_reconciliations" (
    "id" SERIAL NOT NULL,
    "docCode" VARCHAR(60) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "bankDepositId" INTEGER,
    "depositBankRefNo" VARCHAR(100) NOT NULL,
    "depositDate" DATE NOT NULL,
    "settledAmount" DECIMAL(18,2) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "depositBankName" VARCHAR(150) NOT NULL,
    "statementDate" DATE,
    "statementRef" VARCHAR(100),
    "statementAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "matchingMethod" VARCHAR(100) NOT NULL DEFAULT 'Direct Statement Import',
    "reconciledById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_requests" (
    "id" SERIAL NOT NULL,
    "requestId" VARCHAR(60) NOT NULL,
    "requestDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "departmentId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "requesterTitle" VARCHAR(200),
    "expenseCategoryId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "requestAmount" DECIMAL(18,2) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(18,2),
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledDate" DATE,
    "refundDate" DATE,
    "purpose" TEXT NOT NULL,
    "remark" TEXT,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Draft',
    "approvedById" INTEGER,
    "approvedByName" VARCHAR(150),
    "approvedDate" DATE,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_advances" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "requestId" INTEGER,
    "requestRefLabel" VARCHAR(100),
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "departmentId" INTEGER,
    "departmentName" VARCHAR(150) NOT NULL,
    "expenseCategoryId" INTEGER,
    "expenseCategory" VARCHAR(150) NOT NULL,
    "requesterId" INTEGER,
    "requesterName" VARCHAR(150) NOT NULL,
    "employeeNo" VARCHAR(50) NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refundDate" DATE,
    "balanceDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentType" VARCHAR(50) NOT NULL DEFAULT 'Cash Handover',
    "floatAccountId" INTEGER,
    "bankOrCashAccount" VARCHAR(200) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseAmountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountInWords" VARCHAR(255),
    "narration" TEXT,
    "settledStatus" VARCHAR(80) NOT NULL DEFAULT 'Unsettled (Active Advance)',
    "status" VARCHAR(40) NOT NULL DEFAULT 'Paid',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_bill_submissions" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "departmentId" INTEGER,
    "departmentName" VARCHAR(150) NOT NULL,
    "employeeId" INTEGER,
    "employeeName" VARCHAR(150) NOT NULL,
    "employeeNo" VARCHAR(50) NOT NULL,
    "submissionType" VARCHAR(60) NOT NULL DEFAULT 'Advance Settlement Direct',
    "requestId" INTEGER,
    "advanceId" INTEGER,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "totalAdvanceBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalBillAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceToReturn" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dueDays" INTEGER NOT NULL DEFAULT 0,
    "cashierNotified" BOOLEAN NOT NULL DEFAULT false,
    "approverAction" VARCHAR(60) NOT NULL DEFAULT 'Pending Verification',
    "approverRemark" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending Verification',
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_bill_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_bill_lines" (
    "id" SERIAL NOT NULL,
    "billSubmissionId" INTEGER NOT NULL,
    "billDate" DATE NOT NULL,
    "billNo" VARCHAR(80) NOT NULL,
    "supplierName" VARCHAR(150) NOT NULL,
    "vendorId" INTEGER,
    "expenseCategoryId" INTEGER,
    "expenseCategoryName" VARCHAR(150) NOT NULL,
    "location" VARCHAR(150),
    "description" TEXT NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "attachmentName" VARCHAR(255),

    CONSTRAINT "petty_cash_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_bill_adjustments" (
    "id" SERIAL NOT NULL,
    "billSubmissionId" INTEGER NOT NULL,
    "paymentNo" VARCHAR(60) NOT NULL,
    "paymentDate" DATE,
    "balanceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustedAmountLocal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "localCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'MVR',
    "remark" VARCHAR(255),

    CONSTRAINT "petty_cash_bill_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_returns" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "requestId" INTEGER,
    "advanceId" INTEGER,
    "billSubmissionId" INTEGER,
    "departmentId" INTEGER,
    "departmentName" VARCHAR(150) NOT NULL,
    "requesterName" VARCHAR(150) NOT NULL,
    "employeeNo" VARCHAR(50) NOT NULL,
    "receivedByName" VARCHAR(150) NOT NULL,
    "advanceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receiptType" VARCHAR(40) NOT NULL DEFAULT 'Cash',
    "bankOrCashAccount" VARCHAR(200) NOT NULL,
    "returnAmount" DECIMAL(18,2) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "baseReturnAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountInWords" VARCHAR(255),
    "narration" TEXT,
    "status" VARCHAR(60) NOT NULL DEFAULT 'Receipt Issued & Settled',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "float_reimbursements" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "locationName" VARCHAR(150),
    "floatAccountId" INTEGER,
    "floatAccountName" VARCHAR(200) NOT NULL,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "floatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reimburseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceCashInHand" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "narration" TEXT,
    "status" VARCHAR(60) NOT NULL DEFAULT 'Draft',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "float_reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "float_reimbursement_vouchers" (
    "id" SERIAL NOT NULL,
    "reimbursementId" INTEGER NOT NULL,
    "billSubmissionId" INTEGER,
    "requestRef" VARCHAR(60),
    "voucherNo" VARCHAR(60) NOT NULL,
    "voucherDate" VARCHAR(40) NOT NULL,
    "employeeName" VARCHAR(150) NOT NULL,
    "expenseCategoryName" VARCHAR(150) NOT NULL,
    "remark" VARCHAR(255),
    "amount" DECIMAL(18,2) NOT NULL,
    "runningTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "float_reimbursement_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petty_cash_ious" (
    "id" SERIAL NOT NULL,
    "docId" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "advanceId" INTEGER,
    "employeeId" INTEGER,
    "employeeName" VARCHAR(150) NOT NULL,
    "employeeNo" VARCHAR(50) NOT NULL,
    "departmentName" VARCHAR(150),
    "purpose" VARCHAR(255),
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "advAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "settledVfApproved" VARCHAR(60) NOT NULL DEFAULT 'Pending Verification',
    "returnAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(60) NOT NULL DEFAULT 'Active Advance',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_ious_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reconciliations" (
    "id" SERIAL NOT NULL,
    "docNo" VARCHAR(60) NOT NULL,
    "docDate" DATE NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "shiftId" INTEGER,
    "cashierId" INTEGER,
    "shiftStatus" VARCHAR(40) NOT NULL DEFAULT 'Closed',
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "posGrossSales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "returnsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netSales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCollectionBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "varianceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "varianceStatus" VARCHAR(100) NOT NULL DEFAULT 'Matched (Zero Variance)',
    "rootCauseCategory" VARCHAR(120),
    "overrideReason" TEXT,
    "isPeriodLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" INTEGER,
    "lockedAt" TIMESTAMP(3),
    "unblockedById" INTEGER,
    "unblockedAt" TIMESTAMP(3),
    "unblockReason" TEXT,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Draft',
    "remark" TEXT,
    "approverName" VARCHAR(150),
    "approverRemarks" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "linkedCashDepositId" INTEGER,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reconciliation_lines" (
    "id" SERIAL NOT NULL,
    "reconciliationId" INTEGER NOT NULL,
    "shiftId" INTEGER,
    "shiftName" VARCHAR(80) NOT NULL,
    "cashierName" VARCHAR(150) NOT NULL,
    "shiftTotalSales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bankOrSafe" VARCHAR(120) NOT NULL,
    "paymentTypeId" INTEGER,
    "paymentTypeName" VARCHAR(100) NOT NULL,
    "subTypeName" VARCHAR(120) NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "autoFilledFromDepositId" INTEGER,
    "diffType" VARCHAR(60),
    "remarks" VARCHAR(255),

    CONSTRAINT "sales_reconciliation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variance_incidents" (
    "id" SERIAL NOT NULL,
    "incidentCode" VARCHAR(60) NOT NULL,
    "reconciliationId" INTEGER,
    "incidentDate" DATE NOT NULL,
    "shiftTime" VARCHAR(80) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "cashierId" INTEGER,
    "cashierName" VARCHAR(150) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "posExpectedAmount" DECIMAL(18,2) NOT NULL,
    "actualCountAmount" DECIMAL(18,2) NOT NULL,
    "varianceAmount" DECIMAL(18,2) NOT NULL,
    "rootCause" VARCHAR(200) NOT NULL,
    "cashierExplanation" TEXT,
    "checkerAction" TEXT,
    "recoveryMode" VARCHAR(80),
    "auditStatus" VARCHAR(50) NOT NULL DEFAULT 'Investigating',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variance_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_stages" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "noOfApproval" INTEGER NOT NULL DEFAULT 1,
    "noOfReject" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_stage_approvers" (
    "id" SERIAL NOT NULL,
    "stageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "maxLimitBase" DECIMAL(18,2) NOT NULL DEFAULT 10000,

    CONSTRAINT "approval_stage_approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_templates" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "governedDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_template_stages" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "stageId" INTEGER NOT NULL,
    "stageOrder" INTEGER NOT NULL,

    CONSTRAINT "approval_template_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_template_originators" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "approval_template_originators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_template_terms" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "operator" VARCHAR(20) NOT NULL,
    "value" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "approval_template_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_instances" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" INTEGER NOT NULL,
    "docNo" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "outletId" INTEGER,
    "submittedById" INTEGER NOT NULL,
    "amountBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "triggerSummary" VARCHAR(255),
    "currentStageOrder" INTEGER NOT NULL DEFAULT 1,
    "totalStages" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(40) NOT NULL DEFAULT 'Pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" SERIAL NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "stageId" INTEGER,
    "stageOrder" INTEGER NOT NULL,
    "decidedById" INTEGER NOT NULL,
    "decision" VARCHAR(30) NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "companies_isActive_idx" ON "companies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");

-- CreateIndex
CREATE INDEX "branches_isActive_idx" ON "branches"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_code_key" ON "outlets"("code");

-- CreateIndex
CREATE INDEX "outlets_branchId_idx" ON "outlets"("branchId");

-- CreateIndex
CREATE INDEX "outlets_isActive_idx" ON "outlets"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_branchId_idx" ON "locations"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_empNo_key" ON "employees"("empNo");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_outletId_idx" ON "employees"("outletId");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_code_key" ON "shifts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_isBase_idx" ON "currencies"("isBase");

-- CreateIndex
CREATE INDEX "currencies_isActive_idx" ON "currencies"("isActive");

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrencyId_toCurrencyId_effectiveDate_idx" ON "exchange_rates"("fromCurrencyId", "toCurrencyId", "effectiveDate");

-- CreateIndex
CREATE INDEX "exchange_rates_isActive_idx" ON "exchange_rates"("isActive");

-- CreateIndex
CREATE INDEX "denominations_currencyId_idx" ON "denominations"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "denominations_currencyId_value_key" ON "denominations"("currencyId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "banks_code_key" ON "banks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_accountNo_key" ON "bank_accounts"("accountNo");

-- CreateIndex
CREATE INDEX "bank_accounts_bankId_idx" ON "bank_accounts"("bankId");

-- CreateIndex
CREATE INDEX "bank_accounts_currencyId_idx" ON "bank_accounts"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "float_accounts_code_key" ON "float_accounts"("code");

-- CreateIndex
CREATE INDEX "float_accounts_currencyId_idx" ON "float_accounts"("currencyId");

-- CreateIndex
CREATE INDEX "float_accounts_assignedEmployeeId_idx" ON "float_accounts"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "float_accounts_outletId_idx" ON "float_accounts"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "gl_accounts_code_key" ON "gl_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");

-- CreateIndex
CREATE INDEX "expense_categories_departmentId_idx" ON "expense_categories"("departmentId");

-- CreateIndex
CREATE INDEX "expense_categories_glAccountId_idx" ON "expense_categories"("glAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_code_key" ON "expense_types"("code");

-- CreateIndex
CREATE INDEX "expense_types_categoryId_idx" ON "expense_types"("categoryId");

-- CreateIndex
CREATE INDEX "budgets_departmentId_idx" ON "budgets"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_departmentId_fiscalYear_key" ON "budgets"("departmentId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "cash_advance_types_code_key" ON "cash_advance_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_types_code_key" ON "payment_types"("code");

-- CreateIndex
CREATE INDEX "payment_types_glAccountId_idx" ON "payment_types"("glAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_sub_types_code_key" ON "payment_sub_types"("code");

-- CreateIndex
CREATE INDEX "payment_sub_types_paymentTypeId_idx" ON "payment_sub_types"("paymentTypeId");

-- CreateIndex
CREATE INDEX "payment_sub_types_currencyId_idx" ON "payment_sub_types"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terminals_code_key" ON "payment_terminals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terminals_serialNo_key" ON "payment_terminals"("serialNo");

-- CreateIndex
CREATE INDEX "payment_terminals_outletId_idx" ON "payment_terminals"("outletId");

-- CreateIndex
CREATE INDEX "payment_terminals_bankId_idx" ON "payment_terminals"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_workflows_code_key" ON "approval_workflows"("code");

-- CreateIndex
CREATE UNIQUE INDEX "form_masters_formId_key" ON "form_masters"("formId");

-- CreateIndex
CREATE INDEX "form_masters_category_idx" ON "form_masters"("category");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_moduleKey_key" ON "role_permissions"("roleId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_groupCode_key" ON "user_groups"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_userGroupId_key" ON "user_groups"("userGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "screens_screenId_key" ON "screens"("screenId");

-- CreateIndex
CREATE INDEX "screens_routeKey_idx" ON "screens"("routeKey");

-- CreateIndex
CREATE INDEX "screens_category_idx" ON "screens"("category");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_screen_defaults_userGroupId_screenId_key" ON "user_group_screen_defaults"("userGroupId", "screenId");

-- CreateIndex
CREATE INDEX "menu_nodes_parentId_idx" ON "menu_nodes"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_userGroupId_idx" ON "users"("userGroupId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "user_screen_authorizations_userId_idx" ON "user_screen_authorizations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_screen_authorizations_userId_screenId_key" ON "user_screen_authorizations"("userId", "screenId");

-- CreateIndex
CREATE INDEX "user_menu_authorizations_userId_idx" ON "user_menu_authorizations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_menu_authorizations_userId_menuId_key" ON "user_menu_authorizations"("userId", "menuId");

-- CreateIndex
CREATE UNIQUE INDEX "number_series_seriesId_key" ON "number_series"("seriesId");

-- CreateIndex
CREATE INDEX "number_series_formId_isDefault_idx" ON "number_series"("formId", "isDefault");

-- CreateIndex
CREATE INDEX "number_series_branchId_idx" ON "number_series"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notification_logs_recipientUserId_isRead_idx" ON "notification_logs"("recipientUserId", "isRead");

-- CreateIndex
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "print_templates_templateKey_key" ON "print_templates"("templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "print_templates_code_key" ON "print_templates"("code");

-- CreateIndex
CREATE INDEX "document_attachments_entityType_entityId_idx" ON "document_attachments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_docNo_idx" ON "audit_logs"("docNo");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "audit_export_batches_batchCode_key" ON "audit_export_batches"("batchCode");

-- CreateIndex
CREATE INDEX "audit_export_batches_createdAt_idx" ON "audit_export_batches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_deposits_docNo_key" ON "cash_deposits"("docNo");

-- CreateIndex
CREATE INDEX "cash_deposits_companyId_branchId_outletId_idx" ON "cash_deposits"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "cash_deposits_collectionDate_idx" ON "cash_deposits"("collectionDate");

-- CreateIndex
CREATE INDEX "cash_deposits_status_idx" ON "cash_deposits"("status");

-- CreateIndex
CREATE INDEX "cash_deposit_currencies_cashDepositId_idx" ON "cash_deposit_currencies"("cashDepositId");

-- CreateIndex
CREATE INDEX "cash_deposit_currencies_currencyId_idx" ON "cash_deposit_currencies"("currencyId");

-- CreateIndex
CREATE INDEX "cash_deposit_denominations_cashDepositId_idx" ON "cash_deposit_denominations"("cashDepositId");

-- CreateIndex
CREATE INDEX "cash_deposit_denominations_currencyId_idx" ON "cash_deposit_denominations"("currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "cashier_payments_docNo_key" ON "cashier_payments"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "cashier_payments_paymentVoucherNo_key" ON "cashier_payments"("paymentVoucherNo");

-- CreateIndex
CREATE INDEX "cashier_payments_companyId_branchId_outletId_idx" ON "cashier_payments"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "cashier_payments_paymentDate_idx" ON "cashier_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "cashier_payments_approvalStatus_idx" ON "cashier_payments"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "cashier_settlements_docNo_key" ON "cashier_settlements"("docNo");

-- CreateIndex
CREATE INDEX "cashier_settlements_companyId_branchId_outletId_idx" ON "cashier_settlements"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "cashier_settlements_status_idx" ON "cashier_settlements"("status");

-- CreateIndex
CREATE INDEX "cashier_settlements_docDate_idx" ON "cashier_settlements"("docDate");

-- CreateIndex
CREATE INDEX "cashier_settlement_lines_settlementId_idx" ON "cashier_settlement_lines"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_collection_receipts_docNo_key" ON "cash_collection_receipts"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "cash_collection_receipts_receiptVoucherNo_key" ON "cash_collection_receipts"("receiptVoucherNo");

-- CreateIndex
CREATE INDEX "cash_collection_receipts_companyId_branchId_outletId_idx" ON "cash_collection_receipts"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "cash_collection_receipts_receiptDate_idx" ON "cash_collection_receipts"("receiptDate");

-- CreateIndex
CREATE INDEX "cash_collection_receipt_lines_receiptId_idx" ON "cash_collection_receipt_lines"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "main_cashier_payments_docNo_key" ON "main_cashier_payments"("docNo");

-- CreateIndex
CREATE UNIQUE INDEX "main_cashier_payments_paymentVoucherNo_key" ON "main_cashier_payments"("paymentVoucherNo");

-- CreateIndex
CREATE INDEX "main_cashier_payments_companyId_branchId_outletId_idx" ON "main_cashier_payments"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "main_cashier_payments_paymentDate_idx" ON "main_cashier_payments"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "main_cashier_settlements_docNo_key" ON "main_cashier_settlements"("docNo");

-- CreateIndex
CREATE INDEX "main_cashier_settlements_companyId_branchId_outletId_idx" ON "main_cashier_settlements"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "main_cashier_settlements_docDate_idx" ON "main_cashier_settlements"("docDate");

-- CreateIndex
CREATE INDEX "main_cashier_settlement_lines_settlementId_idx" ON "main_cashier_settlement_lines"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_bank_deposits_docNo_key" ON "outlet_bank_deposits"("docNo");

-- CreateIndex
CREATE INDEX "outlet_bank_deposits_companyId_branchId_idx" ON "outlet_bank_deposits"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "outlet_bank_deposits_depositDate_idx" ON "outlet_bank_deposits"("depositDate");

-- CreateIndex
CREATE INDEX "outlet_bank_deposit_items_bankDepositId_idx" ON "outlet_bank_deposit_items"("bankDepositId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliations_docCode_key" ON "bank_reconciliations"("docCode");

-- CreateIndex
CREATE INDEX "bank_reconciliations_companyId_branchId_outletId_idx" ON "bank_reconciliations"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_depositBankRefNo_idx" ON "bank_reconciliations"("depositBankRefNo");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_requests_requestId_key" ON "petty_cash_requests"("requestId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_companyId_branchId_idx" ON "petty_cash_requests"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_departmentId_idx" ON "petty_cash_requests"("departmentId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_status_idx" ON "petty_cash_requests"("status");

-- CreateIndex
CREATE INDEX "petty_cash_requests_requestDate_idx" ON "petty_cash_requests"("requestDate");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_advances_docNo_key" ON "petty_cash_advances"("docNo");

-- CreateIndex
CREATE INDEX "petty_cash_advances_companyId_branchId_idx" ON "petty_cash_advances"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "petty_cash_advances_requestId_idx" ON "petty_cash_advances"("requestId");

-- CreateIndex
CREATE INDEX "petty_cash_advances_status_idx" ON "petty_cash_advances"("status");

-- CreateIndex
CREATE INDEX "petty_cash_advances_docDate_idx" ON "petty_cash_advances"("docDate");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_bill_submissions_docNo_key" ON "petty_cash_bill_submissions"("docNo");

-- CreateIndex
CREATE INDEX "petty_cash_bill_submissions_companyId_branchId_idx" ON "petty_cash_bill_submissions"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_submissions_advanceId_idx" ON "petty_cash_bill_submissions"("advanceId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_submissions_status_idx" ON "petty_cash_bill_submissions"("status");

-- CreateIndex
CREATE INDEX "petty_cash_bill_lines_billSubmissionId_idx" ON "petty_cash_bill_lines"("billSubmissionId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_adjustments_billSubmissionId_idx" ON "petty_cash_bill_adjustments"("billSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_returns_docNo_key" ON "petty_cash_returns"("docNo");

-- CreateIndex
CREATE INDEX "petty_cash_returns_companyId_branchId_idx" ON "petty_cash_returns"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "petty_cash_returns_advanceId_idx" ON "petty_cash_returns"("advanceId");

-- CreateIndex
CREATE UNIQUE INDEX "float_reimbursements_docNo_key" ON "float_reimbursements"("docNo");

-- CreateIndex
CREATE INDEX "float_reimbursements_companyId_branchId_idx" ON "float_reimbursements"("companyId", "branchId");

-- CreateIndex
CREATE INDEX "float_reimbursements_status_idx" ON "float_reimbursements"("status");

-- CreateIndex
CREATE INDEX "float_reimbursement_vouchers_reimbursementId_idx" ON "float_reimbursement_vouchers"("reimbursementId");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_ious_docId_key" ON "petty_cash_ious"("docId");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_ious_advanceId_key" ON "petty_cash_ious"("advanceId");

-- CreateIndex
CREATE INDEX "petty_cash_ious_employeeId_idx" ON "petty_cash_ious"("employeeId");

-- CreateIndex
CREATE INDEX "petty_cash_ious_status_idx" ON "petty_cash_ious"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reconciliations_docNo_key" ON "sales_reconciliations"("docNo");

-- CreateIndex
CREATE INDEX "sales_reconciliations_companyId_branchId_outletId_idx" ON "sales_reconciliations"("companyId", "branchId", "outletId");

-- CreateIndex
CREATE INDEX "sales_reconciliations_docDate_idx" ON "sales_reconciliations"("docDate");

-- CreateIndex
CREATE INDEX "sales_reconciliations_status_idx" ON "sales_reconciliations"("status");

-- CreateIndex
CREATE INDEX "sales_reconciliation_lines_reconciliationId_idx" ON "sales_reconciliation_lines"("reconciliationId");

-- CreateIndex
CREATE UNIQUE INDEX "variance_incidents_incidentCode_key" ON "variance_incidents"("incidentCode");

-- CreateIndex
CREATE INDEX "variance_incidents_companyId_outletId_idx" ON "variance_incidents"("companyId", "outletId");

-- CreateIndex
CREATE INDEX "variance_incidents_incidentDate_idx" ON "variance_incidents"("incidentDate");

-- CreateIndex
CREATE INDEX "variance_incidents_type_idx" ON "variance_incidents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "approval_stages_code_key" ON "approval_stages"("code");

-- CreateIndex
CREATE INDEX "approval_stage_approvers_stageId_idx" ON "approval_stage_approvers"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_stage_approvers_stageId_userId_key" ON "approval_stage_approvers"("stageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_templates_code_key" ON "approval_templates"("code");

-- CreateIndex
CREATE INDEX "approval_template_stages_templateId_idx" ON "approval_template_stages"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_template_stages_templateId_stageOrder_key" ON "approval_template_stages"("templateId", "stageOrder");

-- CreateIndex
CREATE UNIQUE INDEX "approval_template_originators_templateId_userId_key" ON "approval_template_originators"("templateId", "userId");

-- CreateIndex
CREATE INDEX "approval_template_terms_templateId_idx" ON "approval_template_terms"("templateId");

-- CreateIndex
CREATE INDEX "approval_instances_entityType_entityId_idx" ON "approval_instances"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "approval_instances_status_idx" ON "approval_instances"("status");

-- CreateIndex
CREATE INDEX "approval_instances_companyId_outletId_idx" ON "approval_instances"("companyId", "outletId");

-- CreateIndex
CREATE INDEX "approval_decisions_instanceId_idx" ON "approval_decisions"("instanceId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denominations" ADD CONSTRAINT "denominations_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_types" ADD CONSTRAINT "expense_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "gl_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_sub_types" ADD CONSTRAINT "payment_sub_types_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "payment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_sub_types" ADD CONSTRAINT "payment_sub_types_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_terminals" ADD CONSTRAINT "payment_terminals_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_terminals" ADD CONSTRAINT "payment_terminals_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_defaultRoleId_fkey" FOREIGN KEY ("defaultRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screens" ADD CONSTRAINT "screens_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form_masters"("formId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_screen_defaults" ADD CONSTRAINT "user_group_screen_defaults_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_screen_defaults" ADD CONSTRAINT "user_group_screen_defaults_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "user_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_outlet_access" ADD CONSTRAINT "user_outlet_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_outlet_access" ADD CONSTRAINT "user_outlet_access_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_access" ADD CONSTRAINT "user_department_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_department_access" ADD CONSTRAINT "user_department_access_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_screen_authorizations" ADD CONSTRAINT "user_screen_authorizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_screen_authorizations" ADD CONSTRAINT "user_screen_authorizations_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_authorizations" ADD CONSTRAINT "user_menu_authorizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_menu_authorizations" ADD CONSTRAINT "user_menu_authorizations_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menu_nodes"("menuId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_formId_fkey" FOREIGN KEY ("formId") REFERENCES "form_masters"("formId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_primaryOperatingCompanyId_fkey" FOREIGN KEY ("primaryOperatingCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_export_batches" ADD CONSTRAINT "audit_export_batches_exportedById_fkey" FOREIGN KEY ("exportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_cashCollectorId_fkey" FOREIGN KEY ("cashCollectorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "payment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposit_currencies" ADD CONSTRAINT "cash_deposit_currencies_cashDepositId_fkey" FOREIGN KEY ("cashDepositId") REFERENCES "cash_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposit_currencies" ADD CONSTRAINT "cash_deposit_currencies_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposit_denominations" ADD CONSTRAINT "cash_deposit_denominations_cashDepositId_fkey" FOREIGN KEY ("cashDepositId") REFERENCES "cash_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposit_denominations" ADD CONSTRAINT "cash_deposit_denominations_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_fromCashierId_fkey" FOREIGN KEY ("fromCashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_toCashierId_fkey" FOREIGN KEY ("toCashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlement_lines" ADD CONSTRAINT "cashier_settlement_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "cashier_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_settlement_lines" ADD CONSTRAINT "cashier_settlement_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "cashier_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipt_lines" ADD CONSTRAINT "cash_collection_receipt_lines_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "cash_collection_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_receipt_lines" ADD CONSTRAINT "cash_collection_receipt_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_fromCashierId_fkey" FOREIGN KEY ("fromCashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_toBankAccountId_fkey" FOREIGN KEY ("toBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlement_lines" ADD CONSTRAINT "main_cashier_settlement_lines_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "main_cashier_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_cashier_settlement_lines" ADD CONSTRAINT "main_cashier_settlement_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposit_items" ADD CONSTRAINT "outlet_bank_deposit_items_bankDepositId_fkey" FOREIGN KEY ("bankDepositId") REFERENCES "outlet_bank_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_bank_deposit_items" ADD CONSTRAINT "outlet_bank_deposit_items_cashDepositId_fkey" FOREIGN KEY ("cashDepositId") REFERENCES "cash_deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bankDepositId_fkey" FOREIGN KEY ("bankDepositId") REFERENCES "outlet_bank_deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "petty_cash_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "petty_cash_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "petty_cash_advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_billSubmissionId_fkey" FOREIGN KEY ("billSubmissionId") REFERENCES "petty_cash_bill_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_bill_adjustments" ADD CONSTRAINT "petty_cash_bill_adjustments_billSubmissionId_fkey" FOREIGN KEY ("billSubmissionId") REFERENCES "petty_cash_bill_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "petty_cash_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "petty_cash_advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_billSubmissionId_fkey" FOREIGN KEY ("billSubmissionId") REFERENCES "petty_cash_bill_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_floatAccountId_fkey" FOREIGN KEY ("floatAccountId") REFERENCES "float_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursement_vouchers" ADD CONSTRAINT "float_reimbursement_vouchers_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "float_reimbursements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "float_reimbursement_vouchers" ADD CONSTRAINT "float_reimbursement_vouchers_billSubmissionId_fkey" FOREIGN KEY ("billSubmissionId") REFERENCES "petty_cash_bill_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_ious" ADD CONSTRAINT "petty_cash_ious_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "petty_cash_advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_ious" ADD CONSTRAINT "petty_cash_ious_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_linkedCashDepositId_fkey" FOREIGN KEY ("linkedCashDepositId") REFERENCES "cash_deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "sales_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_paymentTypeId_fkey" FOREIGN KEY ("paymentTypeId") REFERENCES "payment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_autoFilledFromDepositId_fkey" FOREIGN KEY ("autoFilledFromDepositId") REFERENCES "cash_deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "sales_reconciliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_stage_approvers" ADD CONSTRAINT "approval_stage_approvers_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "approval_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_stage_approvers" ADD CONSTRAINT "approval_stage_approvers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_stages" ADD CONSTRAINT "approval_template_stages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_stages" ADD CONSTRAINT "approval_template_stages_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "approval_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_originators" ADD CONSTRAINT "approval_template_originators_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_originators" ADD CONSTRAINT "approval_template_originators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_template_terms" ADD CONSTRAINT "approval_template_terms_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "approval_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "approval_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "approval_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
