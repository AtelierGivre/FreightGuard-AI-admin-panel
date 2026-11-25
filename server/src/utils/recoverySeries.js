const { round2 } = require('./round');

const startOfIsoWeek = (value) => {
  const date = new Date(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset),
  );
};

const isoWeekNumber = (value) => {
  const date = new Date(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - mondayOffset + 3),
  );
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const yearStartOffset = (yearStart.getUTCDay() + 6) % 7;
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartOffset + 3);
  return 1 + Math.round((thursday - yearStart) / (7 * 24 * 60 * 60 * 1000));
};

/** Build a fixed-length weekly series so the dashboard chart is never empty. */
const weeklyRecoverySeries = (recoveries = [], weekCount = 8, now = new Date()) => {
  const currentMonday = startOfIsoWeek(now);
  const buckets = [];

  for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
    const monday = new Date(currentMonday);
    monday.setUTCDate(monday.getUTCDate() - offset * 7);
    buckets.push({
      key: monday.toISOString().slice(0, 10),
      week: `W${isoWeekNumber(monday)}`,
      recovered: 0,
      invoices: 0,
    });
  }

  for (const recovery of recoveries) {
    const key = startOfIsoWeek(recovery.recoveredAt || recovery.createdAt)
      .toISOString()
      .slice(0, 10);
    const bucket = buckets.find((item) => item.key === key);
    if (!bucket) continue;
    bucket.recovered = round2(bucket.recovered + (Number(recovery.amount) || 0));
    bucket.invoices += 1;
  }

  return buckets;
};

module.exports = { weeklyRecoverySeries };
