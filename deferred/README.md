# Deferred work (remaining 35%)

The recovery loop has been promoted into the live product: flag accept/reject, dispute letters with TXT/PDF export, dispute status tracking, recovery recording and 25% fee billing are all implemented in `client/app/`, `server/src/` and the deployment.

The stale drafts for units 11–14 have been removed. One file remains:

| File                        | Purpose                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `client/lib/demoData.js`    | Sample data source for the opt-in `NEXT_PUBLIC_PREVIEW_MODE=true` dev aid |

This is not a deferred product unit. It exists only so `client/lib/previewData.js` can re-export sample data for local UI work without maintaining a second sample-data file in `client/lib/`. Production uses the live Express API and MongoDB; preview mode is disabled.

Remaining product units are 10 (real OCR), 15 (charts/analytics/CSV), 16 (email notifications), 17 (payments), 18 (Google OAuth/email verification), 19 (real file storage/hash de-duplication) and the final polish portion of unit 20. See `docs/PROJECT_PLAN.md` for the authoritative breakdown.
