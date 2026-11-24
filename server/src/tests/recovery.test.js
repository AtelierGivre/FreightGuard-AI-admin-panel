const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DISPUTE_TRANSITIONS,
  isFlagged,
  isAcceptedFlag,
  canTransition,
  assertTransition,
  calculateFee,
} = require('../utils/domain');
const { generateDisputeLetter } = require('../utils/letterGenerator');

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
  assert.equal(isAcceptedFlag({ verdict: 'invalid', reviewStatus: 'confirmed' }), true);
  assert.equal(isAcceptedFlag({ verdict: 'invalid', reviewStatus: 'unreviewed' }), false);
  assert.equal(isAcceptedFlag({ verdict: 'ok', reviewStatus: 'confirmed' }), false);
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
        reviewStatus: 'confirmed',
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
