# API Reference — FreightGuard AI

Base URL in local development: `http://localhost:5000/api`

All requests and responses use `application/json`. This document describes the **implemented 45% surface**. Deferred endpoints are listed in [PROJECT_PLAN.md](PROJECT_PLAN.md).

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

Some endpoints return `token` and `user` at the top level (`/auth/register`, `/auth/login`) or `message` instead of `data` (deletes, health).

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

### Authentication

All routes except `/api/health`, `/api/auth/register` and `/api/auth/login` require:

```http
Authorization: Bearer <JWT>
```

The token is returned by `POST /auth/login` or `POST /auth/register`. The frontend stores it in `localStorage` under `fg_token` and sends it automatically through `client/lib/api.js`.

### Role matrix

| Role       | Allowed                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `user`     | Auth, contracts, invoices, dashboard (company-scoped)                   |
| `operator` | Everything a `user` can do + all admin **read** routes and review queue |
| `admin`    | Everything, including user management and settings                      |

Admin user-management routes add an extra `authorize('admin')` guard. An admin cannot demote, deactivate or delete their own account.

### Enum values

| Field            | Values                                         |
| ---------------- | ---------------------------------------------- |
| `role`           | `user`, `operator`, `admin`                    |
| `verdict`        | `ok`, `overcharged`, `invalid`, `skipped`      |
| `reviewStatus`   | `unreviewed`, `confirmed`, `rejected`          |
| `auditStatus`    | `pending`, `processing`, `audited`, `failed`   |
| `dispute.status` | `draft`, `sent`, `under_review`, `won`, `lost` |

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

Returns `{ success, count, data: Invoice[] }` with `contract` populated to `{ carrierName, port }`, newest first.

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

Runs the rules engine on existing lines, or on `rawJson.lines` when no lines exist yet. Saves/upserts the results and sets `auditStatus = 'audited'`.

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

---

## 6. Dashboard

### `GET /api/dashboard`

Auth required, company-scoped.

```json
{
  "success": true,
  "data": {
    "kpis": {
      "auditedInvoices": 4,
      "totalInvoices": 5,
      "totalBilled": 6425.5,
      "flaggedAmount": 930,
      "recoveredAmount": 2845,
      "recoveryRate": 44.28,
      "feeDue": 711.25,
      "activeDisputes": 2
    },
    "invoices": [
      {
        "id": "...",
        "invoiceNumber": "TRM-2026-04412",
        "carrierName": "Maersk",
        "totalBilled": 1275,
        "auditStatus": "audited",
        "createdAt": "..."
      }
    ],
    "disputes": []
  }
}
```

`totalBilled` is rounded to two decimals and intentionally matches the sum shown in the invoice table (this was a cleanup bug fix).

---

## 7. Admin panel

All admin routes require `protect` + `authorize('operator', 'admin')`. User management adds `authorize('admin')`.

### `GET /api/admin/stats`

Platform-wide statistics.

```json
{
  "success": true,
  "data": {
    "users": { "total": 3, "operators": 1, "admins": 1 },
    "companies": 1,
    "invoices": { "total": 5, "audited": 4, "pending": 1, "totalBilled": 6425.5 },
    "flags": { "total": 4, "flaggedAmount": 930 },
    "disputes": { "total": 5, "draft": 1, "active": 2, "won": 1, "lost": 1 },
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
| `limit`     | integer  | `50`         | 1–100                      |
| `invoiceId` | ObjectId | —            | valid Mongo id             |

```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
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

Sets `reviewStatus`, `reviewedBy = req.user._id` and `reviewedAt = now`, then applies any optional fields. `200` with the saved line; `404` if the line does not exist.

### `GET /api/admin/users`

`200` `{ success, count, data: User[] }` with `company` populated to `{ name, plan }`, newest first.

### `PUT /api/admin/users/:id` — admin only

**Body (all optional):** `role` (enum), `isActive` (boolean), `name` (non-empty).

`200` with the updated user. `400` if an admin tries to demote or deactivate themselves; `404` if the user does not exist.

### `DELETE /api/admin/users/:id` — admin only

`200` `{ success, message: "User deleted" }`. `400` when deleting yourself; `404` if the user does not exist.

### `GET /api/admin/invoices`

All invoices across companies, with `company` and `contract` populated. `{ success, count, data }`.

### `GET /api/admin/disputes`

All disputes across companies, with `company` and `invoice` populated. `{ success, count, data }`.

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

The fee comes from `DEFAULT_FEE_PCT` (default 25), shared with the seed script and client constants.

---

## 8. Client API behavior

`client/lib/api.js` sends every `api.*` call over HTTP to the API base URL in `NEXT_PUBLIC_API_URL`. In real mode (`NEXT_PUBLIC_PREVIEW_MODE=false` or unset) that variable is required: when it is missing, the app shows a configuration error. Failed calls throw and the UI renders the error; there is no silent fallback or mock data. **Temporary preview mode** (`NEXT_PUBLIC_PREVIEW_MODE=true`) is an explicit exception that bypasses HTTP calls entirely and renders sample data from `client/lib/previewData.js`; it is temporary and must be removed once the live API is connected.
