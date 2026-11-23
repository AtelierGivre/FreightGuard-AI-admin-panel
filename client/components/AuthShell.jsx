import { ShieldCheck, Check, Sparkles } from 'lucide-react';

/**
 * Shared frame for the sign-in and registration screens.
 * The marketing rail is hidden on small screens; the form keeps its own brand mark.
 */
export default function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-aside-brand">
            <div className="logo">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            FreightGuard AI
          </div>

          <div>
            <span className="eyebrow">Demurrage &amp; detention recovery</span>
            <h2>Every overcharge leaves a paper trail.</h2>
            <p>
              Audit carrier invoices line by line against your tariff contracts, flag what does not
              add up, and put low-confidence findings in front of a human reviewer.
            </p>
            <ul className="auth-points">
              <li>
                <Check size={15} /> Rules-based audit with per-line verdicts
              </li>
              <li>
                <Check size={15} /> Operator review before any dispute goes out
              </li>
              <li>
                <Check size={15} /> Fees charged only on money recovered
              </li>
            </ul>
          </div>

          <div className="auth-aside-foot">
            <Sparkles size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Built for teams that pay too much for container dwell time.
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-card">
            <div className="brand">
              <div className="logo">
                <ShieldCheck size={21} aria-hidden="true" />
              </div>
              <strong>FreightGuard AI</strong>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
