const COLORS = {
  indigo: { bg: '#eef2ff', fg: '#4f46e5' },
  blue: { bg: '#eff6ff', fg: '#3b82f6' },
  green: { bg: '#ecfdf5', fg: '#10b981' },
  amber: { bg: '#fffbeb', fg: '#f59e0b' },
  red: { bg: '#fef2f2', fg: '#ef4444' },
  purple: { bg: '#f5f3ff', fg: '#8b5cf6' },
};

/** Compact metric tile with a colour-coded accent and optional loading skeleton. */
export default function KpiCard({ label, value, icon: Icon, color = 'indigo', foot, loading }) {
  const c = COLORS[color] || COLORS.indigo;
  return (
    <div className="kpi-card" style={{ '--kpi-color': c.fg }}>
      <div className="kpi-top">
        <div>
          <div className="kpi-label">{label}</div>
          {loading ? (
            <div className="skeleton skeleton-value" aria-label="Loading value" />
          ) : (
            <div className="kpi-value">{value}</div>
          )}
        </div>
        <div className="kpi-icon" style={{ background: c.bg, color: c.fg }}>
          <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
        </div>
      </div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}
