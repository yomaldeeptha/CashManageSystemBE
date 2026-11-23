# BNF Connect — Backend API (`CashManageSystemBE`)

NestJS (TypeScript, strict mode) + Prisma ORM + Neon PostgreSQL REST API powering the BNF Connect Enterprise Cash Management System.

## Architecture Highlights

- **Strict Layered Modular NestJS**: 17 domain modules (`auth`, `users`, `roles`, `screens`, `business-config`, `number-series`, `notifications`, `print-formats`, `attachments`, `master-data`, `approvals`, `cash-deposit`, `petty-cash`, `sales-recon`, `dashboard`, `reports`, `audit`).
- **Zero Database Business Logic**: 56 normalized Prisma models and clean SQL migration (`prisma/migrations/20261123000000_init/migration.sql`) with **zero** views, triggers, stored procedures, or UDFs.
- **Exact Financial Precision**: All monetary amounts, FX rates, GST calculations, and variances use `decimal.js` and `Prisma.Decimal`.
- **Dynamic System Base Currency**: Atomic switching via `PATCH /api/v1/business-config` syncs `Currency.isBase` and `Company.baseCurrencyCode`; all FX conversions resolve dynamically via `ExchangeRateResolverService`.
- **Security**: JWT access tokens + SHA-256 hashed rotating refresh tokens, bcrypt (`bcryptjs`, 12 rounds), global `JwtAuthGuard`, `@RequirePermissions`, entity-level scope isolation (`scope.util.ts`), strict **Maker ≠ Checker** enforcement, Helmet, Throttler rate limiting, and `ValidationPipe` (`whitelist: true`, `transform: true`).
- **Serverless Ready**: Vercel entry point in `api/index.ts` + `vercel.json`.

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL (Neon pooled), DIRECT_URL (Neon direct), ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET

npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run start:dev` | Start local NestJS dev server with watch mode (`http://localhost:4000`) |
| `npm run build` | Generate Prisma Client and compile NestJS TypeScript build (`dist/`) |
| `npm run typecheck` | Run strict `tsc --noEmit` check |
| `npm test` | Run Jest unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | Run Supertest HTTP E2E tests (`test/app.e2e-spec.ts`) |
| `npx prisma migrate deploy` | Apply SQL migrations against Neon `DIRECT_URL` |
| `npx prisma db seed` | Run idempotent database seed (`prisma/seed.ts`) |

## Key Endpoints

- Health Check: `GET /api/v1/health`
- OpenAPI / Swagger UI: `GET /api/docs`
- Authentication: `POST /api/v1/auth/login`, `/refresh`, `/logout`, `GET /me`, `POST /verify-password`, `/change-password`
- Dashboard: `GET /api/v1/dashboard/summary`
- Process 01 (Cash Deposit): `/api/v1/cash-deposits`, `/api/v1/cash-deposit/{payments,settlements,receipts,main-payments,main-settlements,bank-deposits,bank-reconciliations}`
- Process 02 (Petty Cash): `/api/v1/petty-cash/{requests,advances,bill-submissions,returns,reimbursements,iou-aging}`
- Process 03 (Sales Recon): `/api/v1/sales-recon` (+ `/import`, `/process01-envelopes`, `/auto-reconcile-all`, `/:id/lock`, `/:id/unblock`, `/:id/final-report`)
- Approvals: `/api/v1/approvals/{queue,:id/decide,stages,templates}`
- Reports: `/api/v1/reports/{hub,cash-banking,sales-tender,petty-iou,variance-audit,currency-valuation,audit-governance}`
- Master Data (25 catalogs): `/api/v1/master-data/bundle`, `/api/v1/master-data/:catalogKey`
- Administration: `/api/v1/business-config`, `/api/v1/users`, `/api/v1/roles`, `/api/v1/screens`, `/api/v1/number-series`, `/api/v1/notifications`, `/api/v1/print-formats`, `/api/v1/attachments`, `/api/v1/audit`

See `../docs/API_DOCUMENTATION.md` and `../docs/DEPLOYMENT_GUIDE.md` for full details.
