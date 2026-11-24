/** Domain rules shared by controllers. Pure functions only — safe to unit test. */

const { round2 } = require('./round');

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

/** A flag is eligible for a dispute only after a user or operator accepted it. */
const isAcceptedFlag = (line) =>
  isFlagged(line) && (line.reviewStatus === 'confirmed' || line.accepted === true);

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
  isFlagged,
  isAcceptedFlag,
  canTransition,
  assertTransition,
  calculateFee,
};
