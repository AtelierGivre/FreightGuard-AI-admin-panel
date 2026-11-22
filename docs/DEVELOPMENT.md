# Development Guide — FreightGuard AI

This guide covers local setup, daily commands, common workflows and troubleshooting. Start [CONTRIBUTING.md](../CONTRIBUTING.md) for branch/commit/PR rules and [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised.

---

## 1. Prerequisites

| Tool    | Version             | Notes                                                                      |
| ------- | ------------------- | -------------------------------------------------------------------------- |
| Node.js | 20+                 | Required by Next.js 16                                                     |
| npm     | 10+                 | Workspaces are used at the root                                            |
| MongoDB | 6+ or MongoDB Atlas | Only needed for **live** mode                                              |
| Git     | any recent version  | GitHub repo: <https://github.com/AtelierGivre/FreightGuard-AI-admin-panel> |

Check your versions:

```bash
node --version
npm --version
```

---

## 2. Clone and install

```bash
git clone https://github.com/AtelierGivre/FreightGuard-AI-admin-panel.git
cd FreightGuard-AI-admin-panel
npm install
cp .env.example .env
```

`.env` is ignored by Git. Never commit it.

---

## 3. Choose a runtime mode

### Option A — Demo mode (fastest, no database)

1. In `.env`, **comment out** `NEXT_PUBLIC_API_URL`:

   ```env
   # NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false
   ```

2. Run only the frontend:

   ```bash
   npm run dev -w client
   ```

3. Open <http://localhost:3000> → `/login` → **Enter demo as Admin**.

All data comes from `client/lib/demoData.js`. You can review dashboard, invoices, contracts and every admin screen without MongoDB.

### Option B — Live mode (full stack)

1. Make sure MongoDB is running locally (default `mongodb://127.0.0.1:27017/freightguard`) or set `MONGO_URI` to your Atlas connection string.
2. In `.env`:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/freightguard
   JWT_SECRET=replace-with-a-long-random-string
   CLIENT_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false
   ```

3. Seed demo users/contracts/invoices (optional but recommended):

   ```bash
   npm run seed
   ```

4. Start both services:

   ```bash
   npm run dev
   # server: http://localhost:5000  (GET /api/health)
   # client: http://localhost:3000
   ```

5. Sign in with one of the seeded accounts:

   | Role     | Email                      | Password         |
   | -------- | -------------------------- | ---------------- |
   | Admin    | `admin@freightguard.ai`    | `Admin@12345`    |
   | Operator | `operator@freightguard.ai` | `Operator@12345` |
   | User     | `priya@harborline.com`     | `Demo@12345`     |

> `npm run seed` **clears all collections** before inserting demo data. Do not run it against a database with data you care about.

---

## 4. Environment variables

| Variable                          | Where used    | Default                 | Purpose                                              |
| --------------------------------- | ------------- | ----------------------- | ---------------------------------------------------- |
| `PORT`                            | server        | `5000`                  | HTTP port                                            |
| `NODE_ENV`                        | server        | `development`           | Controls Morgan logging and production safety checks |
| `CLIENT_URL`                      | server        | `http://localhost:3000` | Allowed CORS origin; required in production          |
| `MONGO_URI`                       | server        | local MongoDB URL       | Database connection                                  |
| `JWT_SECRET`                      | server        | dev-only fallback       | Signing key; **must** be set in production           |
| `JWT_EXPIRE`                      | server        | `7d`                    | Token lifetime                                       |
| `DEFAULT_FEE_PCT`                 | server + seed | `25`                    | Contingency fee on recovered money                   |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`  | seed          | admin credentials       | Bootstrap admin account                              |
| `NEXT_PUBLIC_API_URL`             | client        | unset                   | Express API base URL; unset = demo mode              |
| `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK` | client        | `false`                 | Failed live calls show demo data (local only)        |

Production safety behaviour:

- `NODE_ENV=production` + default `JWT_SECRET` → server throws at startup.
- `NODE_ENV=production` without `CLIENT_URL` → warning; CORS falls back to `http://localhost:3000`.
- `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true` in live mode logs a warning when a call fails and displays mock data. Keep it false anywhere numbers matter.

---

## 5. Root scripts

| Command                 | What it does                                     |
| ----------------------- | ------------------------------------------------ |
| `npm install`           | Installs all workspace dependencies              |
| `npm run dev`           | Runs Express and Next.js together (colour-coded) |
| `npm run dev -w server` | API only (`nodemon src/server.js`)               |
| `npm run dev -w client` | Frontend only                                    |
| `npm run build`         | Production Next.js build                         |
| `npm start`             | Starts the Express API in production mode        |
| `npm run seed`          | Reseeds MongoDB with demo data                   |
| `npm run lint`          | ESLint across `client/` and `server/`            |
| `npm run lint:fix`      | ESLint with safe auto-fixes                      |
| `npm run format`        | Prettier write across the repo                   |
| `npm run format:check`  | Prettier check (CI gate)                         |
| `npm run check`         | `lint` + `format:check` + `build`                |

Run the full gate before opening a PR:

```bash
npm run check
npm audit --audit-level=high
```

CI runs the same checks on every push and pull request to `main` (see `.github/workflows/ci.yml`).

---

## 6. Daily workflows

### Add an endpoint

1. Route in `server/src/routes/<domain>Routes.js`: validation, `protect`, `authorize`, `asyncHandler`.
2. Controller in `server/src/controllers/<domain>Controller.js`.
3. Scope query to `req.user.company` unless it is an intentional admin oversight route.
4. Client method in `client/lib/api.js`, including a demo branch if the UI should work offline.
5. Document in `docs/API.md`.
6. Run `npm run check`.

See [CONTRIBUTING.md](../CONTRIBUTING.md#6-adding-a-new-feature) for the full checklist.

### Add a page

1. Create `client/app/<route>/page.jsx` with `'use client';`.
2. Wrap with `<Protected>` and `<Layout title subtitle>`.
3. Load data with `useApiData(api.<method>)`; render `error` with a Retry button.
4. Add the sidebar link in `client/components/Layout.jsx` (`workspaceNav` or `staffNav`).
5. Use `money()` / `confidencePct()` from `client/lib/format.js` and roles from `client/lib/constants.js`.

### Change a business number

- Fee: `DEFAULT_FEE_PCT` in `.env` / `server/src/config/constants.js`, `client/lib/constants.js`, and `client/app/admin/settings/page.jsx` label.
- Review threshold: `REVIEW_CONFIDENCE_THRESHOLD` in both constants files.

Never hardcode `25` or `0.7` in a component or controller.

---

## 7. Troubleshooting

| Symptom                                                   | Likely cause                                                   | Fix                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `MongoDB connection error` on `npm run dev`               | MongoDB not running or bad `MONGO_URI`                         | Start MongoDB or use demo mode (comment out `NEXT_PUBLIC_API_URL`)                  |
| `JWT_SECRET must be set...` in production                 | `NODE_ENV=production` with default secret                      | Set a long random `JWT_SECRET`                                                      |
| Browser shows `Cannot reach the API`                      | Wrong `NEXT_PUBLIC_API_URL`, API not running, or CORS mismatch | Check API health at `/api/health`; match `CLIENT_URL` to frontend origin            |
| Login works but user is admin in demo without credentials | Demo mode active                                               | Expected; set `NEXT_PUBLIC_API_URL` for live auth                                   |
| Stale admin session after token change                    | Old `fg_token` in `localStorage`                               | Clear site storage or sign out; live `/auth/me` clears invalid tokens automatically |
| Dashboard numbers look like mock data                     | `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true` or API failing          | Set flag to false and inspect the failed request                                    |
| `react/no-unescaped-entities` lint error                  | Raw apostrophe in JSX text                                     | Use `&apos;` or curly braces                                                        |
| `Cannot access refs during render`                        | Assigning `ref.current` in render                              | Update refs inside `useEffect` (see `useApiData.js`)                                |
| `Pages directory cannot be found` ESLint warning          | Next config expecting legacy pages                             | `@next/next/no-html-link-for-pages` is disabled in `eslint.config.mjs`              |
| Prettier check fails in CI                                | Local formatting drift                                         | Run `npm run format` and commit the result                                          |

---

## 8. CI explained

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`:

1. Checkout repository.
2. Set up Node.js 20 with npm cache.
3. `npm ci` (clean install from lockfile).
4. `npm run lint`
5. `npm run format:check`
6. `npm run build`
7. `npm audit --audit-level=high`

No database is needed because the build is static generation and `app.js` does not connect to MongoDB on import.

---

## 9. Working with deferred code

`deferred/` holds drafts for units 10–20. Rules:

- Do not import from `deferred/` in production code.
- Do not delete a draft just because it looks outdated; discuss promotion into scope first.
- When promoting: move files into `client/` or `server/`, add docs/tests, update `docs/PROJECT_PLAN.md`, and update `deferred/README.md`.

---

## 10. Getting unstuck

- Read the error message from `npm run check` before changing code.
- Check [docs/API.md](API.md) for the expected response shape.
- Check [docs/ARCHITECTURE.md](ARCHITECTURE.md) for the middleware order and company-scoping rules.
- Ask in an issue with: command run, expected vs actual, OS, Node version, and demo vs live mode.
