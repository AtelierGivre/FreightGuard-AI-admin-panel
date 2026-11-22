# FreightGuard AI

Container demurrage & detention invoice auditing and recovery platform.

**Current build: 45% of the full vision.** See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the complete 100% roadmap and exactly which units are in scope.

Repository: <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel>

---

## Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| Frontend       | **Next.js 16.4.6** (App Router), React 18                               |
| Backend        | Node.js + **Express.js** REST API                                       |
| Database       | **MongoDB** via Mongoose                                                |
| Auth           | JWT + bcrypt, role-based access control (`user` / `operator` / `admin`) |
| Validation     | `express-validator` chains + Mongoose schema validators                 |
| Error handling | Centralised error middleware + `asyncHandler`                           |
| Quality        | ESLint 9 (flat config), Prettier, EditorConfig, CI                      |

> Next.js 16 still supports React 18, but support is deprecated and will be removed in Next.js 17. React 19 is a follow-up upgrade, not part of the 45% scope.

---

## Structure

```text
freightguard-ai/
├── client/                     Next.js frontend
│   ├── app/                    Routes (landing, auth, dashboard, invoices, contracts, admin/*)
│   ├── components/             Reusable UI (Layout, KpiCard, DataTable, StatusPill, Protected)
│   ├── context/                AuthProvider (session + current user)
│   ├── hooks/                  useApiData (loading/error/reload state)
│   └── lib/                    API client, constants, formatters, demo data
├── server/                     Express REST API
│   └── src/
│       ├── config/             Env validation, MongoDB connection, shared constants
│       ├── controllers/        Request handling / business logic
│       ├── middleware/         Auth, RBAC, validation, error handling
│       ├── models/             8 Mongoose collections
│       ├── routes/             API route definitions + validation chains
│       ├── scripts/            Seed script
│       ├── utils/              Audit rules engine + rounding helper
│       ├── app.js              Express app factory (safe to import in tests)
│       └── server.js           Entry point: connect DB, then listen
├── docs/                       Plan and teammate documentation
│   ├── PROJECT_PLAN.md         100% plan / 45% scope
│   ├── ARCHITECTURE.md         How the pieces fit together
│   ├── API.md                  Endpoint reference
│   ├── DEVELOPMENT.md          Local setup and workflows
│   └── GLOSSARY.md             Domain vocabulary
├── .github/                    CI workflow + PR template
├── deferred/                   Drafted Phase B/C files (not part of the 45% build)
├── eslint.config.mjs
├── .prettierrc.json
└── package.json                Root workspace scripts
```

---

## Run locally

Prerequisites: Node.js 20+, npm 10+, MongoDB running locally (only for live mode).

```bash
npm install
cp .env.example .env
# edit .env → MONGO_URI, JWT_SECRET, CLIENT_URL, admin credentials
npm run seed          # optional: load demo data into MongoDB
npm run dev           # Express :5000, Next.js :3000
```

Open <http://localhost:3000>.

### Demo mode (no MongoDB required)

If `NEXT_PUBLIC_API_URL` is **unset**, the frontend serves mock data from `client/lib/demoData.js`. On `/login`, choose **Enter demo as Admin** to explore the admin panel. A demo token is stored in `localStorage` so page refreshes keep the session.

`NEXT_PUBLIC_ALLOW_DEMO_FALLBACK` is a separate, development-only flag. When `true` in live mode, failed API calls display demo data. **Never enable it in production** — it can hide real outages behind plausible-looking mock numbers.

---

## Demo accounts (after seeding)

| Role     | Email                      | Password         |
| -------- | -------------------------- | ---------------- |
| Admin    | `admin@freightguard.ai`    | `Admin@12345`    |
| Operator | `operator@freightguard.ai` | `Operator@12345` |
| User     | `priya@harborline.com`     | `Demo@12345`     |

---

## Quality checks

Run these before every pull request (CI runs the same commands):

```bash
npm run lint          # ESLint across client + server
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run build         # Production Next.js build
npm audit --audit-level=high
npm run check         # lint + format:check + build in one command
```

`npm run lint:fix` applies safe ESLint fixes. Configuration lives in `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, and `.editorconfig`.

---

## What's in the 45%

- Full Next.js + Express + MongoDB setup with clean separation, reusable components, JWT auth, RBAC, validation, centralised error handling, Helmet and explicit CORS origin.
- Contracts CRUD, invoice management, manual invoice entry, and a basic audit rules engine with per-line verdicts, reasons and confidence scores.
- Dashboard with traceable KPIs and tables; every query is scoped to the signed-in user's company.
- Admin panel: platform stats, operator review queue, user management, all-invoice and all-dispute oversight, settings.
- Shared constants and formatters so business numbers (`25%` fee, `0.7` review threshold, money formatting) live in one place.
- Teammate tooling: ESLint, Prettier, EditorConfig, CI workflow and PR template.

## What's deferred to reach 100%

Real Kimi OCR, user flag accept/reject workflow, dispute letter generation, full dispute status workflow, recovery/fee billing screens, charts, email notifications, payment integration, Google OAuth, real file storage, exports, automated tests and deployment. Drafted files are preserved under `deferred/`. See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the phase breakdown.

---

## Documentation

- [Project plan — 100% vision and 45% scope](docs/PROJECT_PLAN.md)
- [Architecture — system design and data flow](docs/ARCHITECTURE.md)
- [API reference — endpoints, auth and errors](docs/API.md)
- [Development guide — setup, workflows and troubleshooting](docs/DEVELOPMENT.md)
- [Glossary — domain terms](docs/GLOSSARY.md)
- [Contributing — branch, commit and PR rules](CONTRIBUTING.md)

## License

MIT — see [LICENSE](LICENSE).
