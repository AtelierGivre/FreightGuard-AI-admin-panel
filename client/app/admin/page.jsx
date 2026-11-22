'use client';

import { useEffect, useState } from 'react';
import {
  Users, Building2, FileText, AlertTriangle, Scale, BadgeIndianRupee,
  Percent, ClipboardCheck, TrendingUp,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import DataTable from '@/components/DataTable';
import StatusPill from '@/components/StatusPill';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    api.getAdminStats().then((r) => setStats(r.data));
    api.getReviewQueue().then((r) => setQueue(r.data));
  }, []);

  const s = stats || {};

  return (
    <Protected roles={['admin', 'operator']}>
      <Layout title="Admin Overview" subtitle="Platform-wide operations and performance">
        <div className="kpi-grid">
          <KpiCard label="Total users" value={s.users?.total ?? '—'} icon={Users} color="indigo" foot={`${s.users?.operators ?? 0} operators · ${s.users?.admins ?? 0} admins`} />
          <KpiCard label="Companies" value={s.companies ?? '—'} icon={Building2} color="blue" />
          <KpiCard label="Invoices" value={s.invoices?.total ?? '—'} icon={FileText} color="indigo" foot={`${s.invoices?.audited ?? 0} audited · ${s.invoices?.pending ?? 0} pending`} />
          <KpiCard label="Flags raised" value={s.flags?.total ?? '—'} icon={AlertTriangle} color="amber" foot={money(s.flags?.flaggedAmount) + ' flagged'} />
          <KpiCard label="Disputes" value={s.disputes?.total ?? '—'} icon={Scale} color="purple" foot={`${s.disputes?.active ?? 0} active · ${s.disputes?.won ?? 0} won`} />
          <KpiCard label="Recovered" value={money(s.recoveries?.recoveredAmount)} icon={BadgeIndianRupee} color="green" foot={`${money(s.recoveries?.fees)} in fees`} />
        </div>

        <div className="card">
          <div className="card-header"><h3>Operator review queue</h3><span className="pill amber"><ClipboardCheck size={11} /> {queue.length} awaiting review</span></div>
          <DataTable
            columns={[
              { header: 'Invoice', key: 'invoice', render: (r) => <span className="mono strong">{r.invoiceRef?.invoiceNumber || r.invoice?.invoiceNumber || '—'}</span> },
              { header: 'Carrier', key: 'carrier', render: (r) => r.invoiceRef?.carrierName || r.invoice?.carrierName || '—' },
              { header: 'Description', key: 'description' },
              { header: 'Billed', key: 'billedAmount', numeric: true, render: (r) => <span className="num">{money(r.billedAmount)}</span> },
              { header: 'Confidence', key: 'confidence', numeric: true, render: (r) => <span className={`num ${r.confidence < 0.7 ? 'text-indigo' : ''}`}>{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}</span> },
              { header: 'Verdict', key: 'verdict', render: (r) => <StatusPill value={r.verdict} /> },
              { header: 'Review', key: 'reviewStatus', render: (r) => <StatusPill value={r.reviewStatus} /> },
            ]}
            rows={queue.slice(0, 8)}
          />
        </div>
      </Layout>
    </Protected>
  );
}
