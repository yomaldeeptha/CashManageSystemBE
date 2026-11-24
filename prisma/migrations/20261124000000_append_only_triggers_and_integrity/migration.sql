-- =============================================================================
-- Migration: Append-Only Audit Immutability Triggers & Financial Data Constraints
-- =============================================================================
-- Enforces strict database-level append-only immutability on "ChangeLogs" and
-- "audit_logs" so even raw SQL UPDATE/DELETE statements are rejected by PostgreSQL.
-- Also adds missing uniqueness & non-negative balance integrity constraints.

-- 1. Append-only trigger function for immutable audit tables
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table "%" is strictly append-only: % operations are prohibited.', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

-- 2. Attach triggers to "ChangeLogs"
DROP TRIGGER IF EXISTS trg_changelogs_prevent_update ON "ChangeLogs";
CREATE TRIGGER trg_changelogs_prevent_update
  BEFORE UPDATE ON "ChangeLogs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_changelogs_prevent_delete ON "ChangeLogs";
CREATE TRIGGER trg_changelogs_prevent_delete
  BEFORE DELETE ON "ChangeLogs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

-- 3. Attach triggers to "audit_logs"
DROP TRIGGER IF EXISTS trg_audit_logs_prevent_update ON "audit_logs";
CREATE TRIGGER trg_audit_logs_prevent_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_delete ON "audit_logs";
CREATE TRIGGER trg_audit_logs_prevent_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

-- 4. Prevent negative balances on float accounts & department budgets
ALTER TABLE "float_accounts"
  DROP CONSTRAINT IF EXISTS "float_accounts_currentBalance_non_negative";
ALTER TABLE "float_accounts"
  ADD CONSTRAINT "float_accounts_currentBalance_non_negative"
  CHECK ("currentBalance" >= 0);

ALTER TABLE "budgets"
  DROP CONSTRAINT IF EXISTS "budgets_availableAmount_non_negative";
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_availableAmount_non_negative"
  CHECK ("availableAmount" >= 0);

-- 5. Prevent duplicate active ApprovalInstance rows for the same document
CREATE UNIQUE INDEX IF NOT EXISTS "approval_instances_one_open_per_entity_idx"
  ON "approval_instances" ("entityType", "entityId")
  WHERE "status" IN ('Pending', 'In Review');

-- 6. Prevent attaching the same verified bill submission to multiple reimbursement claims
CREATE UNIQUE INDEX IF NOT EXISTS "float_reimbursement_vouchers_billSubmissionId_unique_idx"
  ON "float_reimbursement_vouchers" ("billSubmissionId")
  WHERE "billSubmissionId" IS NOT NULL;
