/** Domain rules shared by controllers. Pure functions only — safe to unit test. */

const { round2 } = require('./round');
const { REVIEW_CONFIDENCE_THRESHOLD } = require('../config/constants');

/** Dispute states from which cash recovery may be recorded. */
const RECOVERY_ALLOWED_STATUSES = Object.freeze(['sent', 'under_review']);

/** Allowed dispute transitions. Recovery recording is the only path into `won`. */
const DISPUTE_TRANSITIONS = Object.freeze({
  draft: ['sent'],
  sent: ['under_review', 'won', 'lost'],
  under_review: ['won', 'lost'],
  won: [],
  lost: [],
});

/** A line is a flag when the audit found a real problem, not an OK/skipped line. */
const isFlagged = (line) => Boolean(line) && line.verdict !== 'ok' && line.verdict !== 'skipped';

/**
 * A flag is dispute eligible when the customer accepted it and no reviewer
 * rejected it. Low-confidence flags need both the customer and operator.
 * Legacy reviewStatus values are honoured only when no split decision exists.
 */
const isAcceptedFlag = (line) => {
  if (!isFlagged(line)) return false;

  const legacyAccepted =
    !line.customerDecision && !line.operatorDecision && line.reviewStatus === 'confirmed';
  const customerAccepted = line.customerDecision === 'accept' || legacyAccepted;
  const operatorAccepted = line.operatorDecision === 'confirmed' || legacyAccepted;

  if (line.customerDecision === 'reject' || line.operatorDecision === 'rejected') return false;

  const needsOperator =
    typeof line.confidence === 'number' && line.confidence <= REVIEW_CONFIDENCE_THRESHOLD;
  return needsOperator
    ? customerAccepted && operatorAccepted
    : customerAccepted || operatorAccepted;
};

/** Keep the legacy reviewStatus field readable for older UI and reports. */
const syncReviewStatus = (line) => {
  if (line.operatorDecision) line.reviewStatus = line.operatorDecision;
  else if (line.customerDecision) {
    line.reviewStatus = line.customerDecision === 'accept' ? 'confirmed' : 'rejected';
  } else {
    line.reviewStatus = 'unreviewed';
  }
  return line;
};

const canTransition = (from, to) => Boolean(DISPUTE_TRANSITIONS[from]?.includes(to));

const assertTransition = (from, to) => {
  if (canTransition(from, to)) return;
  const allowed = DISPUTE_TRANSITIONS[from] || [];
  const error = new Error(
    allowed.length
      ? `Cannot move dispute from ${from} to ${to}. Allowed: ${allowed.join(', ')}`
      : `Dispute is already ${from} and cannot be changed`,
  );
  error.statusCode = 400;
  throw error;
};

/** Contingency fee: company feePct is an integer percentage (25 = 25%). */
const calculateFee = (amount, feePct) => round2((Number(amount) * Number(feePct)) / 100);

module.exports = {
  DISPUTE_TRANSITIONS,
  RECOVERY_ALLOWED_STATUSES,
  isFlagged,
  isAcceptedFlag,
  syncReviewStatus,
  canTransition,
  assertTransition,
  calculateFee,
};
