# FreightGuard AI

Container demurrage & detention invoice auditing and recovery platform.

**Current build: 45% of the full vision.** See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the complete 100% roadmap and exactly which units are in scope.

Repository: <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel>

---

## Live app

Share these links with stakeholders:

| What           | Link                                                          |
| -------------- | ------------------------------------------------------------- |
| App            | <https://freightguard-ai-admin-panel.vercel.app>              |
| Sign in        | <https://freightguard-ai-admin-panel.vercel.app/login>        |
| Admin overview | <https://freightguard-ai-admin-panel.vercel.app/admin>        |
| Source code    | <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel> |

### Temporary preview

The current deployment runs in **temporary preview mode** (`NEXT_PUBLIC_PREVIEW_MODE=true`) because the backend is not connected yet: the frontend uses sample data from `client/lib/previewData.js`, offers an **Enter preview as Admin** button, and needs no backend or MongoDB. This is a temporary bridge, not the final product.

To switch to real mode:

1. Set `NEXT_PUBLIC_PREVIEW_MODE=false` and `NEXT_PUBLIC_API_URL` to the Express API base URL.
2. Redeploy.
3. Delete the preview data module (`client/lib/previewData.js`) and the preview UI branches.

Preview mode never calls the API; in real mode there is no silent fallback — API failures still surface as errors.

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
| Quality        | ESLint 9 (flat config), Prettier, EditorConfig, CI                      |

> React 19 replaced React 18 to remove Next.js 16's deprecation warning. The upgrade required no application-code changes; lint, formatting, and the production build all pass.

---

## Structure

```text
freightguard-ai/
├── client/                     Next.js frontend
│   ├── app/                    Routes (landing, auth, dashboard, invoices, contracts, admin/*)
│   ├── components/             Reusable UI (Layout, KpiCard, DataTable, StatusPill, Protected)
│   ├── context/                AuthProvider (session + current user)
│   ├── hooks/                  useApiData (loading/error/reload state)
│   └── lib/                    API client, constants, formatters
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

Prerequisites: Node.js 20+, npm 10+, MongoDB running locally.

```bash
npm install
cp .env.example .env
# edit .env → MONGO_URI, JWT_SECRET, CLIENT_URL, NEXT_PUBLIC_API_URL, admin credentials
npm run seed          # optional: load starter records into MongoDB
npm run dev           # Express :5000, Next.js :3000
```

Open <http://localhost:3000>.

In real mode, `NEXT_PUBLIC_API_URL` is required for the frontend. When it is missing, the app shows a configuration error instead of any data; temporary preview mode (described under **Live app**) is the explicit exception.

---

## Seed accounts (after seeding)

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
