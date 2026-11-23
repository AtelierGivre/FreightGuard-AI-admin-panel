# Contributing to FreightGuard AI

This repository is a shared workspace. The current product scope is **45% (units 1–9)** of the [full 100% plan](docs/PROJECT_PLAN.md). Work on deferred units must stay in `deferred/` until its unit is formally promoted into scope.

> **Ground rule:** discuss any major architecture change (new package, new data model, changing auth/RBAC strategy, switching frameworks, changing the fee model) in an issue or team discussion before opening a PR. Small refactors that preserve behaviour are welcome.

> **Temporary preview:** The live deployment currently uses preview mode (`NEXT_PUBLIC_PREVIEW_MODE=true`) with sample data from `client/lib/previewData.js` because the backend is not connected yet. It is not the final product: **remove it before shipping real auth** — set `NEXT_PUBLIC_PREVIEW_MODE=false`, set `NEXT_PUBLIC_API_URL`, redeploy, then delete the preview data module and UI branches. Preview mode never calls the API; real mode has no silent fallback.

---

## 1. First-time setup

```bash
git clone https://github.com/AtelierGivre/FreightGuard-AI-admin-panel.git
cd FreightGuard-AI-admin-panel
npm install
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, CLIENT_URL, NEXT_PUBLIC_API_URL as needed
npm run seed          # optional, populates MongoDB
npm run dev           # API :5000, frontend :3000
```

Read [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for environment variables and troubleshooting.

---

## 2. Branching strategy

| Branch type | Pattern                | Example                        |
| ----------- | ---------------------- | ------------------------------ |
| Main        | `main`                 | protected, always deployable   |
| Feature     | `feature/<short-name>` | `feature/review-queue-filters` |
| Fix         | `fix/<short-name>`     | `fix/dashboard-total-billed`   |
| Docs        | `docs/<short-name>`    | `docs/api-reference`           |
| Chore       | `chore/<short-name>`   | `chore/eslint-flat-config`     |

Rules:

- Never commit directly to `main`. Open a pull request.
- Keep branches short-lived and focused on one concern.
- Rebase or merge `main` into your branch before opening a PR if it has moved.

---

## 3. Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<optional scope>): <imperative summary>

[optional body explaining why]
[optional footer, e.g. Refs #12]
```

Allowed types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`, `test`, `ci`, `build`, `perf`.

Examples:

```text
fix(dashboard): report totalBilled instead of amount
feat(admin): add pagination validation to review queue
docs(api): document auth and error response shapes
chore: add ESLint and Prettier configuration
```

---

## 4. Pull request workflow

1. Create a branch from `main`.
2. Make focused commits.
3. Run all checks locally:

   ```bash
   npm run check            # lint + format:check + build
   npm audit --audit-level=high
   ```

4. Push and open a PR using the template in `.github/PULL_REQUEST_TEMPLATE.md`.
5. Link the related issue and state whether the change touches in-scope or deferred work.
6. Request at least one teammate review. Address comments with new commits (do not force-push after review unless agreed).
7. After approval, squash or merge according to team preference. CI must be green.

### Reviewer checklist

Reviewers should verify:

- [ ] The change matches the 45% scope, or is explicitly labelled as deferred groundwork.
- [ ] No secrets, tokens, real customer data or `.env` files are committed.
- [ ] New routes have validation, RBAC (`protect` / `authorize`) and `asyncHandler`.
- [ ] Queries touching user data are filtered by `req.user.company`.
- [ ] Frontend loading/error states are handled (prefer `useApiData`).
- [ ] Business constants are imported from `lib/constants.js` or `server/src/config/constants.js` — no magic `25` or `0.7`.
- [ ] Money formatting uses `client/lib/format.js`; server rounding uses `server/src/utils/round.js`.
- [ ] Docs are updated when behaviour, endpoints or setup change.
- [ ] `npm run check` and `npm audit --audit-level=high` pass in CI.

---

## 5. Coding standards

### JavaScript / JSX

- ES modules in `client/` (`import` / `export`); CommonJS in `server/` (`require` / `module.exports`).
- Prettier decides formatting. Do not hand-format; run `npm run format`.
- Use `const` by default; `let` only when reassignment is required; avoid `var`.
- Prefer named exports for utilities and default exports for Next.js pages/components.
- Keep components small and extract repeated UI into `client/components/`.
- Use descriptive names: `getReviewQueue`, `flaggedAmount`, `isStaff` — not `getData`, `amt`, `flag`.
- Avoid unused variables. Prefix intentionally unused parameters with `_` (`_next` in error middleware).

### Frontend

- Pages live in `client/app/`. Route folders are the source of truth — do not add a legacy `pages/` directory.
- Client-interactive files start with `'use client';`.
- Fetch page data through `useApiData(fetcher, deps)`; it provides `data`, `loading`, `error`, `reload`, `setData`.
- Call the API only through `client/lib/api.js`. Do not scatter `fetch()` calls in components.
- Route guards use `<Protected roles={...}>`; import roles from `client/lib/constants.js`.
- Navigation uses Next.js `<Link>` so it works with keyboard and client-side routing.
- In real mode (`NEXT_PUBLIC_PREVIEW_MODE=false` or unset), `NEXT_PUBLIC_API_URL` is required; API failures must surface to the UI instead of returning mock data. The temporary preview exception is noted at the top of this document.

### Backend

- `server/src/app.js` exports a `createApp()` factory and does **not** connect to MongoDB or listen.
- `server/src/server.js` is the only entry point that connects to MongoDB and starts HTTP.
- Every async controller is wrapped with `asyncHandler` in the route file. Express 4 will not catch rejected promises otherwise.
- Validation chains live in `server/src/routes/*.js`; call `validate` before the controller.
- Auth order matters: `protect` → `authorize(...roles)` → validation → `asyncHandler(controller)`.
- Controllers respond with the envelope `{ success: true, data, ... }` or `{ success: false, message }`.
- Throw/return errors instead of calling `process.exit()` inside libraries; only `server.js` sets `process.exitCode`.
- All user-owned queries include `company: req.user.company` (see `dashboardController` for the pattern).
- Add shared business numbers to `server/src/config/constants.js`, not inline in controllers.

### Database

- Add or change schemas in `server/src/models/`.
- Keep fields consistent with [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) section 5.
- Use Mongoose validators for data that must be valid regardless of the route.
- Do not write migration scripts without team agreement; this stage uses `npm run seed` for starter records.

---

## 6. Adding a new feature

### New API endpoint

1. Add the route in `server/src/routes/<domain>Routes.js`.
2. Add `express-validator` rules; include `param('id').isMongoId()` for resource ids.
3. Apply `protect`, then `authorize(...)` if staff-only, then `validate`, then `asyncHandler(controller)`.
4. Add the controller in `server/src/controllers/<domain>Controller.js` and export it.
5. Scope queries to `req.user.company` unless the route is intentionally platform-wide admin oversight.
6. Add the client method to `client/lib/api.js` so the UI calls the live API.
7. Document the endpoint in [docs/API.md](docs/API.md).

### New page

1. Create the route folder/file under `client/app/`.
2. Wrap content in `<Protected>` and `<Layout title=... subtitle=...>`.
3. Use `useApiData` for loading/error/reload; show a Retry button on error.
4. Add navigation in `client/components/Layout.jsx` if the page should appear in the sidebar.
5. If staff-only, add the link to `staffNav` and mark `adminOnly: true` when only admins may see it.

### New business rule

1. Add the rule to `server/src/utils/rulesEngine.js` with a short comment naming the PRD rule.
2. Return a verdict from the existing enum in `server/src/config/constants.js`; extend the enum only after team agreement.
3. Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/GLOSSARY.md](docs/GLOSSARY.md) if terminology changes.

---

## 7. Security rules

- No secrets in code or commits. Use `.env` (ignored by Git) and `.env.example` as a template only.
- `JWT_SECRET` must be a long random string in production; the server throws at startup with the dev fallback.
- `CLIENT_URL` controls CORS. Do not use `*` together with `credentials: true`.
- Passwords are hashed with bcrypt; never log or return them. `protect` selects only `name email role company isActive`.
- `NEXT_PUBLIC_API_URL` is required for the frontend in real mode (the temporary preview exception above does not call the API); a missing value shows a configuration error, never mock data.
- Admin self-demotion, self-deactivation and self-deletion are blocked in `adminController` — preserve that guard.
- Do not introduce `dangerouslySetInnerHTML` without sanitisation.

---

## 8. Documentation expectations

When your PR changes behaviour, update the matching document in the same PR:

| Change                       | Document to update            |
| ---------------------------- | ----------------------------- |
| New/changed endpoint         | `docs/API.md`                 |
| New component/hook/data flow | `docs/ARCHITECTURE.md`        |
| Setup/env/troubleshooting    | `docs/DEVELOPMENT.md`, README |
| New domain term              | `docs/GLOSSARY.md`            |
| Scope or phase change        | `docs/PROJECT_PLAN.md`        |
| New command/script           | README, `docs/DEVELOPMENT.md` |

Write for a teammate who has never seen the code: explain _why_, not only _what_.

---

## 9. Deferred work

`deferred/` contains drafts for units 10–20. Do not import from `deferred/` in production code. When a unit is promoted into scope:

1. Discuss the move with the team.
2. Move the files into `client/` or `server/` with proper tests/docs.
3. Update the status table in `docs/PROJECT_PLAN.md`.
4. Delete the stale draft from `deferred/` and update `deferred/README.md`.

---

## 10. Getting help

- Check [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) first for setup issues.
- Search existing issues/PRs before opening a new one.
- Include the failing command, expected vs actual result, OS/Node version, and the `NEXT_PUBLIC_API_URL` you used.
