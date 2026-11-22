/**
 * Round a number to two decimal places (money / percentages).
 * Uses Number.EPSILON to avoid floating-point artefacts such as 1.005 -> 1.00.
 *
 * @param {number} value
 * @returns {number}
 */
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

module.exports = { round2 };
