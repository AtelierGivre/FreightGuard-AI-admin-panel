# FreightGuard AI

Container demurrage & detention invoice auditing and recovery platform.

**Current build: 45% of the full vision.** See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the complete 100% roadmap and exactly which units are in scope.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18 |
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt, role-based access control |

## Structure

```
freightguard-ai/
├── client/          Next.js frontend
│   ├── app/         Routes (landing, auth, dashboard, invoices, contracts, admin/*)
│   ├── components/  Reusable UI (Layout, KpiCard, DataTable, StatusPill, Protected)
│   ├── context/     Auth provider
│   └── lib/         API client + demo data
├── server/          Express REST API
│   └── src/
│       ├── config/      Env + MongoDB connection
│       ├── controllers/ Business logic
│       ├── middleware/  Auth, authorization, validation, error handling
│       ├── models/      8 Mongoose collections
│       ├── routes/      API routes
│       ├── scripts/     Seed script
│       └── utils/       Audit rules engine
├── docs/PROJECT_PLAN.md
└── deferred/        Drafted Phase B/C files (not part of the 45% build)
```

## Run locally

```bash
npm install
cp .env.example .env
# edit .env → MONGO_URI, JWT_SECRET, admin credentials
npm run seed          # optional: load demo data
npm run dev           # Express :5000, Next.js :3000
```

Open http://localhost:3000.

**Demo mode** — if `NEXT_PUBLIC_API_URL` is not set, the frontend serves mock data and no MongoDB is needed. On `/login`, choose **Enter demo as Admin** to explore the admin panel.

## Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@freightguard.ai | Admin@12345 |
| Operator | operator@freightguard.ai | Operator@12345 |
| User | priya@harborline.com | Demo@12345 |

## What's in the 45%

- Full Next.js + Express + MongoDB setup with clean separation, reusable components, JWT auth, RBAC (`user` / `operator` / `admin`), validation, error handling, Helmet and CORS.
- Contracts CRUD, invoice management, basic audit rules engine with per-line verdicts and confidence.
- Dashboard with traceable KPIs and tables.
- Admin panel: platform stats, operator review queue, user management, all-invoice and all-dispute oversight, settings.

## What's deferred to reach 100%

Real Kimi OCR, user flag accept/reject workflow, dispute letter generation, dispute status workflow, recovery/fee billing screens, charts, email notifications, payment integration, Google OAuth, real file storage, exports, automated tests and deployment. See the plan for the phase breakdown.
