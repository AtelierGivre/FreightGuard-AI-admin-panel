const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInvoiceInput } = require('../utils/invoiceInput');

test('invoice input drops fields owned by the server', () => {
  const payload = buildInvoiceInput({
    invoiceNumber: 'INV-1',
    carrierName: 'MSC',
    port: 'Los Angeles',
    totalBilled: 100,
    auditStatus: 'audited',
    company: 'another-company',
    _id: 'fake-id',
  });

  assert.deepEqual(payload, {
    invoiceNumber: 'INV-1',
    carrierName: 'MSC',
    port: 'Los Angeles',
    totalBilled: 100,
  });
});

test('rawJson lines lose ids and decision fields before the audit runs', () => {
  const payload = buildInvoiceInput({
    rawJson: {
      invoiceNumber: 'INV-1',
      lines: [
        {
          description: 'Demurrage',
          billedAmount: 100,
          _id: 'target-line',
          reviewStatus: 'confirmed',
          verdict: 'ok',
          correctAmount: 100,
        },
      ],
    },
  });

  assert.deepEqual(payload.rawJson.lines, [{ description: 'Demurrage', billedAmount: 100 }]);
});
