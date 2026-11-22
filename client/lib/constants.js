/**
 * Shared client-side constants.
 * Business numbers live here so labels, fallbacks and thresholds stay in sync
 * with the server (server/src/config/constants.js).
 */

/** Contingency fee charged only on money actually recovered. */
export const DEFAULT_FEE_PCT = 25;

/** Flags at or below this confidence are highlighted for operator review. */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

export const ROLES = Object.freeze({
  USER: 'user',
  OPERATOR: 'operator',
  ADMIN: 'admin',
});

/** Roles that may access the admin panel. */
export const STAFF_ROLES = Object.freeze([ROLES.OPERATOR, ROLES.ADMIN]);

/** localStorage key used for the JWT. */
export const TOKEN_KEY = 'fg_token';
