/** Whitelist client-controlled invoice fields and sanitise imported line data. */

const INVOICE_FIELDS = Object.freeze([
  'invoiceNumber',
  'carrierName',
  'port',
  'containerNumber',
  'billedDateStart',
  'billedDateEnd',
  'totalBilled',
  'currency',
  'contract',
  'fileUrl',
  'fileName',
  'fileHash',
  'rawJson',
]);

// These fields are owned by the audit engine or by decision endpoints. They
// must never be accepted from an uploaded JSON document.
const RAW_LINE_DENIED_FIELDS = new Set([
  '_id',
  'id',
  'invoice',
  'company',
  'reviewStatus',
  'reviewedBy',
  'reviewedAt',
  'customerDecision',
  'customerReviewedBy',
  'customerReviewedAt',
  'operatorDecision',
  'operatorReviewedBy',
  'operatorReviewedAt',
  'verdict',
  'correctAmount',
  'reason',
  'confidence',
]);

const sanitizeRawJson = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

  const copy = JSON.parse(JSON.stringify(raw));
  if (Array.isArray(copy.lines)) {
    copy.lines = copy.lines.map((line) => {
      if (!line || typeof line !== 'object') return line;
      return Object.fromEntries(
        Object.entries(line).filter(([key]) => !RAW_LINE_DENIED_FIELDS.has(key)),
      );
    });
  }
  return copy;
};

const buildInvoiceInput = (body = {}) => {
  const payload = {};
  for (const field of INVOICE_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  if (payload.rawJson !== undefined) payload.rawJson = sanitizeRawJson(payload.rawJson);
  return payload;
};

module.exports = { INVOICE_FIELDS, buildInvoiceInput, sanitizeRawJson };
