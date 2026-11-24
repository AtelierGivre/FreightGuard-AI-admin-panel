/**
 * Helpers for persisting audit results safely.
 *
 * A line that came from `rawJson.lines` has no persisted `_id`. Treating a
 * missing id as an upsert filter would let MongoDB match an unrelated line, so
 * this module separates "create a new line" from "update an existing line".
 */

const mongoose = require('mongoose');

const buildAuditLinePayload = (line, result, invoiceId) => ({
  invoice: invoiceId,
  feeType: line.feeType || 'demurrage',
  description: line.description,
  days: line.days || 0,
  rate: line.rate || 0,
  billedAmount: line.billedAmount || 0,
  ...result,
});

/**
 * @param {object} line source line (persisted document or rawJson item)
 * @param {object} result rules-engine result
 * @param {string|import('mongoose').Types.ObjectId} invoiceId owning invoice
 * @returns {{ operation: 'create'|'upsert', payload: object, filter?: object }}
 */
const buildAuditLineWrite = (line, result, invoiceId) => {
  const payload = buildAuditLinePayload(line, result, invoiceId);
  // Only a Mongo `_id` means this line is already persisted. A client-supplied
  // `id` in rawJson must never be used as an upsert filter.
  const persistedId = line._id;

  if (persistedId && mongoose.isValidObjectId(persistedId)) {
    return {
      operation: 'upsert',
      filter: { _id: persistedId, invoice: invoiceId },
      payload,
    };
  }

  return { operation: 'create', payload };
};

module.exports = { buildAuditLineWrite, buildAuditLinePayload };
