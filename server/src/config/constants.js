/**
 * Shared server-side domain constants.
 *
 * These values are referenced by controllers and the audit engine. Keep them
 * here so a change to business rules only has to be made in one place.
 */

/** Contingency fee charged on money actually recovered (percent). */
const DEFAULT_FEE_PCT = Number(process.env.DEFAULT_FEE_PCT || 25);

/** Flags at or below this confidence should be reviewed by an operator. */
const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

/** Roles recognised by the API, ordered from least to most privileged. */
const ROLES = Object.freeze({
  USER: 'user',
  OPERATOR: 'operator',
  ADMIN: 'admin',
});

/** Roles allowed to see the admin panel (read-only oversight for operators). */
const STAFF_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.ADMIN]);

/** Allowed values for Mongoose enum fields. Reuse in validation chains. */
const ENUMS = Object.freeze({
  VERDICT: ['ok', 'overcharged', 'invalid', 'skipped'],
  REVIEW_STATUS: ['unreviewed', 'confirmed', 'rejected'],
  AUDIT_STATUS: ['pending', 'processing', 'audited', 'failed'],
  DISPUTE_STATUS: ['draft', 'sent', 'under_review', 'won', 'lost'],
  ROLE: Object.values(ROLES),
});

module.exports = {
  DEFAULT_FEE_PCT,
  REVIEW_CONFIDENCE_THRESHOLD,
  ROLES,
  STAFF_ROLES,
  ENUMS,
};
