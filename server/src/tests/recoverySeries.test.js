const test = require('node:test');
const assert = require('node:assert/strict');
const { weeklyRecoverySeries } = require('../utils/recoverySeries');

test('dashboard weekly series always returns eight buckets', () => {
  const series = weeklyRecoverySeries([], 8, new Date('2026-11-25T12:00:00Z'));
  assert.equal(series.length, 8);
  assert.ok(series.every((week) => week.recovered === 0 && week.invoices === 0));
});

test('dashboard weekly series buckets recoveries by ISO week', () => {
  const series = weeklyRecoverySeries(
    [{ amount: 2845, recoveredAt: new Date('2026-10-20T10:00:00Z') }],
    8,
    new Date('2026-11-25T12:00:00Z'),
  );
  const withRecovery = series.filter((week) => week.recovered > 0);
  assert.equal(withRecovery.length, 1);
  assert.equal(withRecovery[0].recovered, 2845);
  assert.equal(withRecovery[0].invoices, 1);
});
