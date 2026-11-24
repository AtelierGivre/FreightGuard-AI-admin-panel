# FreightGuard AI

Container demurrage & detention invoice auditing and recovery platform.

**Current build: 65% of the full vision.** See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the complete 100% roadmap and exactly which units are in scope.

Repository: <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel>

---

## Live app

Share these links with stakeholders:

| What           | Link                                                          |
| -------------- | ------------------------------------------------------------- |
| App            | <https://freightguard-ai-admin-panel.vercel.app>              |
| Sign in        | <https://freightguard-ai-admin-panel.vercel.app/login>        |
| Dashboard      | <https://freightguard-ai-admin-panel.vercel.app/dashboard>    |
| Disputes       | <https://freightguard-ai-admin-panel.vercel.app/disputes>     |
| Recoveries     | <https://freightguard-ai-admin-panel.vercel.app/recoveries>   |
| Admin overview | <https://freightguard-ai-admin-panel.vercel.app/admin>        |
| API health     | <https://freightguard-api.vercel.app/api/health>              |
| Business deck  | <https://freightguard-deck.vercel.app>                        |
| Deck PDF       | <https://freightguard-deck.vercel.app/freightguard-deck.pdf>  |
| Source code    | <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel> |

### Live data

The production deployment is connected to the Express API and MongoDB Atlas. The frontend runs with `NEXT_PUBLIC_PREVIEW_MODE=false` and `NEXT_PUBLIC_API_URL=https://freightguard-api.vercel.app/api`; sign-in uses real JWT authentication and every screen reads live records. There is no silent fallback to sample data — API failures surface as errors.

The preview code path in `client/lib/previewData.js` remains only as an explicitly opt-in development aid (`NEXT_PUBLIC_PREVIEW_MODE=true`) and is disabled in production.

---

## Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| Frontend       | **Next.js 16.4.6** (App Router), **React 19.3.1**                       |
| Backend        | Node.js + **Express.js** REST API                                       |
| Database       | **MongoDB** via Mongoose                                                |
| Auth           | JWT + bcrypt, role-based access control (`user` / `operator` / `admin`) |
| Validation     | `express-validator` chains + Mongoose schema validators                 |
| Error handling | Centralised error middleware + `asyncHandler`                           |
| Quality        | ESLint 9 (flat config), Prettier, EditorConfig, Node tests, CI          |

> React 19 replaced React 18 to remove Next.js 16's deprecation warning. The upgrade required no application-code changes; lint, formatting, tests, and the production build all pass.

---

## Structure

```text
freightguard-ai/
├── client/                     Next.js frontend
│   ├── app/                    Routes (landing, auth, dashboard, invoices, contracts,
│   │                           disputes, recoveries, admin/*)
│   ├── components/             Reusable UI (Layout, KpiCard, DataTable, StatusPill, Protected)
│   ├── context/                AuthProvider (session + current user)
│   ├── hooks/                  useApiData (loading/error/reload state)
│   └── lib/                    API client, constants, formatters, letter TXT/PDF export
├── server/                     Express REST API
│   └── src/
│       ├── config/             Env validation, MongoDB connection, shared constants
│       ├── controllers/        Request handling / business logic
│       ├── middleware/         Auth, RBAC, validation, error handling
│       ├── models/             8 Mongoose collections
│       ├── routes/             API route definitions + validation chains
│       ├── scripts/            Seed script
│       ├── tests/              Node test runner (fee math, status rules, letters)
│       ├── utils/              Audit rules engine, domain rules, letter generator, rounding
│       ├── createApp.js        Express app factory (safe to import in tests)
│       ├── index.js            Vercel serverless entry (DB readiness middleware)
│       └── localServer.js      Local entry point: connect DB, then listen
├── docs/                       Plan and teammate documentation
│   ├── PROJECT_PLAN.md         100% plan / 65% scope
│   ├── ARCHITECTURE.md         How the pieces fit together
│   ├── API.md                  Endpoint reference
│   ├── DEVELOPMENT.md          Local setup and workflows
│   └── GLOSSARY.md             Domain vocabulary
├── .github/                    CI workflow + PR template
├── deferred/                   Remaining sample-data file for opt-in preview mode
├── eslint.config.mjs
├── .prettierrc.json
└── package.json                Root workspace scripts
```

---

## Run locally

Prerequisites: Node.js 20+, npm 10+, MongoDB running locally.

```bash
npm install
cp .env.example .env
# edit .env → MONGO_URI, JWT_SECRET, CLIENT_URL, NEXT_PUBLIC_API_URL, admin credentials
npm run seed          # optional: load starter records into MongoDB
npm run dev           # Express :5000, Next.js :3000
```

Open <http://localhost:3000>.

`NEXT_PUBLIC_API_URL` is required for the frontend. When it is missing, the app shows a configuration error instead of any data. The opt-in preview flag described under **Live data** is the only exception and is off in production.

---

## Seed accounts (after seeding)

| Role     | Email                      | Password           |
| -------- | -------------------------- | ------------------ |
| Admin    | `admin@freightguard.ai`    | `l4JIlu-Bfojs94GQ` |
| Operator | `operator@freightguard.ai` | `Operator@12345`   |
| User     | `priya@harborline.com`     | `Demo@12345`       |

---

## Quality checks

Run these before every pull request (CI runs the same commands):

```bash
npm run lint          # ESLint across client + server
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run test          # Node test runner (server/src/tests)
npm run build         # Production Next.js build
npm audit --audit-level=high
npm run check         # lint + format:check + test + build in one command
```

`npm run lint:fix` applies safe ESLint fixes. Configuration lives in `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, and `.editorconfig`.

---

## What's in the 65%

- Full Next.js + Express + MongoDB setup with clean separation, reusable components, JWT auth, RBAC, validation, centralised error handling, Helmet and explicit CORS origin.
- Contracts CRUD, invoice management, manual invoice entry, and a basic audit rules engine with per-line verdicts, reasons and confidence scores.
- User accept/reject decisions on flagged audit lines, shared with operator review through `reviewStatus`.
- Dispute letters generated only from accepted flags, with TXT export and a dependency-free PDF writer.
- Bounded dispute workflow: `draft → sent → under_review → won/lost`; recovery recording is the only path into `won`.
- Recovery records with company-specific fee percentage, `feeAmount = amount × feePct / 100`, `billingStatus` of `due`/`paid`, and company-scoped listing.
- Dashboard with traceable KPIs and tables; fee-due totals exclude paid fees.
- Admin panel: platform stats, operator review queue, user management, all-invoice and all-dispute oversight, settings.
- Shared constants and formatters so business numbers (`25%` fee, `0.7` review threshold, money formatting) live in one place.
- Automated domain tests, ESLint, Prettier, EditorConfig, CI workflow, PR template and live deployment.

## What's deferred to reach 100%

Real Kimi OCR, charts/CSV analytics, email notifications, payment integration, Google OAuth, real file storage and final product polish. The promoted drafts for units 11–14 were removed; `deferred/` now contains only sample data for the opt-in preview aid. See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the phase breakdown.

---

## Documentation

- [Project plan — 100% vision and 65% scope](docs/PROJECT_PLAN.md)
- [Architecture — system design and data flow](docs/ARCHITECTURE.md)
- [API reference — endpoints, auth and errors](docs/API.md)
- [Development guide — setup, workflows and troubleshooting](docs/DEVELOPMENT.md)
- [Glossary — domain terms](docs/GLOSSARY.md)
- [Contributing — branch, commit and PR rules](CONTRIBUTING.md)

## License

MIT — see [LICENSE](LICENSE).
