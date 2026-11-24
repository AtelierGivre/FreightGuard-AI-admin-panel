/**
 * Plain-text dispute letter generator.
 *
 * Kept as a pure function so the controller can persist the same text that the
 * client exports as TXT/PDF. No database or network access lives here.
 */

const { round2 } = require('./round');
const { isAcceptedFlag } = require('./domain');

const describeLine = (line) => {
  const billed = round2(line.billedAmount || 0);
  const correct = round2(line.correctAmount || 0);
  const difference = round2(billed - correct);
  const description = line.description || line.feeType || 'Charge';
  return (
    `  - ${description}: billed ${billed}, correct ${correct}, difference ${difference}\n` +
    `    Reason: ${line.reason || 'Charge disputed'}`
  );
};

/**
 * @param {{company: object, invoice: object, flags: Array, contract?: object}} input
 * @returns {string} letter text
 */
const generateDisputeLetter = ({ company = {}, invoice = {}, flags = [], contract } = {}) => {
  const accepted = flags.filter(isAcceptedFlag);
  const currency = invoice.currency || 'USD';
  const today = new Date().toISOString().slice(0, 10);

  const detail = accepted.map(describeLine).join('\n\n') || '  (No accepted flags found)';
  const totalClaimed = round2(
    accepted.reduce(
      (sum, line) => sum + round2(line.billedAmount || 0) - round2(line.correctAmount || 0),
      0,
    ),
  );

  const contractLine = contract?.carrierName
    ? `\n    Tariff reference: ${contract.carrierName} / ${contract.port || 'port not specified'}\n`
    : '';

  return `DISPUTE LETTER — DEMURRAGE / DETENTION CHARGES

Date: ${today}

From:
${company.name || 'Shipper'}
${company.email || ''}

To:
${invoice.carrierName || 'Carrier'}
Billing / Claims Department

Re: Invoice ${invoice.invoiceNumber || 'N/A'} — Container ${invoice.containerNumber || 'N/A'}
    Port: ${invoice.port || 'N/A'}
${contractLine}
Dear Sir/Madam,

We are writing to dispute the following charges on the above-referenced invoice. Our audit against the applicable tariff agreement and free-time rules identified the following incorrect charges:

${detail}

Total amount claimed: ${totalClaimed} ${currency}

Please review and issue a credit or refund within 14 days of the date of this letter. If we do not receive a response, we will escalate the matter to the relevant regulatory authority.

Supporting documentation and the full audit report are available on request.

Sincerely,
${company.name || 'Shipper'}
FreightGuard AI — Audited Report
`;
};

module.exports = { generateDisputeLetter };
