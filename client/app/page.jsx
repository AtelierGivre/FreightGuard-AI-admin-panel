import Link from 'next/link';
import { ShieldCheck, FileSearch, FileSignature, ClipboardCheck, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="landing">
      <nav>
        <div className="brand"><div className="logo"><ShieldCheck size={19} /></div> FreightGuard AI</div>
        <Link href="/login" className="btn btn-outline btn-sm">Sign in <ArrowRight size={14} /></Link>
      </nav>
      <div className="hero">
        <div className="badge">Container Demurrage & Detention Recovery</div>
        <h1>Find the charges that <span>don't add up.</span></h1>
        <p>Upload an invoice. We audit every line against your tariff contract and flag what is wrong. Low-confidence findings go to an operator for review. No recovery, no fee.</p>
        <div className="cta">
          <Link href="/register" className="btn btn-primary">Start free audit <ArrowRight size={16} /></Link>
          <Link href="/login" className="btn btn-outline">View demo dashboard</Link>
        </div>
      </div>
      <div className="features">
        {[
          { icon: FileSearch, title: 'Invoice audit', desc: 'Rules engine checks free days, rates and duplicates against your contract and flags wrong charges.' },
          { icon: FileSignature, title: 'Tariff contracts', desc: 'Store carrier rates, free days and calendar rules once. Every invoice is checked against them.' },
          { icon: ClipboardCheck, title: 'Operator review queue', desc: 'Low-confidence flags are routed to an admin panel for human review before anything goes out.' },
        ].map((f, i) => (
          <div className="feature" key={i}>
            <div className="icon"><f.icon size={20} /></div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
