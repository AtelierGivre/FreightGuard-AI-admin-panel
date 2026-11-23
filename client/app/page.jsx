import Link from 'next/link';
import {
  ShieldCheck,
  FileSearch,
  FileSignature,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const features = [
  {
    icon: FileSearch,
    title: 'Invoice audit',
    desc: 'Rules engine checks free days, rates and duplicates against your contract and flags wrong charges.',
  },
  {
    icon: FileSignature,
    title: 'Tariff contracts',
    desc: 'Store carrier rates, free days and calendar rules once. Every invoice is checked against them.',
  },
  {
    icon: ClipboardCheck,
    title: 'Operator review',
    desc: 'Low-confidence flags are routed to a human reviewer before anything goes out to a carrier.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav>
        <div className="brand">
          <div className="logo">
            <ShieldCheck size={19} aria-hidden="true" />
          </div>
          FreightGuard AI
        </div>
        <div className="landing-nav-links">
          <Link href="/login">Product tour</Link>
          <Link href="/login">Docs</Link>
          <Link href="/login" className="btn btn-outline btn-sm">
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <div className="badge">
            <span className="dot" /> Container demurrage &amp; detention recovery
          </div>
          <h1>
            Find the charges that <span>don&apos;t add up.</span>
          </h1>
          <p>
            Upload an invoice. We audit every line against your tariff contract and flag what is
            wrong. Low-confidence findings go to an operator for review. No recovery, no fee.
          </p>
          <div className="cta">
            <Link href="/register" className="btn btn-primary">
              Start free audit <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-outline">
              Explore the demo
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <strong>Line-by-line</strong> audit trail
            </span>
            <span className="sep" />
            <span>
              <strong>Human</strong> review gate
            </span>
            <span className="sep" />
            <span>
              <strong>25%</strong> fee on recovery only
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="preview-card">
            <div className="preview-top">
              <i />
              <i />
              <i />
              <span>FreightGuard / Recovery dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-kpis">
                <div className="preview-kpi">
                  <small>Flagged</small>
                  <strong>$1,840</strong>
                </div>
                <div className="preview-kpi">
                  <small>Recovered</small>
                  <strong>$2,845</strong>
                </div>
                <div className="preview-kpi">
                  <small>Recovery rate</small>
                  <strong>58%</strong>
                </div>
              </div>
              <div className="preview-lines">
                <div className="preview-line">
                  <span className="name">
                    Demurrage days 1–10
                    <small>TransMarine Lines · TRM-2026-04412</small>
                  </span>
                  <span className="pill amber">Overcharged</span>
                </div>
                <div className="preview-line">
                  <span className="name">
                    Detention days 1–7
                    <small>Maersk · MSK-2026-11890</small>
                  </span>
                  <span className="pill blue">In review</span>
                </div>
                <div className="preview-line">
                  <span className="name">
                    Duplicate demurrage
                    <small>Hapag-Lloyd · HPL-2026-09331</small>
                  </span>
                  <span className="pill green">Confirmed</span>
                </div>
              </div>
              <div className="preview-bars">
                <i style={{ height: '34%' }} />
                <i style={{ height: '55%' }} />
                <i style={{ height: '42%' }} />
                <i style={{ height: '72%' }} />
                <i style={{ height: '58%' }} />
                <i style={{ height: '90%' }} />
                <i style={{ height: '68%' }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div className="feature" key={feature.title}>
              <div className="icon">
                <Icon size={20} aria-hidden="true" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          );
        })}
      </section>

      <footer className="landing-foot">
        <span>© {new Date().getFullYear()} FreightGuard AI · Demurrage recovery workspace</span>
        <span>
          <CheckCircle2 size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          No recovery, no fee
        </span>
      </footer>
    </div>
  );
}
