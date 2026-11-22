/** Shared display formatters. Never put currency arithmetic in a component. */

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as a USD amount, e.g. 1280.5 -> "$1,280.50".
 * @param {number|string|null|undefined} value
 */
export const money = (value) => `$${numberFormatter.format(Number(value) || 0)}`;

/** Format a 0..1 confidence score as an integer percentage. */
export const confidencePct = (value) =>
  value == null ? '—' : `${Math.round(Number(value) * 100)}%`;

/** Build initials from a full name, e.g. "Priya Nair" -> "PN". */
export const initials = (name) =>
  (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Short, locale-stable date label for tables. */
export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
