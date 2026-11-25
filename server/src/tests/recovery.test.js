const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DISPUTE_TRANSITIONS,
  RECOVERY_ALLOWED_STATUSES,
  isFlagged,
  isAcceptedFlag,
  syncReviewStatus,
  canTransition,
  assertTransition,
  calculateFee,
} = require('../utils/domain');
const { generateDisputeLetter } = require('../utils/letterGenerator');
const Recovery = require('../models/Recovery');

test('a recovery can only be recorded from a sent or reviewed dispute', () => {
  assert.deepEqual(RECOVERY_ALLOWED_STATUSES, ['sent', 'under_review']);
  assert.deepEqual(Recovery.schema.indexes().find(([fields]) => fields.dispute === 1)[1], {
    unique: true,
    background: true,
  });
});

test('fee is a percentage of recovered cash', () => {
  assert.equal(calculateFee(2845, 25), 711.25);
  assert.equal(calculateFee(100, 12.5), 12.5);
  assert.equal(calculateFee(0, 25), 0);
});

test('dispute transitions are bounded', () => {
  assert.equal(canTransition('draft', 'sent'), true);
  assert.equal(canTransition('sent', 'under_review'), true);
  assert.equal(canTransition('under_review', 'won'), true);
  assert.equal(canTransition('draft', 'won'), false);
  assert.equal(canTransition('won', 'sent'), false);
  assert.throws(() => assertTransition('draft', 'won'), /Cannot move dispute/);
  assert.equal(DISPUTE_TRANSITIONS.lost.length, 0);
});

test('only accepted, non-skipped flags are dispute eligible', () => {
  assert.equal(isFlagged({ verdict: 'overcharged' }), true);
  assert.equal(isFlagged({ verdict: 'skipped' }), false);
  assert.equal(isAcceptedFlag({ verdict: 'invalid', customerDecision: 'accept' }), true);
  assert.equal(isAcceptedFlag({ verdict: 'invalid' }), false);
  assert.equal(isAcceptedFlag({ verdict: 'ok', customerDecision: 'accept' }), false);
  assert.equal(isAcceptedFlag({ verdict: 'invalid', reviewStatus: 'confirmed' }), true);
});

test('operator rejection wins over customer acceptance', () => {
  const line = { verdict: 'invalid', confidence: 0.92, customerDecision: 'accept' };
  assert.equal(isAcceptedFlag(line), true);
  assert.equal(isAcceptedFlag({ ...line, operatorDecision: 'rejected' }), false);
  assert.equal(isAcceptedFlag({ ...line, customerDecision: 'reject' }), false);
});

test('low-confidence flags need both customer and operator approval', () => {
  const line = { verdict: 'invalid', confidence: 0.68, customerDecision: 'accept' };
  assert.equal(isAcceptedFlag(line), false);
  assert.equal(isAcceptedFlag({ ...line, operatorDecision: 'confirmed' }), true);
});

test('a high-confidence operator confirmation is enough on its own', () => {
  assert.equal(
    isAcceptedFlag({ verdict: 'overcharged', confidence: 0.92, operatorDecision: 'confirmed' }),
    true,
  );
});

test('customer and operator decisions stay in separate fields', () => {
  const line = { verdict: 'invalid', confidence: 0.9, customerDecision: 'accept' };
  syncReviewStatus(line);
  assert.equal(line.reviewStatus, 'confirmed');

  line.operatorDecision = 'rejected';
  syncReviewStatus(line);
  assert.equal(line.customerDecision, 'accept');
  assert.equal(line.operatorDecision, 'rejected');
  assert.equal(line.reviewStatus, 'rejected');
  assert.equal(isAcceptedFlag(line), false);
});

test('letter includes only accepted flags and totals the claim', () => {
  const letter = generateDisputeLetter({
    company: { name: 'Harborline Imports', email: 'ops@harborline.com' },
    invoice: {
      carrierName: 'TransMarine Lines',
      invoiceNumber: 'TRM-1',
      containerNumber: 'TCLU-1',
      port: 'Los Angeles',
      currency: 'USD',
    },
    contract: { carrierName: 'TransMarine Lines', port: 'Los Angeles' },
    flags: [
      {
        feeType: 'demurrage',
        description: 'Demurrage days 1-10',
        billedAmount: 1200,
        correctAmount: 720,
        reason: 'Free days applied',
        verdict: 'overcharged',
        customerDecision: 'accept',
      },
      {
        feeType: 'detention',
        description: 'Not accepted',
        billedAmount: 100,
        correctAmount: 0,
        verdict: 'invalid',
        reviewStatus: 'unreviewed',
      },
    ],
  });

  assert.match(letter, /TRM-1/);
  assert.match(letter, /Demurrage days 1-10/);
  assert.match(letter, /difference 480/);
  assert.match(letter, /Total amount claimed: 480 USD/);
  assert.doesNotMatch(letter, /Not accepted/);
});
