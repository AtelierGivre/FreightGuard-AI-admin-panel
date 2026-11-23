import Link from 'next/link';
import {
  ShieldCheck,
  FileSearch,
  FileSignature,
  ClipboardCheck,
  ArrowRight,
  ArrowUpRight,
  ListChecks,
  BadgeCheck,
  Gauge,
} from 'lucide-react';
import { api } from '@/lib/api';

const steps = [
  {
    icon: FileSearch,
    title: 'Bring in the invoice',
    desc: 'Add carrier invoice lines, port and container details — or upload a statement for review.',
  },
  {
    icon: ListChecks,
    title: 'Audit against the tariff',
    desc: 'Free days, rates and duplicate charges are checked line by line against the signed contract.',
  },
  {
    icon: BadgeCheck,
    title: 'Recover with a paper trail',
    desc: 'Low-confidence flags go to an operator first. Confirmed findings become a defensible dispute.',
  },
];

const features = [
  {
    icon: FileSearch,
    title: 'Line-by-line verdicts',
    desc: 'Every charge is marked OK, overcharged or invalid — with the rule and reasoning attached.',
  },
  {
    icon: FileSignature,
    title: 'One source of truth',
    desc: 'Tariff contracts hold rates, free days and calendar rules so no invoice is judged by guesswork.',
  },
  {
    icon: ClipboardCheck,
    title: 'Human review gate',
    desc: 'Nothing goes out to a carrier until an operator confirms the finding and its confidence.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <div className="logo">
              <ShieldCheck size={19} aria-hidden="true" />
            </div>
            <span>
              FreightGuard AI
              <small>Recovery desk</small>
            </span>
          </Link>
          <div className="landing-nav-links">
            {api.isPreview && (
              <span className="preview-chip">
                <span className="dot" /> Preview build
              </span>
            )}
            <Link href="#how">How it works</Link>
            <Link href="#features">Features</Link>
            <Link
              href="https://github.com/AtelierGivre/FreightGuard-AI-admin-panel"
              className="source-link"
            >
              Source <ArrowUpRight size={13} />
            </Link>
            <Link href="/login" className="btn btn-outline btn-sm">
              Open app <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="landing-main">
        <header className="hero">
          <span className="eyebrow">Container demurrage &amp; detention recovery</span>
          <h1>
            Find the charges that <span>don&apos;t add up.</span>
          </h1>
          <p>
            FreightGuard audits every invoice line against your tariff contract, flags what is
            wrong, and routes low-confidence findings to a human reviewer. No recovery, no fee.
          </p>
          <div className="cta">
            <Link href="/login" className="btn btn-primary">
              {api.isPreview ? 'Open preview' : 'Open workspace'} <ArrowRight size={16} />
            </Link>
            <Link href="#how" className="btn btn-outline">
              See how it works
            </Link>
          </div>
          <div className="hero-meta">
            <span>Rules engine</span>
            <span>Operator review</span>
            <span>Auditable disputes</span>
          </div>
        </header>

        <section id="how" className="landing-section">
          <div className="section-head">
            <span className="mono-label">How it works</span>
            <h2>From invoice to recovery in three steps.</h2>
            <p>Built for the boring, high-stakes work of proving a carrier got the number wrong.</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className="step-card" key={step.title}>
                  <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                  <div className="step-icon">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="section-head">
            <span className="mono-label">Built for the dispute</span>
            <h2>Every flag has a reason.</h2>
            <p>
              No black-box scores. Each finding carries the rule, the billed amount and the fix.
            </p>
          </div>
          <div className="features">
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
          </div>
        </section>

        <section className="cta-band">
          <div>
            <span className="mono-label">Ready when you are</span>
            <h2>Open the workspace.</h2>
            <p>
              {api.isPreview
                ? 'Explore the workspace with sample records while the live API is being connected.'
                : 'Sign in with your team account to audit invoices, review flags and manage disputes.'}
            </p>
          </div>
          <Link href="/login" className="btn btn-primary">
            {api.isPreview ? 'Open preview' : 'Open workspace'} <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <footer className="landing-foot">
        <span>© {new Date().getFullYear()} FreightGuard AI · Demurrage recovery workspace</span>
        <span>
          <Gauge size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
          {api.isPreview
            ? 'Preview build · sample data · backend pending'
            : 'Rules-based audit · Operator-reviewed disputes'}
        </span>
      </footer>
    </div>
  );
}
