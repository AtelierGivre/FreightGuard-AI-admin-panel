/**
 * FreightGuard AI — Demurrage & Detention Rules Engine
 * Applies the verdict rules from PRD section F5 to each invoice line.
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const findTier = (tiers = [], day) => {
  const tier = tiers.find((t) => day >= t.dayFrom && day <= t.dayTo);
  return tier ? tier.rate : null;
};

const auditLine = (line, contract) => {
  const { days = 0, rate = 0, billedAmount = 0, feeType = 'demurrage' } = line;

  // Rule 5: No contract -> Skipped
  if (!contract) {
    return {
      verdict: 'skipped',
      correctAmount: null,
      reason: 'No matching tariff contract found for this carrier and port.',
      confidence: 0.5,
    };
  }

  const freeDays = contract.freeDays ?? 0;
  const tiers = contract.tiers || [];
  const chargeableDays = Math.max(0, days - freeDays);

  // Rule 1: Free time OK — billed within free allowance
  if (days <= freeDays) {
    return {
      verdict: 'invalid',
      correctAmount: 0,
      reason: `Days billed (${days}) are within the free time allowance (${freeDays}). No charge is due.`,
      confidence: 0.95,
    };
  }

  // Rule 2: Wrong day count
  const expectedRate = findTier(tiers, days) ?? rate;
  const correctForDays = round2(expectedRate * chargeableDays);
  if (billedAmount > correctForDays + 0.01 && chargeableDays < days) {
    return {
      verdict: 'overcharged',
      correctAmount: correctForDays,
      reason: `Billed for ${days} days but only ${chargeableDays} days are chargeable after ${freeDays} free days.`,
      confidence: 0.9,
    };
  }

  // Rule 3: Wrong rate
  const tierRate = findTier(tiers, days);
  if (tierRate !== null && Math.abs(rate - tierRate) > 0.01) {
    const correct = round2(tierRate * chargeableDays);
    return {
      verdict: correct === 0 ? 'invalid' : 'overcharged',
      correctAmount: correct,
      reason: `Applied rate ${rate} does not match the contract tier rate ${tierRate} for day ${days}.`,
      confidence: 0.88,
    };
  }

  // Rule 4: Duplicate charge (handled at invoice level, see auditInvoice)
  // Rule 6: OK
  return {
    verdict: 'ok',
    correctAmount: round2(billedAmount),
    reason: 'Charge matches the contract terms and free time rules.',
    confidence: 0.92,
  };
};

const auditInvoice = (lines, contract) => {
  const seen = new Set();
  return lines.map((line) => {
    const key = `${line.feeType}|${line.description || ''}|${line.billedDateStart || ''}`;
    const result = auditLine(line, contract);

    if (seen.has(key)) {
      return {
        ...result,
        verdict: 'invalid',
        correctAmount: 0,
        reason: 'Duplicate charge: same fee type and description appears more than once on this invoice.',
        confidence: 0.93,
      };
    }
    seen.add(key);
    return result;
  });
};

module.exports = { auditLine, auditInvoice, round2 };
