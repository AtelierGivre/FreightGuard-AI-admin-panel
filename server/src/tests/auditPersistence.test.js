const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { buildAuditLineWrite } = require('../utils/auditPersistence');

const invoiceId = new mongoose.Types.ObjectId();
const result = { verdict: 'overcharged', correctAmount: 720, confidence: 0.9 };

test('rawJson lines are created, not upserted with an undefined id', () => {
  const write = buildAuditLineWrite(
    { feeType: 'demurrage', description: 'Demurrage days 1-10', billedAmount: 1200, days: 10 },
    result,
    invoiceId,
  );

  assert.equal(write.operation, 'create');
  assert.equal(write.filter, undefined);
  assert.equal(write.payload.invoice, invoiceId);
  assert.equal(write.payload.correctAmount, 720);
  assert.equal(write.payload.billedAmount, 1200);
});

test('a client-supplied id is not treated as a persisted line', () => {
  const write = buildAuditLineWrite({ id: 'line-1', billedAmount: 100 }, result, invoiceId);

  assert.equal(write.operation, 'create');
  assert.equal(write.filter, undefined);
});

test('persisted lines are updated only inside their own invoice', () => {
  const lineId = new mongoose.Types.ObjectId();
  const write = buildAuditLineWrite(
    { _id: lineId, billedAmount: 100, invoice: invoiceId },
    result,
    invoiceId,
  );

  assert.equal(write.operation, 'upsert');
  assert.deepEqual(write.filter, { _id: lineId, invoice: invoiceId });
  assert.equal(write.payload.invoice, invoiceId);
});
