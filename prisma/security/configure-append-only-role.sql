-- ============================================================================
-- BNF Connect CMS — Append-Only PostgreSQL Role Security (Section 13.4)
--
-- Run as the schema owner / migration role (e.g. `neondb_owner`) over the
-- direct (unpooled) Neon connection string.
--
-- Separation of duties:
--   * Migration / DDL role (`neondb_owner`): owns schema, runs Prisma Migrate.
--   * Runtime application role (`cms_app_user`): minimum required DML rights,
--     strictly INSERT + SELECT only on "ChangeLogs" and "audit_logs"
--     (UPDATE, DELETE, TRUNCATE, and DDL are explicitly revoked/denied).
--
-- NOTE: Replace <STRONG_PASSWORD> before manual execution, or run via
-- `scripts/configure-append-only-role` using a generated password.
-- ============================================================================

-- 1. Create dedicated least-privilege application login role (non-superuser, no DDL)
-- CREATE ROLE cms_app_user LOGIN PASSWORD '<STRONG_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- 2. Allow database connection & schema usage only (prevent schema CREATE/DDL)
GRANT CONNECT ON DATABASE "CMS" TO cms_app_user;
REVOKE CREATE ON SCHEMA public FROM cms_app_user;
GRANT USAGE ON SCHEMA public TO cms_app_user;

-- 3. Grant operational DML on master & transaction tables + sequences
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cms_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cms_app_user;

-- 4. Strictly enforce APPEND-ONLY access on ChangeLogs and audit_logs
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "ChangeLogs" FROM cms_app_user;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "audit_logs" FROM cms_app_user;
GRANT INSERT, SELECT ON TABLE "ChangeLogs" TO cms_app_user;
GRANT INSERT, SELECT ON TABLE "audit_logs" TO cms_app_user;

-- 5. Default privileges for future tables created by neondb_owner
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cms_app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cms_app_user;
