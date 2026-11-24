## Summary

<!-- What changed and why? Explain it for a teammate who has not seen the code. -->

## Related issue / scope

<!-- Link the issue (Closes #123). State whether this is in-scope 65% work or unfinished-unit groundwork. -->

- [ ] In-scope 65% unit (1–9, 11–14)
- [ ] Unfinished unit groundwork (10, 15–20)
- [ ] Documentation / tooling only

## Changes

<!-- Bullet the concrete changes by layer. -->

- Frontend:
- Backend:
- Docs / tooling:

## Verification

<!-- Paste the commands you ran. CI must be green before merge. -->

- [ ] `npm run check` (lint + format:check + test + build)
- [ ] `npm audit --audit-level=high`
- [ ] Manual check in live mode (if API/DB behaviour changed)

## Review checklist

- [ ] No secrets, tokens, real customer data or `.env` files are committed.
- [ ] New routes have validation, `protect`/`authorize` and `asyncHandler`.
- [ ] Queries touching user data are scoped to `req.user.company`.
- [ ] Frontend fetch failures are handled with loading/error/retry (`useApiData`).
- [ ] Business numbers come from shared constants (fee `25`, threshold `0.7`).
- [ ] Money formatting uses `client/lib/format.js`; rounding uses `server/src/utils/round.js`.
- [ ] API docs updated if endpoints/response shapes changed.
- [ ] Architecture docs updated if data flow or structure changed.
- [ ] Env vars documented in `.env.example` and `docs/DEVELOPMENT.md` if added.
- [ ] Deferred files were not imported into production code.

## Screenshots / recordings

<!-- Add before/after images for UI changes. Delete this section if not applicable. -->

## Notes for reviewers

<!-- Call out risks, follow-up work, or decisions that need team agreement. -->
