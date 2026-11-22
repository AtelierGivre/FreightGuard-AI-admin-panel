const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const generateDisputeLetter = ({ company, invoice, flags }) => {
  const accepted = flags.filter((f) => f.accepted);
  const lines = accepted.map((f) => {
    const billed = round2(f.billedAmount || 0);
    const correct = round2(f.correctAmount || 0);
    const diff = round2(billed - correct);
    return `  - ${f.description || f.feeType}: billed ${billed}, correct ${correct}, difference ${diff}\n    Reason: ${f.reason || 'Charge disputed'}`;
  });

  const totalClaimed = round2(
    accepted.reduce((sum, f) => sum + (round2(f.billedAmount || 0) - round2(f.correctAmount || 0)), 0)
  );

  const today = new Date().toISOString().slice(0, 10);

  return `DISPUTE LETTER — DEMURRAGE / DETENTION CHARGES

Date: ${today}

From:
${company.name}
${company.email || ''}

To:
${invoice.carrierName}
Billing / Claims Department

Re: Invoice ${invoice.invoiceNumber} — Container ${invoice.containerNumber || 'N/A'}
    Port: ${invoice.port}

Dear Sir/Madam,

We are writing to dispute the following charges on the above-referenced invoice. Our audit against the applicable tariff agreement and free-time rules identified the following incorrect charges:

${lines.join('\n\n') || '  (No disputed lines)'}

Total amount claimed: ${totalClaimed} ${invoice.currency || 'USD'}

Please review and issue a credit or refund within 14 days of the date of this letter. If we do not receive a response, we will escalate the matter to the relevant regulatory authority.

Supporting documentation and the full audit report are available on request.

Sincerely,
${company.name}
FreightGuard AI — Audited Report
`;
};

module.exports = { generateDisputeLetter };
