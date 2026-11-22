'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BadgeIndianRupee, AlertTriangle, CircleDollarSign, Percent, Clock } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => { api.getDashboard().then((r) => setData(r.data)); }, []);
  const k = data?.kpis || {};

  return (
    <Protected>
      <Layout title="Dashboard" subtitle="Your recovery workspace at a glance">
        <div className="kpi-grid">
          <KpiCard label="Audited invoices" value={k.auditedInvoices ?? '—'} icon={FileText} color="indigo" foot={`${k.totalInvoices ?? 0} total invoices`} />
          <KpiCard label="Total billed" value={money(k.totalBilled)} icon={BadgeIndianRupee} color="blue" foot="Across all invoices" />
          <KpiCard label="Flagged amount" value={money(k.flaggedAmount)} icon={AlertTriangle} color="amber" foot="Potentially recoverable" />
          <KpiCard label="Recovered" value={money(k.recoveredAmount)} icon={CircleDollarSign} color="green" foot={`${k.recoveryRate ?? 0}% recovery rate`} />
          <KpiCard label="Fee due (25%)" value={money(k.feeDue)} icon={Percent} color="purple" foot="Billed on recovery only" />
          <KpiCard label="Pending audits" value={(k.totalInvoices ?? 0) - (k.auditedInvoices ?? 0)} icon={Clock} color="indigo" foot="Awaiting rules engine" />
        </div>

        <div className="card mb-22">
          <div className="card-header"><h3>Recent invoices</h3><button className="btn btn-outline btn-sm" onClick={() => router.push('/invoices')}>View all</button></div>
          <DataTable
            columns={[
              { header: 'Invoice #', key: 'invoiceNumber', render: (r) => <span className="strong mono">{r.invoiceNumber}</span> },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Billed', key: 'totalBilled', numeric: true, render: (r) => <span className="num strong">{money(r.totalBilled)}</span> },
              { header: 'Status', key: 'auditStatus', render: (r) => <StatusPill value={r.auditStatus} /> },
            ]}
            rows={data?.invoices || []}
          />
        </div>

        <div className="card">
          <div className="card-header"><h3>Quick actions</h3></div>
          <div className="card-body flex gap-12">
            <button className="btn btn-outline" onClick={() => router.push('/invoices')}>Audit an invoice</button>
            <button className="btn btn-outline" onClick={() => router.push('/contracts')}>Add a contract</button>
            <button className="btn btn-outline" onClick={() => router.push('/admin')}>Open admin panel</button>
          </div>
        </div>
      </Layout>
    </Protected>
  );
}
