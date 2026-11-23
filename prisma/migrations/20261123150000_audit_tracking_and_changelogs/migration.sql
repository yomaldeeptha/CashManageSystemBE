-- CreateEnum
CREATE TYPE "ChangeLogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'APPROVE', 'REJECT', 'POST', 'REVERSE', 'CLOSE', 'REOPEN', 'STATUS_CHANGE');

-- AlterTable
ALTER TABLE "approval_decisions" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "approval_instances" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "approval_stage_approvers" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "approval_stages" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "approval_template_originators" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "approval_template_stages" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "approval_template_terms" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "approval_templates" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "approval_workflows" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "audit_export_batches" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "bank_reconciliations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "business_configs" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "cash_advance_types" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "cash_collection_receipt_lines" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cash_collection_receipts" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "cash_deposit_currencies" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cash_deposit_denominations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cash_deposits" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "cashier_payments" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "cashier_settlement_lines" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cashier_settlements" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "currencies" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "denominations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "document_attachments" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "expense_categories" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "expense_types" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "float_accounts" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "float_reimbursement_vouchers" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "float_reimbursements" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "form_masters" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "gl_accounts" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "main_cashier_payments" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "main_cashier_settlement_lines" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "main_cashier_settlements" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "menu_nodes" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "notification_logs" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "notification_templates" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "number_series" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "outlet_bank_deposit_items" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "outlet_bank_deposits" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "outlets" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "payment_sub_types" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "payment_terminals" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "payment_types" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "petty_cash_advances" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "petty_cash_bill_adjustments" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "petty_cash_bill_lines" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "petty_cash_bill_submissions" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "petty_cash_ious" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "petty_cash_requests" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "petty_cash_returns" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "print_templates" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "sales_reconciliation_lines" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sales_reconciliations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "screens" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "user_branch_access" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_company_access" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_department_access" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_group_screen_defaults" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_groups" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "user_menu_authorizations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_outlet_access" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_screen_authorizations" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateUserId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "variance_incidents" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "createUserId" INTEGER,
ADD COLUMN     "updateUserId" INTEGER;

-- CreateTable
CREATE TABLE "ChangeLogs" (
    "Id" SERIAL NOT NULL,
    "UserId" INTEGER,
    "UserName" VARCHAR(150) NOT NULL,
    "Action" "ChangeLogAction" NOT NULL,
    "TableName" VARCHAR(100) NOT NULL,
    "RecordId" VARCHAR(64) NOT NULL,
    "RecordCode" VARCHAR(120),
    "OldValues" JSONB,
    "NewValues" JSONB,
    "ChangedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "Description" VARCHAR(500) NOT NULL,
    "IpAddress" VARCHAR(64),
    "UserAgent" VARCHAR(500),
    "CreatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeLogs_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "ChangeLogs_TableName_RecordId_CreatedAt_idx" ON "ChangeLogs"("TableName", "RecordId", "CreatedAt");

-- CreateIndex
CREATE INDEX "ChangeLogs_UserId_CreatedAt_idx" ON "ChangeLogs"("UserId", "CreatedAt");

-- CreateIndex
CREATE INDEX "ChangeLogs_Action_CreatedAt_idx" ON "ChangeLogs"("Action", "CreatedAt");

-- CreateIndex
CREATE INDEX "ChangeLogs_CreatedAt_idx" ON "ChangeLogs"("CreatedAt");

-- CreateIndex
CREATE INDEX "ChangeLogs_RecordCode_idx" ON "ChangeLogs"("RecordCode");

-- CreateIndex
CREATE INDEX "approval_decisions_createUserId_idx" ON "approval_decisions"("createUserId");

-- CreateIndex
CREATE INDEX "approval_decisions_updateUserId_idx" ON "approval_decisions"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_instances_createUserId_idx" ON "approval_instances"("createUserId");

-- CreateIndex
CREATE INDEX "approval_instances_updateUserId_idx" ON "approval_instances"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_stage_approvers_createUserId_idx" ON "approval_stage_approvers"("createUserId");

-- CreateIndex
CREATE INDEX "approval_stage_approvers_updateUserId_idx" ON "approval_stage_approvers"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_stages_createUserId_idx" ON "approval_stages"("createUserId");

-- CreateIndex
CREATE INDEX "approval_stages_updateUserId_idx" ON "approval_stages"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_template_originators_createUserId_idx" ON "approval_template_originators"("createUserId");

-- CreateIndex
CREATE INDEX "approval_template_originators_updateUserId_idx" ON "approval_template_originators"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_template_stages_createUserId_idx" ON "approval_template_stages"("createUserId");

-- CreateIndex
CREATE INDEX "approval_template_stages_updateUserId_idx" ON "approval_template_stages"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_template_terms_createUserId_idx" ON "approval_template_terms"("createUserId");

-- CreateIndex
CREATE INDEX "approval_template_terms_updateUserId_idx" ON "approval_template_terms"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_templates_createUserId_idx" ON "approval_templates"("createUserId");

-- CreateIndex
CREATE INDEX "approval_templates_updateUserId_idx" ON "approval_templates"("updateUserId");

-- CreateIndex
CREATE INDEX "approval_workflows_createUserId_idx" ON "approval_workflows"("createUserId");

-- CreateIndex
CREATE INDEX "approval_workflows_updateUserId_idx" ON "approval_workflows"("updateUserId");

-- CreateIndex
CREATE INDEX "audit_export_batches_createUserId_idx" ON "audit_export_batches"("createUserId");

-- CreateIndex
CREATE INDEX "audit_export_batches_updateUserId_idx" ON "audit_export_batches"("updateUserId");

-- CreateIndex
CREATE INDEX "bank_accounts_createUserId_idx" ON "bank_accounts"("createUserId");

-- CreateIndex
CREATE INDEX "bank_accounts_updateUserId_idx" ON "bank_accounts"("updateUserId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_createUserId_idx" ON "bank_reconciliations"("createUserId");

-- CreateIndex
CREATE INDEX "bank_reconciliations_updateUserId_idx" ON "bank_reconciliations"("updateUserId");

-- CreateIndex
CREATE INDEX "banks_createUserId_idx" ON "banks"("createUserId");

-- CreateIndex
CREATE INDEX "banks_updateUserId_idx" ON "banks"("updateUserId");

-- CreateIndex
CREATE INDEX "branches_createUserId_idx" ON "branches"("createUserId");

-- CreateIndex
CREATE INDEX "branches_updateUserId_idx" ON "branches"("updateUserId");

-- CreateIndex
CREATE INDEX "budgets_createUserId_idx" ON "budgets"("createUserId");

-- CreateIndex
CREATE INDEX "budgets_updateUserId_idx" ON "budgets"("updateUserId");

-- CreateIndex
CREATE INDEX "business_configs_createUserId_idx" ON "business_configs"("createUserId");

-- CreateIndex
CREATE INDEX "business_configs_updateUserId_idx" ON "business_configs"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_advance_types_createUserId_idx" ON "cash_advance_types"("createUserId");

-- CreateIndex
CREATE INDEX "cash_advance_types_updateUserId_idx" ON "cash_advance_types"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_collection_receipt_lines_createUserId_idx" ON "cash_collection_receipt_lines"("createUserId");

-- CreateIndex
CREATE INDEX "cash_collection_receipt_lines_updateUserId_idx" ON "cash_collection_receipt_lines"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_collection_receipts_createUserId_idx" ON "cash_collection_receipts"("createUserId");

-- CreateIndex
CREATE INDEX "cash_collection_receipts_updateUserId_idx" ON "cash_collection_receipts"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_deposit_currencies_createUserId_idx" ON "cash_deposit_currencies"("createUserId");

-- CreateIndex
CREATE INDEX "cash_deposit_currencies_updateUserId_idx" ON "cash_deposit_currencies"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_deposit_denominations_createUserId_idx" ON "cash_deposit_denominations"("createUserId");

-- CreateIndex
CREATE INDEX "cash_deposit_denominations_updateUserId_idx" ON "cash_deposit_denominations"("updateUserId");

-- CreateIndex
CREATE INDEX "cash_deposits_createUserId_idx" ON "cash_deposits"("createUserId");

-- CreateIndex
CREATE INDEX "cash_deposits_updateUserId_idx" ON "cash_deposits"("updateUserId");

-- CreateIndex
CREATE INDEX "cashier_payments_createUserId_idx" ON "cashier_payments"("createUserId");

-- CreateIndex
CREATE INDEX "cashier_payments_updateUserId_idx" ON "cashier_payments"("updateUserId");

-- CreateIndex
CREATE INDEX "cashier_settlement_lines_createUserId_idx" ON "cashier_settlement_lines"("createUserId");

-- CreateIndex
CREATE INDEX "cashier_settlement_lines_updateUserId_idx" ON "cashier_settlement_lines"("updateUserId");

-- CreateIndex
CREATE INDEX "cashier_settlements_createUserId_idx" ON "cashier_settlements"("createUserId");

-- CreateIndex
CREATE INDEX "cashier_settlements_updateUserId_idx" ON "cashier_settlements"("updateUserId");

-- CreateIndex
CREATE INDEX "companies_createUserId_idx" ON "companies"("createUserId");

-- CreateIndex
CREATE INDEX "companies_updateUserId_idx" ON "companies"("updateUserId");

-- CreateIndex
CREATE INDEX "currencies_createUserId_idx" ON "currencies"("createUserId");

-- CreateIndex
CREATE INDEX "currencies_updateUserId_idx" ON "currencies"("updateUserId");

-- CreateIndex
CREATE INDEX "denominations_createUserId_idx" ON "denominations"("createUserId");

-- CreateIndex
CREATE INDEX "denominations_updateUserId_idx" ON "denominations"("updateUserId");

-- CreateIndex
CREATE INDEX "departments_createUserId_idx" ON "departments"("createUserId");

-- CreateIndex
CREATE INDEX "departments_updateUserId_idx" ON "departments"("updateUserId");

-- CreateIndex
CREATE INDEX "document_attachments_createUserId_idx" ON "document_attachments"("createUserId");

-- CreateIndex
CREATE INDEX "document_attachments_updateUserId_idx" ON "document_attachments"("updateUserId");

-- CreateIndex
CREATE INDEX "employees_createUserId_idx" ON "employees"("createUserId");

-- CreateIndex
CREATE INDEX "employees_updateUserId_idx" ON "employees"("updateUserId");

-- CreateIndex
CREATE INDEX "exchange_rates_createUserId_idx" ON "exchange_rates"("createUserId");

-- CreateIndex
CREATE INDEX "exchange_rates_updateUserId_idx" ON "exchange_rates"("updateUserId");

-- CreateIndex
CREATE INDEX "expense_categories_createUserId_idx" ON "expense_categories"("createUserId");

-- CreateIndex
CREATE INDEX "expense_categories_updateUserId_idx" ON "expense_categories"("updateUserId");

-- CreateIndex
CREATE INDEX "expense_types_createUserId_idx" ON "expense_types"("createUserId");

-- CreateIndex
CREATE INDEX "expense_types_updateUserId_idx" ON "expense_types"("updateUserId");

-- CreateIndex
CREATE INDEX "float_accounts_createUserId_idx" ON "float_accounts"("createUserId");

-- CreateIndex
CREATE INDEX "float_accounts_updateUserId_idx" ON "float_accounts"("updateUserId");

-- CreateIndex
CREATE INDEX "float_reimbursement_vouchers_createUserId_idx" ON "float_reimbursement_vouchers"("createUserId");

-- CreateIndex
CREATE INDEX "float_reimbursement_vouchers_updateUserId_idx" ON "float_reimbursement_vouchers"("updateUserId");

-- CreateIndex
CREATE INDEX "float_reimbursements_createUserId_idx" ON "float_reimbursements"("createUserId");

-- CreateIndex
CREATE INDEX "float_reimbursements_updateUserId_idx" ON "float_reimbursements"("updateUserId");

-- CreateIndex
CREATE INDEX "form_masters_createUserId_idx" ON "form_masters"("createUserId");

-- CreateIndex
CREATE INDEX "form_masters_updateUserId_idx" ON "form_masters"("updateUserId");

-- CreateIndex
CREATE INDEX "gl_accounts_createUserId_idx" ON "gl_accounts"("createUserId");

-- CreateIndex
CREATE INDEX "gl_accounts_updateUserId_idx" ON "gl_accounts"("updateUserId");

-- CreateIndex
CREATE INDEX "locations_createUserId_idx" ON "locations"("createUserId");

-- CreateIndex
CREATE INDEX "locations_updateUserId_idx" ON "locations"("updateUserId");

-- CreateIndex
CREATE INDEX "main_cashier_payments_createUserId_idx" ON "main_cashier_payments"("createUserId");

-- CreateIndex
CREATE INDEX "main_cashier_payments_updateUserId_idx" ON "main_cashier_payments"("updateUserId");

-- CreateIndex
CREATE INDEX "main_cashier_settlement_lines_createUserId_idx" ON "main_cashier_settlement_lines"("createUserId");

-- CreateIndex
CREATE INDEX "main_cashier_settlement_lines_updateUserId_idx" ON "main_cashier_settlement_lines"("updateUserId");

-- CreateIndex
CREATE INDEX "main_cashier_settlements_createUserId_idx" ON "main_cashier_settlements"("createUserId");

-- CreateIndex
CREATE INDEX "main_cashier_settlements_updateUserId_idx" ON "main_cashier_settlements"("updateUserId");

-- CreateIndex
CREATE INDEX "menu_nodes_createUserId_idx" ON "menu_nodes"("createUserId");

-- CreateIndex
CREATE INDEX "menu_nodes_updateUserId_idx" ON "menu_nodes"("updateUserId");

-- CreateIndex
CREATE INDEX "notification_logs_createUserId_idx" ON "notification_logs"("createUserId");

-- CreateIndex
CREATE INDEX "notification_logs_updateUserId_idx" ON "notification_logs"("updateUserId");

-- CreateIndex
CREATE INDEX "notification_templates_createUserId_idx" ON "notification_templates"("createUserId");

-- CreateIndex
CREATE INDEX "notification_templates_updateUserId_idx" ON "notification_templates"("updateUserId");

-- CreateIndex
CREATE INDEX "number_series_createUserId_idx" ON "number_series"("createUserId");

-- CreateIndex
CREATE INDEX "number_series_updateUserId_idx" ON "number_series"("updateUserId");

-- CreateIndex
CREATE INDEX "outlet_bank_deposit_items_createUserId_idx" ON "outlet_bank_deposit_items"("createUserId");

-- CreateIndex
CREATE INDEX "outlet_bank_deposit_items_updateUserId_idx" ON "outlet_bank_deposit_items"("updateUserId");

-- CreateIndex
CREATE INDEX "outlet_bank_deposits_createUserId_idx" ON "outlet_bank_deposits"("createUserId");

-- CreateIndex
CREATE INDEX "outlet_bank_deposits_updateUserId_idx" ON "outlet_bank_deposits"("updateUserId");

-- CreateIndex
CREATE INDEX "outlets_createUserId_idx" ON "outlets"("createUserId");

-- CreateIndex
CREATE INDEX "outlets_updateUserId_idx" ON "outlets"("updateUserId");

-- CreateIndex
CREATE INDEX "payment_sub_types_createUserId_idx" ON "payment_sub_types"("createUserId");

-- CreateIndex
CREATE INDEX "payment_sub_types_updateUserId_idx" ON "payment_sub_types"("updateUserId");

-- CreateIndex
CREATE INDEX "payment_terminals_createUserId_idx" ON "payment_terminals"("createUserId");

-- CreateIndex
CREATE INDEX "payment_terminals_updateUserId_idx" ON "payment_terminals"("updateUserId");

-- CreateIndex
CREATE INDEX "payment_types_createUserId_idx" ON "payment_types"("createUserId");

-- CreateIndex
CREATE INDEX "payment_types_updateUserId_idx" ON "payment_types"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_advances_createUserId_idx" ON "petty_cash_advances"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_advances_updateUserId_idx" ON "petty_cash_advances"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_adjustments_createUserId_idx" ON "petty_cash_bill_adjustments"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_adjustments_updateUserId_idx" ON "petty_cash_bill_adjustments"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_lines_createUserId_idx" ON "petty_cash_bill_lines"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_lines_updateUserId_idx" ON "petty_cash_bill_lines"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_submissions_createUserId_idx" ON "petty_cash_bill_submissions"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_bill_submissions_updateUserId_idx" ON "petty_cash_bill_submissions"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_ious_createUserId_idx" ON "petty_cash_ious"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_ious_updateUserId_idx" ON "petty_cash_ious"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_createUserId_idx" ON "petty_cash_requests"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_updateUserId_idx" ON "petty_cash_requests"("updateUserId");

-- CreateIndex
CREATE INDEX "petty_cash_returns_createUserId_idx" ON "petty_cash_returns"("createUserId");

-- CreateIndex
CREATE INDEX "petty_cash_returns_updateUserId_idx" ON "petty_cash_returns"("updateUserId");

-- CreateIndex
CREATE INDEX "print_templates_createUserId_idx" ON "print_templates"("createUserId");

-- CreateIndex
CREATE INDEX "print_templates_updateUserId_idx" ON "print_templates"("updateUserId");

-- CreateIndex
CREATE INDEX "role_permissions_createUserId_idx" ON "role_permissions"("createUserId");

-- CreateIndex
CREATE INDEX "role_permissions_updateUserId_idx" ON "role_permissions"("updateUserId");

-- CreateIndex
CREATE INDEX "roles_createUserId_idx" ON "roles"("createUserId");

-- CreateIndex
CREATE INDEX "roles_updateUserId_idx" ON "roles"("updateUserId");

-- CreateIndex
CREATE INDEX "sales_reconciliation_lines_createUserId_idx" ON "sales_reconciliation_lines"("createUserId");

-- CreateIndex
CREATE INDEX "sales_reconciliation_lines_updateUserId_idx" ON "sales_reconciliation_lines"("updateUserId");

-- CreateIndex
CREATE INDEX "sales_reconciliations_createUserId_idx" ON "sales_reconciliations"("createUserId");

-- CreateIndex
CREATE INDEX "sales_reconciliations_updateUserId_idx" ON "sales_reconciliations"("updateUserId");

-- CreateIndex
CREATE INDEX "screens_createUserId_idx" ON "screens"("createUserId");

-- CreateIndex
CREATE INDEX "screens_updateUserId_idx" ON "screens"("updateUserId");

-- CreateIndex
CREATE INDEX "shifts_createUserId_idx" ON "shifts"("createUserId");

-- CreateIndex
CREATE INDEX "shifts_updateUserId_idx" ON "shifts"("updateUserId");

-- CreateIndex
CREATE INDEX "user_branch_access_createUserId_idx" ON "user_branch_access"("createUserId");

-- CreateIndex
CREATE INDEX "user_branch_access_updateUserId_idx" ON "user_branch_access"("updateUserId");

-- CreateIndex
CREATE INDEX "user_company_access_createUserId_idx" ON "user_company_access"("createUserId");

-- CreateIndex
CREATE INDEX "user_company_access_updateUserId_idx" ON "user_company_access"("updateUserId");

-- CreateIndex
CREATE INDEX "user_department_access_createUserId_idx" ON "user_department_access"("createUserId");

-- CreateIndex
CREATE INDEX "user_department_access_updateUserId_idx" ON "user_department_access"("updateUserId");

-- CreateIndex
CREATE INDEX "user_group_screen_defaults_createUserId_idx" ON "user_group_screen_defaults"("createUserId");

-- CreateIndex
CREATE INDEX "user_group_screen_defaults_updateUserId_idx" ON "user_group_screen_defaults"("updateUserId");

-- CreateIndex
CREATE INDEX "user_groups_createUserId_idx" ON "user_groups"("createUserId");

-- CreateIndex
CREATE INDEX "user_groups_updateUserId_idx" ON "user_groups"("updateUserId");

-- CreateIndex
CREATE INDEX "user_menu_authorizations_createUserId_idx" ON "user_menu_authorizations"("createUserId");

-- CreateIndex
CREATE INDEX "user_menu_authorizations_updateUserId_idx" ON "user_menu_authorizations"("updateUserId");

-- CreateIndex
CREATE INDEX "user_outlet_access_createUserId_idx" ON "user_outlet_access"("createUserId");

-- CreateIndex
CREATE INDEX "user_outlet_access_updateUserId_idx" ON "user_outlet_access"("updateUserId");

-- CreateIndex
CREATE INDEX "user_screen_authorizations_createUserId_idx" ON "user_screen_authorizations"("createUserId");

-- CreateIndex
CREATE INDEX "user_screen_authorizations_updateUserId_idx" ON "user_screen_authorizations"("updateUserId");

-- CreateIndex
CREATE INDEX "users_createUserId_idx" ON "users"("createUserId");

-- CreateIndex
CREATE INDEX "users_updateUserId_idx" ON "users"("updateUserId");

-- CreateIndex
CREATE INDEX "variance_incidents_createUserId_idx" ON "variance_incidents"("createUserId");

-- CreateIndex
CREATE INDEX "variance_incidents_updateUserId_idx" ON "variance_incidents"("updateUserId");

-- CreateIndex
CREATE INDEX "vendors_createUserId_idx" ON "vendors"("createUserId");

-- CreateIndex
CREATE INDEX "vendors_updateUserId_idx" ON "vendors"("updateUserId");

-- AddForeignKey
ALTER TABLE "ChangeLogs" ADD CONSTRAINT "ChangeLogs_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- DOCUMENTED MIGRATION FALLBACK: SYSTEM AUTOMATED / MIGRATION ACTOR
-- Existing historical rows with unknown original creator/updater are backfilled
-- to a non-loginable System Actor (username = 'system', isActive = false)
-- rather than inventing historical human authorship.
-- ============================================================================
INSERT INTO "users" ("username", "fullName", "email", "passwordHash", "empNo", "designation", "roleId", "isActive", "isConfirmEmail", "createdAt", "updatedAt")
SELECT 'system', 'System Automated Process', 'system@brewfeast.mv', '$2b$12$SYSTEM_ACCOUNT_LOGIN_DISABLED_00000000000000000000000', 'SYS-000', 'System Automation', (SELECT "id" FROM "roles" ORDER BY "id" ASC LIMIT 1), false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "username" = 'system')
  AND EXISTS (SELECT 1 FROM "roles");

-- Backfill existing records with the documented System Actor ID where audit user IDs are NULL
UPDATE "companies" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "branches" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "outlets" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "departments" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "locations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "employees" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "shifts" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "currencies" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "exchange_rates" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "denominations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "banks" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "bank_accounts" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "float_accounts" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "gl_accounts" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "vendors" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "expense_categories" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "expense_types" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "budgets" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_advance_types" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "payment_types" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "payment_sub_types" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "payment_terminals" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_workflows" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "form_masters" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "roles" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "role_permissions" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_groups" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "screens" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_group_screen_defaults" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "menu_nodes" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "users" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_company_access" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_branch_access" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_outlet_access" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_department_access" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_screen_authorizations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "user_menu_authorizations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "number_series" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "business_configs" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "notification_templates" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "notification_logs" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "print_templates" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "document_attachments" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "audit_export_batches" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_deposits" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_deposit_currencies" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_deposit_denominations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cashier_payments" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cashier_settlements" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cashier_settlement_lines" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_collection_receipts" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "cash_collection_receipt_lines" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "main_cashier_payments" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "main_cashier_settlements" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "main_cashier_settlement_lines" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "outlet_bank_deposits" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "outlet_bank_deposit_items" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "bank_reconciliations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_requests" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_advances" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_bill_submissions" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_bill_lines" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_bill_adjustments" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_returns" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "float_reimbursements" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "float_reimbursement_vouchers" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "petty_cash_ious" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "sales_reconciliations" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "sales_reconciliation_lines" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "variance_incidents" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_stages" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_stage_approvers" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_templates" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_template_stages" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_template_originators" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_template_terms" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_instances" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;
UPDATE "approval_decisions" SET "createUserId" = COALESCE("createUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)), "updateUserId" = COALESCE("updateUserId", (SELECT "id" FROM "users" WHERE "username" = 'system' LIMIT 1)) WHERE "createUserId" IS NULL OR "updateUserId" IS NULL;

-- Foreign keys linking createUserId and updateUserId to users(id) with ON DELETE SET NULL
ALTER TABLE "companies" ADD CONSTRAINT "companies_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "locations" ADD CONSTRAINT "locations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "denominations" ADD CONSTRAINT "denominations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "denominations" ADD CONSTRAINT "denominations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "banks" ADD CONSTRAINT "banks_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "banks" ADD CONSTRAINT "banks_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_accounts" ADD CONSTRAINT "float_accounts_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gl_accounts" ADD CONSTRAINT "gl_accounts_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expense_types" ADD CONSTRAINT "expense_types_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expense_types" ADD CONSTRAINT "expense_types_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_advance_types" ADD CONSTRAINT "cash_advance_types_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_advance_types" ADD CONSTRAINT "cash_advance_types_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_sub_types" ADD CONSTRAINT "payment_sub_types_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_sub_types" ADD CONSTRAINT "payment_sub_types_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_terminals" ADD CONSTRAINT "payment_terminals_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_terminals" ADD CONSTRAINT "payment_terminals_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "form_masters" ADD CONSTRAINT "form_masters_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "form_masters" ADD CONSTRAINT "form_masters_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "screens" ADD CONSTRAINT "screens_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "screens" ADD CONSTRAINT "screens_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_group_screen_defaults" ADD CONSTRAINT "user_group_screen_defaults_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_group_screen_defaults" ADD CONSTRAINT "user_group_screen_defaults_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "menu_nodes" ADD CONSTRAINT "menu_nodes_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "menu_nodes" ADD CONSTRAINT "menu_nodes_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_outlet_access" ADD CONSTRAINT "user_outlet_access_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_outlet_access" ADD CONSTRAINT "user_outlet_access_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_department_access" ADD CONSTRAINT "user_department_access_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_department_access" ADD CONSTRAINT "user_department_access_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_screen_authorizations" ADD CONSTRAINT "user_screen_authorizations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_screen_authorizations" ADD CONSTRAINT "user_screen_authorizations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_menu_authorizations" ADD CONSTRAINT "user_menu_authorizations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_menu_authorizations" ADD CONSTRAINT "user_menu_authorizations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "number_series" ADD CONSTRAINT "number_series_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "business_configs" ADD CONSTRAINT "business_configs_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_export_batches" ADD CONSTRAINT "audit_export_batches_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_export_batches" ADD CONSTRAINT "audit_export_batches_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposit_currencies" ADD CONSTRAINT "cash_deposit_currencies_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposit_currencies" ADD CONSTRAINT "cash_deposit_currencies_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposit_denominations" ADD CONSTRAINT "cash_deposit_denominations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_deposit_denominations" ADD CONSTRAINT "cash_deposit_denominations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_payments" ADD CONSTRAINT "cashier_payments_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_settlements" ADD CONSTRAINT "cashier_settlements_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_settlement_lines" ADD CONSTRAINT "cashier_settlement_lines_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_settlement_lines" ADD CONSTRAINT "cashier_settlement_lines_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_collection_receipts" ADD CONSTRAINT "cash_collection_receipts_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_collection_receipt_lines" ADD CONSTRAINT "cash_collection_receipt_lines_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_collection_receipt_lines" ADD CONSTRAINT "cash_collection_receipt_lines_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_payments" ADD CONSTRAINT "main_cashier_payments_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_settlements" ADD CONSTRAINT "main_cashier_settlements_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_settlement_lines" ADD CONSTRAINT "main_cashier_settlement_lines_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "main_cashier_settlement_lines" ADD CONSTRAINT "main_cashier_settlement_lines_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlet_bank_deposits" ADD CONSTRAINT "outlet_bank_deposits_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlet_bank_deposit_items" ADD CONSTRAINT "outlet_bank_deposit_items_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlet_bank_deposit_items" ADD CONSTRAINT "outlet_bank_deposit_items_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_advances" ADD CONSTRAINT "petty_cash_advances_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_submissions" ADD CONSTRAINT "petty_cash_bill_submissions_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_lines" ADD CONSTRAINT "petty_cash_bill_lines_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_adjustments" ADD CONSTRAINT "petty_cash_bill_adjustments_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_bill_adjustments" ADD CONSTRAINT "petty_cash_bill_adjustments_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_returns" ADD CONSTRAINT "petty_cash_returns_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_reimbursements" ADD CONSTRAINT "float_reimbursements_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_reimbursement_vouchers" ADD CONSTRAINT "float_reimbursement_vouchers_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "float_reimbursement_vouchers" ADD CONSTRAINT "float_reimbursement_vouchers_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_ious" ADD CONSTRAINT "petty_cash_ious_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petty_cash_ious" ADD CONSTRAINT "petty_cash_ious_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_reconciliations" ADD CONSTRAINT "sales_reconciliations_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_reconciliation_lines" ADD CONSTRAINT "sales_reconciliation_lines_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "variance_incidents" ADD CONSTRAINT "variance_incidents_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_stages" ADD CONSTRAINT "approval_stages_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_stages" ADD CONSTRAINT "approval_stages_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_stage_approvers" ADD CONSTRAINT "approval_stage_approvers_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_stage_approvers" ADD CONSTRAINT "approval_stage_approvers_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_templates" ADD CONSTRAINT "approval_templates_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_templates" ADD CONSTRAINT "approval_templates_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_stages" ADD CONSTRAINT "approval_template_stages_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_stages" ADD CONSTRAINT "approval_template_stages_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_originators" ADD CONSTRAINT "approval_template_originators_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_originators" ADD CONSTRAINT "approval_template_originators_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_terms" ADD CONSTRAINT "approval_template_terms_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_template_terms" ADD CONSTRAINT "approval_template_terms_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_instances" ADD CONSTRAINT "approval_instances_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_createUserId_fkey" FOREIGN KEY ("createUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_updateUserId_fkey" FOREIGN KEY ("updateUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
