# Architecture — FreightGuard AI

This document explains how the 65% build is put together and where new work belongs. It is written for a teammate who has just cloned the repository.

For the product roadmap, see [PROJECT_PLAN.md](PROJECT_PLAN.md). For endpoint details, see [API.md](API.md). For day-to-day rules, see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## 1. Scope and principles

The current build is deliberately a thin but complete vertical slice: **Next.js frontend → Express API → MongoDB**, with authentication, RBAC, validation and error handling on every path.

Design principles applied during the cleanup:

1. **One source of truth for business numbers.** Fee (`25`) and review threshold (`0.7`) live in shared constants on both sides.
2. **No silent fallbacks.** API failures surface as errors in the UI; there is no mock-data fallback. The opt-in preview mode described in [section 2](#api-mode-and-preview-mode) is disabled in production.
3. **Company-scoped data by default.** Every user-owned query filters on `req.user.company`.
4. **Explicit middleware pipeline.** Auth → RBAC → validation → async handler → centralised error handler.
5. **Importable app.** `server/src/createApp.js` exports a factory; only `localServer.js` connects to MongoDB and listens.

---

## 2. System overview

```text
Browser
  │
  ├── Next.js 16 App Router (client/)
  │     ├── app/          routes + pages
  │     ├── components/   Layout, Protected, DataTable, KpiCard, StatusPill
  │     ├── context/      AuthProvider (JWT in localStorage, current user)
  │     ├── hooks/        useApiData (loading/error/reload)
  │     └── lib/          api.js → HTTP (production), letterExport.js, formatters
  │                       previewData.js → sample data (opt-in dev aid only)
  │
  ▼ HTTP / JSON + Authorization: Bearer <JWT>
Express 4 API (server/src/createApp.js)
  │
  ├── helmet + cors + express.json + morgan(dev)
  ├── /api/health
  ├── /api/auth    /api/contracts   /api/invoices
  ├── /api/disputes              /api/recoveries
  ├── /api/dashboard             /api/admin
  ├── notFound → errorHandler
  │
  ▼ Mongoose
MongoDB
  users · companies · contracts · invoices · invoice_lines
  disputes · recoveries · audit_jobs
```

### API mode and preview mode

| Mode                          | `NEXT_PUBLIC_PREVIEW_MODE` | `NEXT_PUBLIC_API_URL`                     | Data source                                           | Backend / MongoDB |
| ----------------------------- | -------------------------- | ----------------------------------------- | ----------------------------------------------------- | ----------------- |
| Real mode (production)        | `false` or unset           | `https://freightguard-api.vercel.app/api` | HTTP calls to the Express API via `client/lib/api.js` | required          |
| Opt-in preview mode (dev aid) | `true`                     | not used                                  | sample data from `client/lib/previewData.js`          | not needed        |

Real mode requires both `NEXT_PUBLIC_PREVIEW_MODE=false` (or unset) and `NEXT_PUBLIC_API_URL`; without the URL the app shows a configuration error. Invalid/expired tokens are rejected by `GET /api/auth/me` and cleared from `localStorage`; failed calls surface to the UI. `api.getMe()` clears the session on a stale token rather than masking the failure. There is no silent fallback.

Preview mode is an explicit opt-in used only while developing UI without a backend. The production deployment has it disabled; it is not part of the live product.

---

## 3. Frontend architecture

### 3.1 Routes

`client/app/` uses the Next.js App Router. Files are co-located with routes:

| Route                                | File                                              | Access           |
| ------------------------------------ | ------------------------------------------------- | ---------------- |
| `/`                                  | `app/page.jsx`                                    | public landing   |
| `/login`, `/register`                | `app/login/page.jsx`, `app/register/page.jsx`     | public           |
| `/dashboard`                         | `app/dashboard/page.jsx`                          | signed-in user   |
| `/invoices`, `/contracts`            | `app/invoices/page.jsx`, `app/contracts/page.jsx` | signed-in user   |
| `/disputes`                          | `app/disputes/page.jsx`                           | signed-in user   |
| `/recoveries`                        | `app/recoveries/page.jsx`                         | signed-in user   |
| `/admin`                             | `app/admin/page.jsx`                              | operator + admin |
| `/admin/review`                      | `app/admin/review/page.jsx`                       | operator + admin |
| `/admin/users`                       | `app/admin/users/page.jsx`                        | admin only       |
| `/admin/invoices`, `/admin/disputes` | `app/admin/*/page.jsx`                            | operator + admin |
| `/admin/settings`                    | `app/admin/settings/page.jsx`                     | admin only       |

Interactive pages start with `'use client';`. `client/app/layout.jsx` wraps the app in `AuthProvider` and imports global CSS.

### 3.2 Application shell and navigation

`client/components/Layout.jsx` owns:

- the fixed sidebar and off-canvas mobile drawer (below 900px);
- `<Link>`-based navigation, so keyboard and client-side routing work;
- role-aware sections: workspace links for everyone, admin links for `STAFF_ROLES`, with `adminOnly` links hidden from operators;
- the topbar, user chip and sign-out button;
- `aria-current="page"`, `aria-label` and `aria-expanded` for accessibility.

### 3.3 Authentication state

`client/context/AuthContext.jsx` exposes:

```js
const { user, loading, login, register, logout, isStaff } = useAuth();
```

On mount it reads `fg_token` from `localStorage`, calls `api.getMe()`, sets `user`, and clears the token on failure. `loading` stays true until restoration finishes so `<Protected>` does not redirect a valid user on first paint.

`<Protected roles={[...]}>` checks `user`/`loading` and redirects to `/login` or an unauthorised state. Import roles from `client/lib/constants.js`.

### 3.4 Data fetching

`client/hooks/useApiData.js` is the standard pattern:

```js
const { data, loading, error, reload, setData } = useApiData(api.getDashboard);
```

- `reload()` is called after mutations (create invoice, review line, change role).
- `deps` control refetches; the fetcher is stored in a ref so inline arrow functions do not loop.
- Errors render as an `.alert error` banner with a **Retry** button.

### 3.5 API client

`client/lib/api.js` is the **only** place that knows about HTTP details:

- builds the base URL from `NEXT_PUBLIC_API_URL` (required in real mode; opt-in preview mode bypasses this module);
- attaches `Authorization: Bearer <token>` from `localStorage`;
- parses JSON safely and throws readable errors for non-JSON responses and failed requests;
- stores the JWT on login/register.

Adding a page without adding its method here is a review blocker (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

### 3.6 Constants and formatters

| File                         | Purpose                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `client/lib/constants.js`    | `DEFAULT_FEE_PCT = 25`, `REVIEW_CONFIDENCE_THRESHOLD = 0.7`, `ROLES`, `STAFF_ROLES`, `TOKEN_KEY` |
| `client/lib/format.js`       | `money()`, `confidencePct()`, `initials()`, `formatDate()`                                       |
| `client/lib/letterExport.js` | TXT download and dependency-free PDF export for dispute letters                                  |

Components must not redefine money formatting or hardcode role strings.

---

## 4. Backend architecture

### 4.1 Entry point vs app factory

| File                        | Responsibility                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/createApp.js`   | `createApp()` configures middleware and routes and returns the Express app. No DB connection, no `listen()`. Safe to import from tests. |
| `server/src/localServer.js` | Calls `connectDB()`, then `createApp().listen(config.port)`. Sets `process.exitCode = 1` on failure.                                    |

This split prevents a database connection on every import and keeps startup behaviour in one place.

### 4.2 Configuration

`server/src/config/env.js` is the only module that reads `process.env`:

- defaults `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_EXPIRE`, admin bootstrap values;
- throws at startup if `NODE_ENV=production` and `JWT_SECRET` is still `dev-only-secret-change-me`;
- warns in production when `CLIENT_URL` is missing;
- exposes a frozen `config` object including `clientUrl` and `defaultFeePct`.

`server/src/config/constants.js` holds domain enums (`VERDICT`, `REVIEW_STATUS`, `AUDIT_STATUS`, `DISPUTE_STATUS`, `ROLE`), `ROLES`, `STAFF_ROLES` and the review threshold. `DEFAULT_FEE_PCT` is read from `DEFAULT_FEE_PCT` env with a default of 25.

`server/src/config/database.js` connects with a 5-second selection timeout, logs the host, and **throws** on failure rather than exiting the process.

### 4.3 Middleware pipeline

Order in `createApp()`:

1. `helmet()` — security headers.
2. `cors({ origin: config.clientUrl, credentials: true })` — explicit origin; never `*` with credentials.
3. `express.json({ limit: '10mb' })` and `express.urlencoded({ extended: true })`.
4. `morgan('dev')` — only outside production.
5. `GET /api/health`.
6. Domain routers.
7. `notFound` — JSON 404 for unknown API routes.
8. `errorHandler` — final error mapper.

`server/src/middleware/errorHandler.js` exports:

- `asyncHandler(fn)` — required for every async controller under Express 4;
- `validate` — converts `express-validator` results into `{ field, message }` errors with HTTP 400;
- `notFound` — consistent 404 payload;
- `errorHandler` — maps malformed JSON, `CastError`, duplicate key `11000`, Mongoose `ValidationError`, and generic statuses; logs server-side and hides stack traces from clients.

### 4.4 Routes, controllers, models

- **Routes** (`server/src/routes/`) define paths, validation chains and guard order. Example admin user update: `protect` → `authorize('admin')` → id/body rules → `validate` → `asyncHandler(controller.updateUser)`.
- **Controllers** (`server/src/controllers/`) implement request handling and response envelopes. They do not parse `process.env` or duplicate business constants.
- **Models** (`server/src/models/`) define the eight Mongoose collections and timestamps. All user-owned collections include `company`.
- **Utils** (`server/src/utils/`) contain the audit rules engine, `domain.js` (flag eligibility, fee math, dispute transitions), `letterGenerator.js`, and the `round2()` helper. `server/src/tests/` covers the domain rules with Node's built-in test runner.

### 4.5 Authentication and RBAC

`server/src/middleware/auth.js`:

- `protect` requires `Authorization: Bearer <token>`, verifies the JWT, loads `name email role company isActive` (never the password), rejects inactive/deleted users, and attaches `req.user`.
- `authorize(...roles)` returns HTTP 403 when `req.user.role` is not in the list.
- Expired tokens get a specific `Session expired, please sign in again` message.

Role capabilities:

| Role       | Workspace | Flag decisions | Admin read | Review queue | Fee billing | User management |
| ---------- | --------- | -------------- | ---------- | ------------ | ----------- | --------------- |
| `user`     | ✅        | ✅             | ❌         | ❌           | ❌          | ❌              |
| `operator` | ✅        | ✅             | ✅         | ✅           | ✅          | ❌              |
| `admin`    | ✅        | ✅             | ✅         | ✅           | ✅          | ✅              |

`adminController.updateUser` and `deleteUser` block an admin from demoting, deactivating or deleting their own account.

### 4.6 Company scoping

`req.user.company` is the tenant boundary. `dashboardController` is the reference implementation:

```js
const companyId = req.user.company;
const [invoices, disputes, recoveries] = await Promise.all([
  Invoice.find({ company: companyId }),
  Dispute.find({ company: companyId }),
  Recovery.find({ company: companyId }),
]);
```

The same boundary applies to flag decisions and the recovery loop: `reviewFlag` checks the invoice and line before saving, while `disputeController` and `recoveryController` filter every query by company. Admin "all invoices" / "all disputes" routes are the intentional exception: they are platform-wide and guarded by `STAFF_ROLES`.

### 4.7 Audit rules engine

`server/src/utils/rulesEngine.js` audits one invoice line against its tariff contract:

| Rule | Condition                                            | Verdict                       | Confidence |
| ---- | ---------------------------------------------------- | ----------------------------- | ---------- |
| 1    | `days <= freeDays` (within free allowance)           | `invalid`, correct amount `0` | 0.95       |
| 2    | Billed days exceed chargeable days after free time   | `overcharged`                 | 0.90       |
| 3    | Applied rate differs from the contract tier rate     | `overcharged` or `invalid`    | 0.88       |
| 4    | Duplicate fee type + description on the same invoice | `invalid`, correct amount `0` | 0.93       |
| 5    | No matching contract for carrier/port                | `skipped`                     | 0.50       |
| 6    | Charge matches contract terms                        | `ok`                          | 0.92       |

Every result includes `reason` and `confidence` (0–1). Lines at or below `REVIEW_CONFIDENCE_THRESHOLD` (0.7) are intended for the operator review queue.

`round2()` lives in `server/src/utils/round.js` and uses `Number.EPSILON` to avoid floating-point artefacts.

### 4.8 Recovery loop rules

`server/src/utils/domain.js` owns the business rules promoted in unit 11–14:

- `isFlagged(line)` excludes `ok` and `skipped` lines from disputes.
- `isAcceptedFlag(line)` requires `reviewStatus: 'confirmed'` (customer or operator acceptance).
- `DISPUTE_TRANSITIONS` is the only allowed status path: `draft → sent → under_review → won/lost`. `won` is reached by recording a recovery, which also creates the fee record.
- `calculateFee(amount, feePct)` returns `round2(amount * feePct / 100)`. `feePct = 25` means 25%, not a 25× multiplier.

`server/src/utils/letterGenerator.js` renders the plain-text letter from accepted flags only; the browser exports that same text as TXT or PDF via `client/lib/letterExport.js`.

---

## 5. Example request lifecycle

**Operator confirms a flagged line:**

1. `ReviewQueue` page calls `api.reviewLine(id, { reviewStatus: 'confirmed', reviewNote })`.
2. `api.js` sends `PUT /api/admin/review/:id` with the JWT header.
3. `adminRoutes` runs `protect` → `authorize('operator', 'admin')` → id/body validation → `validate` → `asyncHandler(reviewLine)`.
4. `reviewLine` loads the `InvoiceLine`, sets `reviewStatus`, `reviewedBy`, `reviewedAt`, optional note/correctAmount/verdict, saves, and returns `{ success: true, data: line }`.
5. The page calls `reload()` from `useApiData`, which refetches `/api/admin/review-queue`.

**Customer accepts a flag, then recovers money:**

1. `Invoices` page calls `api.reviewFlag(invoiceId, lineId, { decision: 'accept' })`.
2. `disputes` page calls `api.generateDisputeLetter({ invoiceId })`; the controller selects confirmed flags, persists the letter to a draft dispute, and returns `letterText` for TXT/PDF export.
3. Status changes go through `api.updateDisputeStatus(id, { status })` and are rejected if they skip a state or try to mark `won` without cash.
4. `api.recordRecovery(id, { amount, recoveredAt })` creates a company-scoped `Recovery`, calculates the fee with `calculateFee()`, and sets the dispute to `won`.
5. Staff can call `api.updateRecoveryBilling(id, { billingStatus: 'paid' })`; the dashboard fee-due KPI excludes paid fees.

**Dashboard KPI:**

`api.getDashboard()` → `GET /api/dashboard` → `protect` → company-scoped queries in `dashboardController` → `kpis.totalBilled` (rounded) and `invoices[]` → `KpiCard` + `DataTable`.

---

## 6. Data model summary

| Collection      | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `users`         | Auth, role, company reference, active flag                           |
| `companies`     | Tenant, plan, optional fee override                                  |
| `contracts`     | Carrier + port + free days + day rule + tiers                        |
| `invoices`      | Company-owned invoice header with billed total and audit status      |
| `invoice_lines` | Charge lines with verdict, correct amount, confidence, review fields |
| `disputes`      | Dispute lifecycle records, letter text and accepted invoice lines    |
| `recoveries`    | Recovered amount, fee percentage, fee amount and billing status      |
| `audit_jobs`    | Job metadata for audit runs                                          |

All models include `createdAt` / `updatedAt`. See [PROJECT_PLAN.md](PROJECT_PLAN.md) section 5 for the authoritative schema list.

---

## 7. Security posture

- Passwords hashed with bcrypt; password field never selected by `protect`.
- JWT secret validated in production; explicit CORS origin; Helmet headers.
- Input validation on all mutating routes and for resource ids/pagination/review enums.
- Centralised errors never leak stack traces.
- Frontend requires `NEXT_PUBLIC_API_URL` in real mode; a missing URL shows a configuration error and API failures surface to the UI. The opt-in preview mode is disabled in production.
- Admin self-lockout guards.
- No `dangerouslySetInnerHTML` and no untrusted HTML rendering in the 65% build. Dispute letters are plain text; PDF bytes are generated locally in the browser.

---

## 8. Where unfinished units plug in

| Future unit                 | Natural location                                           |
| --------------------------- | ---------------------------------------------------------- |
| Kimi OCR extraction         | `server/src/services/ocr/` + invoice upload route          |
| Charts / CSV export         | `client/components/` + admin routes                        |
| Email notifications         | New Express service + dispute/invoice event hooks          |
| Payment collection          | New Express service + `Recovery.billingStatus` integration |
| Google OAuth / email verify | New Express auth providers under `/api/auth`               |
| Real file storage / hashes  | `server/src/services/storage/` + invoice metadata          |
| Final polish                | UI QA, accessibility pass, expanded integration tests      |

The promoted units 11–14 now live in `client/app/`, `server/src/controllers/` and `server/src/utils/`. The stale drafts were removed from `deferred/`; only opt-in preview sample data remains there.

---

## 9. Change log

- Upgraded Next.js from 14.2.35 to **16.4.6** (security) and React from 18.3.1 to **19.3.1**, removing the Next.js deprecation warning without application-code changes.
- Added shared constants/formatters and removed duplicated money/rounding logic.
- Rewrote API client with safe JSON parsing and explicit error handling.
- Fixed live dashboard KPI to return `totalBilled` (matching the table).
- Fixed invoice deletion so line items are only removed after company ownership is confirmed.
- Wrapped all async controllers with `asyncHandler`.
- Replaced `CORS: * + credentials` with an explicit `CLIENT_URL`.
- Split `createApp.js` (factory) from `localServer.js` (entry point).
- Added ESLint 9, Prettier, EditorConfig, CI and this documentation set.
- Promoted units 11–14: flag accept/reject, dispute letters, status tracking, recovery recording and fee billing.
- Added `domain.js` and `letterGenerator.js` on the server, `letterExport.js` on the client, and Node tests for fee math, transitions, flag eligibility and letter content.
- Fixed fee math to `amount * feePct / 100` and excluded paid fees from dashboard `feeDue`.
