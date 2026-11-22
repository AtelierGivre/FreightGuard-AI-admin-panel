# Glossary — FreightGuard AI

Shared vocabulary for demurrage/detention domain terms, product concepts and code constructs used in this repository.

---

## Domain terms

| Term                            | Meaning                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Demurrage**                   | A charge for keeping a container at a port or terminal beyond the allowed free time.                                                              |
| **Detention**                   | A charge for keeping a container outside the port/terminal beyond the allowed free time.                                                          |
| **Demurrage & detention (D&D)** | The combined category of charges this product audits.                                                                                             |
| **Tariff contract**             | The agreed rate card for a carrier and port: free days, day-count rule and pricing tiers. Stored in `contracts`.                                  |
| **Carrier**                     | Shipping line that issued the invoice (e.g. Maersk, MSC). Part of the contract match key with `port`.                                             |
| **Port**                        | Location where the container was held. Part of the contract match key with `carrierName`.                                                         |
| **Free days / free time**       | Number of days the customer is not charged. Stored as `contract.freeDays`; rule 1 flags charges inside this window.                               |
| **Day rule**                    | Whether chargeable days count as `calendar` days or `working` days. Field exists on contracts; the 45% engine uses numeric `days` from line data. |
| **Chargeable days**             | `max(0, days - freeDays)`. The number of days the engine expects to be billed.                                                                    |
| **Tier**                        | A rate band defined by `dayFrom` / `dayTo` (e.g. days 5–10 at $150/day). Stored in `contract.tiers`.                                              |
| **Invoice**                     | A bill from a carrier containing one or more charge lines. Stored in `invoices`.                                                                  |
| **Invoice line**                | A single demurrage/detention charge with `days`, `rate`, `billedAmount` and audit results. Stored in `invoice_lines`.                             |
| **Billed amount**               | What the carrier charged. Field: `billedAmount`.                                                                                                  |
| **Correct amount**              | What the engine calculates as payable under the contract. Field: `correctAmount`.                                                                 |
| **Recoverable amount**          | `billedAmount - correctAmount` for a flagged line. The basis for a dispute.                                                                       |
| **Container number**            | Identifier for the physical container; shown on invoices and disputes.                                                                            |

---

## Audit and review

| Term                 | Meaning                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Audit**            | Running the rules engine against an invoice's lines. Started by `POST /api/invoices/:id/audit`.                             |
| **Rules engine**     | `server/src/utils/rulesEngine.js`. Applies six verdict rules from PRD section F5.                                           |
| **Verdict**          | Engine decision for a line: `ok`, `overcharged`, `invalid`, or `skipped`.                                                   |
| **`ok`**             | Charge matches contract terms and free time rules (confidence 0.92).                                                        |
| **`overcharged`**    | Billed days or rate exceed what the contract allows (confidence 0.88–0.90).                                                 |
| **`invalid`**        | No charge is due (inside free time, duplicate, or corrected amount is zero).                                                |
| **`skipped`**        | No matching contract was found; the engine cannot judge the line (confidence 0.50).                                         |
| **Confidence**       | 0–1 score representing how certain the engine is. Low-confidence flags need human review.                                   |
| **Review threshold** | `REVIEW_CONFIDENCE_THRESHOLD = 0.7`. Flags at or below this value belong in the operator review queue.                      |
| **Flag**             | A line whose verdict is not `ok` or `skipped`, i.e. a potentially recoverable charge.                                       |
| **Review status**    | `unreviewed`, `confirmed`, or `rejected` — the operator's decision on a flag.                                               |
| **Review queue**     | Admin screen listing unreviewed flags, sorted by lowest confidence first.                                                   |
| **Operator gate**    | The rule that low-confidence flags must be reviewed before any dispute letter is generated (letter generation is deferred). |

---

## Money and business model

| Term                               | Meaning                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Recovery**                       | Money actually received from a successful dispute. Stored in `recoveries`.                               |
| **Contingency fee / recovery fee** | `DEFAULT_FEE_PCT = 25%`. Charged only on recovered money — "no recovery, no fee".                        |
| **Fee due**                        | Sum of `recovery.feeAmount`; shown as a dashboard KPI.                                                   |
| **Recovery rate**                  | `recoveredAmount / totalBilled × 100`, rounded to two decimals.                                          |
| **Company fee override**           | A company-specific `feePct` that can differ from the platform default; shown in admin settings.          |
| **Total billed**                   | Sum of all invoice `totalBilled` values. The dashboard KPI deliberately matches the invoice table total. |

---

## Disputes (data exists, workflow UI deferred)

| Term               | Meaning                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Dispute**        | A formal challenge sent to a carrier over flagged charges. Stored in `disputes`.                             |
| **Dispute status** | Lifecycle: `draft` → `sent` → `under_review` → `won` / `lost`. Only oversight tables are implemented in 45%. |
| **Dispute letter** | The document sent to the carrier. Generation/export is deferred to unit 12.                                  |

---

## Product and access

| Term                        | Meaning                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Workspace**               | The user-facing area: dashboard, invoices, contracts. Available to all signed-in roles.               |
| **Admin panel**             | Staff-only area: overview, review queue, user management, all invoices/disputes, settings.            |
| **Role**                    | `user` (customer), `operator` (staff reviewer), or `admin` (full access).                             |
| **Staff role**              | `operator` or `admin`; exported as `STAFF_ROLES` in both constants files.                             |
| **`isStaff`**               | Boolean from `AuthContext` used to show admin navigation.                                             |
| **`<Protected>`**           | Client component that guards a page by role and redirects unauthenticated users.                      |
| **`protect`**               | Express middleware that verifies the Bearer token and attaches `req.user`.                            |
| **`authorize(...roles)`**   | Express middleware that returns 403 when the role is not allowed.                                     |
| **Company scoping**         | Filtering every user-owned query by `req.user.company` so tenants cannot see each other's data.       |
| **Platform-wide oversight** | The intentional admin exception (`all invoices`, `all disputes`, `stats`) that is not company-scoped. |

---

## Technical terms

| Term                | Meaning                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **App Router**      | Next.js routing system using the `app/` directory and file-based route folders.                                 |
| **`'use client';`** | Directive marking a component as client-side interactive.                                                       |
| **AuthProvider**    | React context owning `user`, `loading`, `login`, `register`, `logout`, `isStaff`.                               |
| **`useApiData`**    | Reusable hook providing `data`, `loading`, `error`, `reload`, `setData` for page fetches.                       |
| **Demo mode**       | Running the frontend with `NEXT_PUBLIC_API_URL` unset; all API calls resolve from `demoData.js`.                |
| **Fallback flag**   | `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK`; when true in live mode, failed calls show demo data. Local development only. |
| **App factory**     | `createApp()` in `server/src/app.js`; configures middleware without connecting to MongoDB.                      |
| **Entry point**     | `server/src/server.js`; connects to MongoDB and calls `listen()`.                                               |
| **`asyncHandler`**  | Wrapper that forwards rejected async controller promises to Express error middleware.                           |
| **Envelope**        | Consistent JSON shape: `{ success, data, ... }` or `{ success: false, message }`.                               |
| **Workspace**       | npm workspaces (`client`, `server`) managed from the root `package.json`.                                       |
| **Deferred**        | Draft files for units 10–20 under `deferred/`; not imported by production code.                                 |
