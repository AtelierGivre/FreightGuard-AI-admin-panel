# FreightGuard AI — Project Plan

**Full vision: 100%. Current build: 45% (9 of 20 units).**
Last updated: 2026-11-22

---

## 1. Vision

A web platform that audits container demurrage & detention invoices against a customer's tariff contract, flags wrongful charges, produces dispute letters, and tracks recovered money. The business charges a 25% contingency fee on money actually recovered — no recovery, no fee.

The product also includes an internal **admin panel** for operators to review low-confidence AI flags before any dispute letter goes out, plus platform-wide oversight and user management.

---

## 2. Technology stack (mandated by team)

| Layer           | Choice                                                    | Status in current build |
| --------------- | --------------------------------------------------------- | ----------------------- |
| Frontend        | **Next.js 16.4.6** (App Router, React 19.3.1)             | ✅ Used                 |
| Backend         | **Node.js + Express.js** REST API                         | ✅ Used                 |
| Database        | **MongoDB** via Mongoose                                  | ✅ Used                 |
| Auth            | JWT + bcrypt, role-based access control                   | ✅ Used                 |
| Validation      | express-validator + Mongoose validators                   | ✅ Used                 |
| Error handling  | Centralised error middleware + async handler              | ✅ Used                 |
| Security        | Helmet, CORS, password hashing, role guards               | ✅ Used                 |
| Version control | Git / GitHub (`AtelierGivre/FreightGuard-AI-admin-panel`) | ✅ Initialised + pushed |

Structure: `client/` (Next.js) and `server/` (Express) as npm workspaces, with shared scripts at the root.

---

## 3. Full scope — 100% (20 units × 5% each)

| #   | Unit                                                                      | Layer  | Status          |
| --- | ------------------------------------------------------------------------- | ------ | --------------- |
| 1   | Project foundation: workspaces, config, env, scripts, security middleware | All    | ✅ **In scope** |
| 2   | Database schema: all 8 collections, relations, indexes                    | Server | ✅ **In scope** |
| 3   | Authentication: signup, login, JWT, session restore                       | Both   | ✅ **In scope** |
| 4   | Authorization + validation + error handling (user / operator / admin)     | Both   | ✅ **In scope** |
| 5   | Contracts module: CRUD, tiers, calendar vs working-day rules              | Both   | ✅ **In scope** |
| 6   | Invoice management: manual entry, file metadata, list, detail, list view  | Both   | ✅ **In scope** |
| 7   | Basic audit rules engine: free time, day count, rate, duplicate checks    | Server | ✅ **In scope** |
| 8   | Dashboard: KPI cards and traceable data tables                            | Both   | ✅ **In scope** |
| 9   | Admin panel: platform stats, review queue, user management, settings      | Both   | ✅ **In scope** |
| 10  | Real AI OCR: Kimi vision → structured JSON extraction                     | Server | ⏳ Deferred     |
| 11  | User-side flag accept / reject workflow                                   | Both   | ⏳ Deferred     |
| 12  | Dispute letter generation + text/PDF export                               | Both   | ⏳ Deferred     |
| 13  | Dispute status tracking (Draft → Sent → Under review → Won/Lost)          | Both   | ⏳ Deferred     |
| 14  | Recovery recording + automated 25% fee billing                            | Both   | ⏳ Deferred     |
| 15  | Charts, weekly analytics and CSV export                                   | Both   | ⏳ Deferred     |
| 16  | Email notifications (audit done, status change, weekly summary)           | Server | ⏳ Deferred     |
| 17  | Payment gateway integration for collecting the fee                        | Server | ⏳ Deferred     |
| 18  | Google OAuth + email verification                                         | Both   | ⏳ Deferred     |
| 19  | Real file storage (S3-compatible bucket) + hash de-duplication            | Server | ⏳ Deferred     |
| 20  | Final polish, automated tests, docs, CI/CD and deployment                 | All    | 🟡 Partial      |

**In scope = units 1–9 = 9 × 5% = 45%.**
**Deferred = units 10–20 = 11 × 5% = 55%.**

> Unit 20 is marked **partial** because teammate documentation, lint/format configuration and a CI workflow were added during the cleanup pass. Automated tests and deployment remain deferred, so the product scope is still 45%.

---

## 4. What the 45% build delivers

A working, end-to-end slice that still uses all three mandated technologies:

- **Next.js frontend** with landing, login, registration, dashboard, invoices, contracts and the full admin panel (6 screens).
- **Express REST API** with health check, auth, contracts, invoices, dashboard and admin routes.
- **MongoDB** with all 8 collections and the indexes the PRD requires.
- **Role-based access**: `user` → workspace; `operator` → workspace + review queue + oversight; `admin` → everything including user management.
- **Live API client**: every `api.*` call goes over HTTP to `NEXT_PUBLIC_API_URL`; a missing URL shows a configuration error instead of data.
- **Audit rules engine**: basic verdicts (ok / overcharged / invalid / skipped) with reasons and confidence scores.
- **Teammate-ready tooling**: shared constants/formatters, ESLint 9 + Prettier + EditorConfig, GitHub Actions CI, PR template, and detailed docs (`ARCHITECTURE.md`, `API.md`, `DEVELOPMENT.md`, `GLOSSARY.md`, `CONTRIBUTING.md`).

### Deliberately not in the 45% build

Dispute letter generation, dispute status workflow, recovery/fee billing screens, charts, notifications, payments, OAuth, real OCR, real file storage, exports, automated tests and deployment. Their files, where already drafted, are preserved under `deferred/` for a later phase.

---

## 5. Data model (100% — all collections created in the 45% build)

`users` · `companies` · `contracts` · `invoices` · `invoice_lines` · `disputes` · `recoveries` · `audit_jobs`

Every user-owned table is scoped by `company`, and every model has `createdAt` / `updatedAt`.

---

## 6. API surface

### Implemented (45%)

```
GET  /api/health
POST /api/auth/register      POST /api/auth/login       GET /api/auth/me
GET  /api/contracts          POST /api/contracts        GET/PUT/DELETE /api/contracts/:id
GET  /api/invoices           POST /api/invoices         GET/PUT/DELETE /api/invoices/:id
POST /api/invoices/:id/audit
GET  /api/dashboard

GET  /api/admin/stats        GET  /api/admin/review-queue
PUT  /api/admin/review/:id   GET  /api/admin/users
PUT  /api/admin/users/:id    DELETE /api/admin/users/:id
GET  /api/admin/invoices     GET  /api/admin/disputes   GET /api/admin/settings
```

### Deferred (55%)

Dispute letter/recovery endpoints, file upload, export, notification and payment endpoints.

---

## 7. Roadmap to 100%

| Phase             | Units     | Theme                                                                            |
| ----------------- | --------- | -------------------------------------------------------------------------------- |
| **A — now (45%)** | 1–9       | Foundation, data, auth, contracts, invoices, basic audit, dashboard, admin panel |
| B (next 25%)      | 10–13, 15 | Real OCR, flag workflow, dispute letters, recovery tracking, charts              |
| C (final 30%)     | 14, 16–20 | Payments, notifications, OAuth, storage, exports, tests, deployment              |

---

## 8. Commands

```bash
npm install
cp .env.example .env          # set MONGO_URI, JWT_SECRET, CLIENT_URL, NEXT_PUBLIC_API_URL as needed
npm run seed                  # creates admin, operator, starter company
npm run dev                   # Express on :5000, Next.js on :3000

# Quality gate (same commands as CI)
npm run check                 # lint + format:check + build
npm audit --audit-level=high
```

Seed accounts after seeding:

- Admin: `admin@freightguard.ai` / `Admin@12345`
- Operator: `operator@freightguard.ai` / `Operator@12345`
- User: `priya@harborline.com` / `Demo@12345`

The frontend requires `NEXT_PUBLIC_API_URL`; without it the app shows a configuration error instead of data.

---

## 9. Teammate documentation

- [Architecture](ARCHITECTURE.md) — system design, middleware order, data flow and extension points.
- [API reference](API.md) — endpoints, auth, validation and response shapes.
- [Development guide](DEVELOPMENT.md) — setup, scripts, troubleshooting and CI.
- [Glossary](GLOSSARY.md) — domain and technical vocabulary.
- [Contributing](../CONTRIBUTING.md) — branching, commits, PR checklist and coding standards.
