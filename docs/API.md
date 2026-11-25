# API Reference — FreightGuard AI

Base URL in local development: `http://localhost:5000/api`

All requests and responses use `application/json`. This document describes the **implemented 65% surface**. Unfinished endpoints are listed in [PROJECT_PLAN.md](PROJECT_PLAN.md).

---

## 1. Conventions

### Response envelopes

Success:

```json
{
  "success": true,
  "data": {},
  "count": 12
}
```

Some endpoints return `token` and `user` at the top level (`/auth/register`, `/auth/login`) or `message` instead of `data` (deletes, health). List endpoints keep `count`/`data` for existing clients and also return `total` plus a `meta` block.

Failure:

```json
{
  "success": false,
  "message": "Human-readable explanation"
}
```

Validation failure (HTTP 400):

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "totalBilled", "message": "Total billed must be a non-negative number" }]
}
```

### Pagination

List endpoints accept `limit` (1–200, default 50) and `skip`; `page` is also accepted for older clients. The response `meta` contains `total`, `page`, `limit`, `skip` and `pages`. Recovery and admin invoice lists add a `summary` inside `meta` so KPI totals stay correct while the table is paged.

### Authentication

All routes except `/api/health`, `/api/auth/register` and `/api/auth/login` require:

```http
Authorization: Bearer <JWT>
```

The token is returned by `POST /auth/login` or `POST /auth/register`. The frontend stores it in `localStorage` under `fg_token` and sends it automatically through `client/lib/api.js`.

### Role matrix

| Role       | Allowed                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `user`     | Auth, contracts, invoices, customer flag decisions, company-scoped disputes/recoveries, dashboard |
| `operator` | Everything a `user` can do + admin read routes, operator flag review and fee billing              |
| `admin`    | Everything, including user management and settings                                                |

Admin user-management routes add an extra `authorize('admin')` guard. `PUT /api/recoveries/:id/billing` allows `operator` and `admin` only; staff can bill any tenant's recovery. An admin cannot demote, deactivate or delete their own account.

### Enum values

| Field              | Values                                                |
| ------------------ | ----------------------------------------------------- |
| `role`             | `user`, `operator`, `admin`                           |
| `verdict`          | `ok`, `overcharged`, `invalid`, `skipped`             |
| `customerDecision` | `accept`, `reject`                                    |
| `operatorDecision` | `unreviewed`, `confirmed`, `rejected`                 |
| `reviewStatus`     | `unreviewed`, `confirmed`, `rejected` (legacy mirror) |
| `auditStatus`      | `pending`, `processing`, `audited`, `failed`          |
| `dispute.status`   | `draft`, `sent`, `under_review`, `won`, `lost`        |
| `billingStatus`    | `due`, `paid`                                         |

### Status codes

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| 200  | Success (read or update)                                                  |
| 201  | Created                                                                   |
| 400  | Validation failed, malformed JSON, invalid id, or business rule rejection |
| 401  | Missing/invalid/expired token or inactive account                         |
| 403  | Role not allowed                                                          |
| 404  | Resource not found or unknown route                                       |
| 500  | Unexpected server error (stack trace never returned)                      |

---

## 2. Health

### `GET /api/health`

Public liveness probe.

```json
{ "success": true, "message": "FreightGuard AI API is running" }
```

---

## 3. Authentication

### `POST /api/auth/register`

Creates a user and a company, then issues a JWT.

**Body**

| Field         | Type   | Required | Notes                                    |
| ------------- | ------ | -------- | ---------------------------------------- |
| `name`        | string | yes      | trimmed, non-empty                       |
| `email`       | string | yes      | valid email, normalised                  |
| `password`    | string | yes      | minimum 8 characters, hashed with bcrypt |
| `companyName` | string | no       | defaults to `"<name>'s Company"`         |

**201 response**

```json
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "user", "company": "..." }
}
```

`400` if the email is already registered.

### `POST /api/auth/login`

**Body:** `{ "email": "...", "password": "..." }` (both required).

**200 response:** same shape as register; `user.company` is the company id.

- `401` — invalid email or password.
- `403` — account is inactive.
- `200` — also updates `lastLogin`.

### `GET /api/auth/me`

Auth required. Restores the current session.

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "user",
    "company": { "_id": "...", "name": "Harborline Imports" },
    "isActive": true
  }
}
```

Note that `company` is a populated object here, but an id in login/register responses. This is intentional; the client only needs `role` and identity for guards.

---

## 4. Contracts

All contract routes are company-scoped via `req.user.company`.

### `GET /api/contracts`

Returns `{ success, count, data: Contract[] }`, newest first.

### `GET /api/contracts/:id`

`200` `{ success, data: Contract }`; `404` if not found in the caller's company; `400` if the id is not a Mongo ObjectId.

### `POST /api/contracts`

**Body**

| Field         | Type   | Required | Validation         |
| ------------- | ------ | -------- | ------------------ |
| `carrierName` | string | yes      | trimmed, non-empty |
| `port`        | string | yes      | trimmed, non-empty |
| `freeDays`    | number | yes      | integer ≥ 0        |
| `tiers`       | array  | no       | must be an array   |
| `currency`    | string | no       | 3-letter code      |

**201** `{ success, data: Contract }`. The `company` field is set from the token, never from the body.

### `PUT /api/contracts/:id`

Body fields are optional but validated when present (same rules as create). `200` with updated contract, or `404`.

### `DELETE /api/contracts/:id`

`200` `{ success: true, message: "Contract deleted" }`, or `404`.

---

## 5. Invoices

All invoice routes are company-scoped.

### `GET /api/invoices`

Returns `{ success, count, total, meta, data: Invoice[] }` with `contract` populated to `{ carrierName, port }`, newest first.

### `GET /api/invoices/:id`

Returns the invoice plus its line items:

```json
{
  "success": true,
  "data": { "_id": "...", "invoiceNumber": "...", "totalBilled": 1275, "lines": [] }
}
```

### `POST /api/invoices`

**Body**

| Field           | Type   | Required | Validation         |
| --------------- | ------ | -------- | ------------------ |
| `invoiceNumber` | string | yes      | trimmed, non-empty |
| `carrierName`   | string | yes      | trimmed, non-empty |
| `port`          | string | yes      | trimmed, non-empty |
| `totalBilled`   | number | yes      | float ≥ 0          |

**201** `{ success, data: Invoice }`.

### `PUT /api/invoices/:id`

Optional `invoiceNumber`, `carrierName`, `port`, `totalBilled`; validated when present. `200` with updated invoice, or `404`.

### `DELETE /api/invoices/:id`

Deletes the invoice **after** confirming company ownership, then removes its line items. `200` `{ success, message: "Invoice deleted" }`, or `404`.

### `POST /api/invoices/:id/audit`

Runs the rules engine on existing lines, or on `rawJson.lines` when no lines exist yet. Persisted lines are updated only within their own invoice; `rawJson` items become new line records. Sets `auditStatus = 'audited'`.

**200 response**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "verdict": "overcharged",
      "correctAmount": 775,
      "reason": "Billed for 7 days but only 3 days are chargeable after 4 free days.",
      "confidence": 0.9
    }
  ]
}
```

`400` when the invoice has no line items to audit; `404` when the invoice is not in the caller's company.

See [ARCHITECTURE.md](ARCHITECTURE.md#47-audit-rules-engine) for the rule table.

### `PUT /api/invoices/:id/lines/:lineId/decision`

Customer accept/reject on one flagged line. The invoice must belong to the caller's company and the line must belong to that invoice. Only lines whose verdict is `overcharged` or `invalid` can be decided; `ok` and `skipped` lines return `400`.

**Body**

| Field        | Type   | Required | Notes                      |
| ------------ | ------ | -------- | -------------------------- |
| `decision`   | string | yes      | `accept` or `reject`       |
| `reviewNote` | string | no       | trimmed, saved on the line |

`accept` stores `customerDecision: 'accept'`; `reject` stores `customerDecision: 'reject'`. Both set `customerReviewedBy`/`customerReviewedAt` and mirror the result into the legacy `reviewStatus`. The operator decision is kept separately in `operatorDecision`. `200` returns the saved line; `404` if the invoice or line is not in scope.

---

## 6. Disputes

All dispute routes are company-scoped. Lists and details populate `invoice` (`invoiceNumber`, `carrierName`, `containerNumber`, `port`, `totalBilled`, `currency`) and `lines`.

### `GET /api/disputes`

`200` `{ success, count, total, meta, data: Dispute[] }`, newest first.

### `GET /api/disputes/:id`

`200` `{ success, data: Dispute }`; `404` if the dispute is not in the caller's company.

### `POST /api/disputes`

Creates an empty draft.

| Field            | Type     | Required | Validation     |
| ---------------- | -------- | -------- | -------------- |
| `invoiceId`      | ObjectId | yes      | valid Mongo id |
| `disputedAmount` | number   | no       | float ≥ 0      |
| `notes`          | string   | no       | trimmed        |

`201` `{ success, data: Dispute }` with `status: 'draft'` and `currency` copied from the invoice.

### `POST /api/disputes/letters`

Builds a letter from accepted flags and saves it to the latest draft for that invoice, creating one if necessary. Re-running refreshes the existing draft instead of duplicating letters.

| Field       | Type       | Required | Notes                                           |
| ----------- | ---------- | -------- | ----------------------------------------------- |
| `invoiceId` | ObjectId   | yes      | valid Mongo id, must be in the caller's company |
| `lineIds`   | ObjectId[] | no       | restrict the letter to these accepted flags     |

Eligible lines use the shared `isAcceptedFlag` rule: the verdict must be `overcharged` or `invalid`; a customer rejection or operator rejection always excludes the line; high-confidence flags need either acceptance, while flags at or below `0.7` confidence need both customer acceptance and operator confirmation. Legacy `reviewStatus: 'confirmed'` still works when no split decision exists. `ok`, `skipped` and rejected lines are excluded. If `lineIds` is supplied, every id must resolve to an eligible line on that invoice.

```json
{
  "success": true,
  "data": {
    "dispute": { "_id": "...", "status": "draft", "letterText": "...", "disputedAmount": 480 },
    "letterText": "DISPUTE LETTER — DEMURRAGE / DETENTION CHARGES\n...",
    "flags": []
  }
}
```

`400` when no accepted flag exists or a selected line is ineligible. The browser exports `letterText` as TXT/PDF through `client/lib/letterExport.js`; the server persists the exact same text.

### `PUT /api/disputes/:id/status`

Moves a dispute through its bounded lifecycle:

```text
draft → sent → under_review → won / lost
```

`sent` may go directly to `won` or `lost`; `under_review` may go to `won` or `lost`; `won` and `lost` are terminal. `won` requires an existing recovery record, so cash cannot be implied by an arbitrary status change.

| Field             | Type     | Required | Notes                         |
| ----------------- | -------- | -------- | ----------------------------- |
| `status`          | string   | yes      | one of the dispute enum       |
| `sentAt`          | ISO date | no       | defaults to now on first send |
| `responseDueDate` | ISO date | no       | stored on the dispute         |
| `notes`           | string   | no       | trimmed                       |

`200` with the updated dispute; `400` for an invalid transition or for `won` without a recovery.

### `POST /api/disputes/:id/recovery`

Records recovered cash, creates the fee line item and marks the dispute `won` in one operation.

| Field         | Type     | Required | Validation      |
| ------------- | -------- | -------- | --------------- |
| `amount`      | number   | yes      | float > 0       |
| `recoveredAt` | ISO date | no       | defaults to now |

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "amount": 1000,
    "feePct": 25,
    "feeAmount": 250,
    "billingStatus": "due",
    "dispute": { "status": "won", "invoice": { "invoiceNumber": "TRM-2026-04412" } }
  }
}
```

The fee percentage comes from `company.feePct` or `DEFAULT_FEE_PCT` (25). The calculation is `amount × feePct / 100`, rounded to two decimals. Recovery is only accepted from `sent` or `under_review`; `409` means the dispute already won or cannot be claimed, and `400` means a recovery record already exists or the dispute is lost.

---

## 7. Recoveries

### `GET /api/recoveries`

Company-scoped, newest first, paginated. Each record populates `dispute.status`, `dispute.disputedAmount` and `dispute.invoice` (`invoiceNumber`, `carrierName`). `meta.summary` carries company-wide `amount`, `fees` and `due` totals.

```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "skip": 0,
    "pages": 1,
    "summary": { "amount": 2845, "fees": 711.25, "due": 0 }
  },
  "data": []
}
```

### `GET /api/recoveries/dispute/:disputeId`

Returns `{ success, data: Recovery | null }` for one company-owned dispute; used by the dispute detail panel. `404` is not used for a missing recovery.

### `PUT /api/recoveries/:id/billing` — staff only

| Field           | Type   | Required | Notes           |
| --------------- | ------ | -------- | --------------- |
| `billingStatus` | string | yes      | `due` or `paid` |

Marking a fee `paid` stamps `billedAt`; marking it `due` clears that stamp. `200` with the updated recovery, `403` for `user`, and `404` when a customer requests a recovery outside their company. Staff may bill any tenant. Dashboard `feeDue` sums only recoveries whose `billingStatus` is not `paid`.

---

## 8. Dashboard

### `GET /api/dashboard`

Auth required, company-scoped.

```json
{
  "success": true,
  "data": {
    "kpis": {
      "auditedInvoices": 3,
      "totalInvoices": 5,
      "totalBilled": 4915,
      "flaggedAmount": 1340,
      "recoveredAmount": 2845,
      "recoveryRate": 57.88,
      "feeDue": 711.25,
      "feeRecorded": 711.25,
      "feePct": 25,
      "disputedAmount": 1500,
      "activeDisputes": 4
    },
    "invoices": [
      {
        "id": "...",
        "invoiceNumber": "TRM-2026-04412",
        "carrierName": "TransMarine Lines",
        "totalBilled": 1840,
        "auditStatus": "audited",
        "createdAt": "..."
      }
    ],
    "disputes": []
  }
}
```

`totalBilled` is rounded to two decimals and intentionally matches the sum shown in the invoice table. `disputedAmount` and `feeRecorded` are company-wide totals, so dispute KPIs stay correct while the disputes page is paginated. `weekly[]` holds eight ISO-week buckets built from real recovery dates; the sample values above reflect the seeded demo workspace.

---

## 9. Admin panel

All admin routes require `protect` + `authorize('operator', 'admin')`. User management adds `authorize('admin')`.

### `GET /api/admin/stats`

Platform-wide statistics.

```json
{
  "success": true,
  "data": {
    "users": { "total": 3, "operators": 1, "admins": 1 },
    "companies": 1,
    "invoices": { "total": 5, "audited": 3, "pending": 2, "totalBilled": 4915 },
    "flags": { "total": 4, "flaggedAmount": 1340 },
    "disputes": { "total": 6, "draft": 2, "active": 2, "won": 1, "lost": 1 },
    "recoveries": { "total": 1, "recoveredAmount": 2845, "fees": 711.25 }
  }
}
```

### `GET /api/admin/review-queue`

Paginated flagged lines, lowest confidence first.

| Query       | Type     | Default      | Validation                 |
| ----------- | -------- | ------------ | -------------------------- |
| `status`    | string   | `unreviewed` | one of `reviewStatus` enum |
| `page`      | integer  | `1`          | ≥ 1                        |
| `skip`      | integer  | derived      | ≥ 0                        |
| `limit`     | integer  | `50`         | 1–200                      |
| `invoiceId` | ObjectId | —            | valid Mongo id             |

```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "meta": { "total": 3, "page": 1, "limit": 50, "skip": 0, "pages": 1 },
  "data": [
    {
      "_id": "...",
      "description": "Detention charge",
      "verdict": "overcharged",
      "confidence": 0.6,
      "reviewStatus": "unreviewed",
      "invoice": {
        "invoiceNumber": "MSK-2026-11890",
        "carrierName": "MSC",
        "port": "Port of New York",
        "company": { "name": "Harborline Imports" }
      }
    }
  ]
}
```

### `PUT /api/admin/review/:id`

**Body**

| Field           | Type   | Required | Notes                                 |
| --------------- | ------ | -------- | ------------------------------------- |
| `reviewStatus`  | string | yes      | `unreviewed`, `confirmed`, `rejected` |
| `reviewNote`    | string | no       | trimmed                               |
| `correctAmount` | number | no       | float ≥ 0                             |
| `verdict`       | string | no       | valid verdict enum                    |

Sets `operatorDecision`, `reviewedBy = req.user._id` and `reviewedAt = now`, mirrors the result into `reviewStatus`, then applies any optional fields. Customer accept/reject is set separately through the invoice decision route. `200` with the saved line; `404` if the line does not exist.

### `GET /api/admin/users`

`200` `{ success, count, total, meta, data: User[] }` with `company` populated to `{ name, plan }`, newest first.

### `PUT /api/admin/users/:id` — admin only

**Body (all optional):** `role` (enum), `isActive` (boolean), `name` (non-empty).

`200` with the updated user. `400` if an admin tries to demote or deactivate themselves; `404` if the user does not exist.

### `DELETE /api/admin/users/:id` — admin only

`200` `{ success, message: "User deleted" }`. `400` when deleting yourself; `404` if the user does not exist.

### `DELETE /api/admin/companies/:id` — admin only

Deletes an orphan/test tenant and all of its workspace data: users, contracts, invoices, audit lines, audit jobs, disputes and recoveries. `200` `{ success, message: "Company and workspace data deleted" }`. `400` when deleting your own company; `404` if the company does not exist.

### `GET /api/admin/invoices`

All invoices across companies, with `company` and `contract` populated. `{ success, count, total, meta, data }`; `meta.summary` holds platform-wide `totalBilled` and `audited` counts.

### `GET /api/admin/disputes`

All disputes across companies, with `company` and `invoice` populated. `{ success, count, total, meta, data }`.

### `GET /api/admin/settings`

```json
{
  "success": true,
  "data": {
    "defaultFeePct": 25,
    "staffRoles": ["operator", "admin"],
    "companies": [{ "id": "...", "name": "Harborline Imports", "feePct": 25, "plan": "free" }]
  }
}
```

The fee comes from `DEFAULT_FEE_PCT` (default 25), shared with the seed script and client constants. This list also returns pagination `meta` for the company table.

---

## 10. Client API behavior

`client/lib/api.js` sends every `api.*` call over HTTP to the API base URL in `NEXT_PUBLIC_API_URL`. In real mode (`NEXT_PUBLIC_PREVIEW_MODE=false` or unset) that variable is required: when it is missing, the app shows a configuration error. Failed calls throw and the UI renders the error; there is no silent fallback or mock data. Production uses `https://freightguard-api.vercel.app/api`. The opt-in **preview mode** (`NEXT_PUBLIC_PREVIEW_MODE=true`) bypasses HTTP calls and renders sample data from `client/lib/previewData.js`; it is disabled in production and kept only as a development aid.
