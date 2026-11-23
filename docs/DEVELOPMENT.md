# Development Guide — FreightGuard AI

This guide covers local setup, daily commands, common workflows and troubleshooting. Start [CONTRIBUTING.md](../CONTRIBUTING.md) for branch/commit/PR rules and [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised.

---

## 1. Prerequisites

| Tool    | Version             | Notes                                                                      |
| ------- | ------------------- | -------------------------------------------------------------------------- |
| Node.js | 20+                 | Required by Next.js 16                                                     |
| npm     | 10+                 | Workspaces are used at the root                                            |
| MongoDB | 6+ or MongoDB Atlas | Local MongoDB or Atlas connection                                          |
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

## 3. Run locally

1. Make sure MongoDB is running locally (default `mongodb://127.0.0.1:27017/freightguard`) or set `MONGO_URI` to your Atlas connection string.
2. In `.env`:

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/freightguard
   JWT_SECRET=replace-with-a-long-random-string
   CLIENT_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

   `NEXT_PUBLIC_API_URL` is required in real mode. If it is missing, the frontend shows a configuration error; temporary preview mode is the explicit exception.

3. Seed starter users/contracts/invoices (optional but recommended):

   ```bash
   npm run seed
   ```

4. Start both services:

   ```bash
   npm run dev
   # server: http://localhost:5000  (GET /api/health)
   # client: http://localhost:3000
   ```

5. Sign in with one of the seed accounts:

   | Role     | Email                      | Password         |
   | -------- | -------------------------- | ---------------- |
   | Admin    | `admin@freightguard.ai`    | `Admin@12345`    |
   | Operator | `operator@freightguard.ai` | `Operator@12345` |
   | User     | `priya@harborline.com`     | `Demo@12345`     |

> `npm run seed` **clears all collections** before inserting starter records. Do not run it against a database with data you care about.

### Temporary preview mode (backend pending)

The current deployment uses **temporary preview mode** (`NEXT_PUBLIC_PREVIEW_MODE=true`) because the Express API/MongoDB are not connected yet. The frontend reads sample data from `client/lib/previewData.js`, shows an **Enter preview as Admin** button, and makes no HTTP calls — no backend or MongoDB is needed. This is a temporary bridge, not the final setup.

Real mode requires `NEXT_PUBLIC_PREVIEW_MODE=false` (or unset) **and** `NEXT_PUBLIC_API_URL` pointing at the Express API. API failures in real mode still surface as errors; there is no silent fallback.

To remove preview mode once the API is live: set `NEXT_PUBLIC_PREVIEW_MODE=false`, set `NEXT_PUBLIC_API_URL`, redeploy, then delete `client/lib/previewData.js` and the preview UI branches.

---

## 4. Environment variables

| Variable                         | Where used    | Default                 | Purpose                                                                                                                                  |
| -------------------------------- | ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                           | server        | `5000`                  | HTTP port                                                                                                                                |
| `NODE_ENV`                       | server        | `development`           | Controls Morgan logging and production safety checks                                                                                     |
| `CLIENT_URL`                     | server        | `http://localhost:3000` | Allowed CORS origin; required in production                                                                                              |
| `MONGO_URI`                      | server        | local MongoDB URL       | Database connection                                                                                                                      |
| `JWT_SECRET`                     | server        | dev-only fallback       | Signing key; **must** be set in production                                                                                               |
| `JWT_EXPIRE`                     | server        | `7d`                    | Token lifetime                                                                                                                           |
| `DEFAULT_FEE_PCT`                | server + seed | `25`                    | Contingency fee on recovered money                                                                                                       |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed          | admin credentials       | Bootstrap admin account                                                                                                                  |
| `NEXT_PUBLIC_API_URL`            | client        | required in real mode   | Express API base URL; missing value shows a configuration error                                                                          |
| `NEXT_PUBLIC_PREVIEW_MODE`       | client        | `false`                 | **Temporary** opt-in: `true` uses sample data from `client/lib/previewData.js` and skips the API; must be `false` in real/production use |

Configuration and safety behaviour:

- `NODE_ENV=production` + default `JWT_SECRET` → server throws at startup.
- `NODE_ENV=production` without `CLIENT_URL` → warning; CORS falls back to `http://localhost:3000`.
- Missing `NEXT_PUBLIC_API_URL` in real mode → frontend shows a configuration error; no data is rendered. Preview mode (`NEXT_PUBLIC_PREVIEW_MODE=true`) is the explicit exception and renders sample data instead.

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
| `npm run seed`          | Reseeds MongoDB with starter records             |
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
4. Client method in `client/lib/api.js` that calls the live API.
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

| Symptom                                            | Likely cause                                                   | Fix                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `MongoDB connection error` on `npm run dev`        | MongoDB not running or bad `MONGO_URI`                         | Start MongoDB or check `MONGO_URI`                                               |
| `JWT_SECRET must be set...` in production          | `NODE_ENV=production` with default secret                      | Set a long random `JWT_SECRET`                                                   |
| Browser shows `Cannot reach the API`               | Wrong `NEXT_PUBLIC_API_URL`, API not running, or CORS mismatch | Check API health at `/api/health`; match `CLIENT_URL` to frontend origin         |
| Stale admin session after token change             | Old `fg_token` in `localStorage`                               | Clear site storage or sign out; `/auth/me` clears invalid tokens automatically   |
| App shows a configuration error                    | `NEXT_PUBLIC_API_URL` is missing in real mode                  | Set it to the Express API base URL in `.env` and restart the client              |
| App shows sample data / **Enter preview as Admin** | `NEXT_PUBLIC_PREVIEW_MODE=true` (temporary preview)            | Set it to `false`, set `NEXT_PUBLIC_API_URL`, redeploy, then remove preview code |
| `react/no-unescaped-entities` lint error           | Raw apostrophe in JSX text                                     | Use `&apos;` or curly braces                                                     |
| `Cannot access refs during render`                 | Assigning `ref.current` in render                              | Update refs inside `useEffect` (see `useApiData.js`)                             |
| `Pages directory cannot be found` ESLint warning   | Next config expecting legacy pages                             | `@next/next/no-html-link-for-pages` is disabled in `eslint.config.mjs`           |
| Prettier check fails in CI                         | Local formatting drift                                         | Run `npm run format` and commit the result                                       |

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
- Ask in an issue with: command run, expected vs actual, OS, Node version, and the `NEXT_PUBLIC_API_URL` you used.
