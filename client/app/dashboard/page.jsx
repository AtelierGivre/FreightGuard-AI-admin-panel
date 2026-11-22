'use client';

import { useRouter } from 'next/navigation';
import {
  FileText,
  BadgeIndianRupee,
  AlertTriangle,
  CircleDollarSign,
  Percent,
  Clock,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { DEFAULT_FEE_PCT } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function Dashboard() {
  const router = useRouter();
  const { data, loading, error, reload } = useApiData(api.getDashboard);
  const k = data?.kpis || {};

  return (
    <Protected>
      <Layout title="Dashboard" subtitle="Your recovery workspace at a glance">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <div className="kpi-grid">
          <KpiCard
            label="Audited invoices"
            value={loading ? '—' : k.auditedInvoices}
            icon={FileText}
            color="indigo"
            foot={`${k.totalInvoices ?? 0} total invoices`}
          />
          <KpiCard
            label="Total billed"
            value={money(k.totalBilled)}
            icon={BadgeIndianRupee}
            color="blue"
            foot="Across all invoices"
          />
          <KpiCard
            label="Flagged amount"
            value={money(k.flaggedAmount)}
            icon={AlertTriangle}
            color="amber"
            foot="Potentially recoverable"
          />
          <KpiCard
            label="Recovered"
            value={money(k.recoveredAmount)}
            icon={CircleDollarSign}
            color="green"
            foot={`${k.recoveryRate ?? 0}% recovery rate`}
          />
          <KpiCard
            label={`Fee due (${DEFAULT_FEE_PCT}%)`}
            value={money(k.feeDue)}
            icon={Percent}
            color="purple"
            foot="Billed on recovery only"
          />
          <KpiCard
            label="Pending audits"
            value={Math.max(0, (k.totalInvoices ?? 0) - (k.auditedInvoices ?? 0))}
            icon={Clock}
            color="indigo"
            foot="Awaiting rules engine"
          />
        </div>

        <div className="card mb-22">
          <div className="card-header">
            <h3>Recent invoices</h3>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/invoices')}>
              View all
            </button>
          </div>
          <DataTable
            columns={[
              {
                header: 'Invoice #',
                key: 'invoiceNumber',
                render: (row) => <span className="strong mono">{row.invoiceNumber}</span>,
              },
              { header: 'Carrier', key: 'carrierName' },
              {
                header: 'Billed',
                key: 'totalBilled',
                numeric: true,
                render: (row) => <span className="num strong">{money(row.totalBilled)}</span>,
              },
              {
                header: 'Status',
                key: 'auditStatus',
                render: (row) => <StatusPill value={row.auditStatus} />,
              },
            ]}
            rows={data?.invoices || []}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Quick actions</h3>
          </div>
          <div className="card-body flex gap-12">
            <button className="btn btn-outline" onClick={() => router.push('/invoices')}>
              Audit an invoice
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/contracts')}>
              Add a contract
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/admin')}>
              Open admin panel
            </button>
          </div>
        </div>
      </Layout>
    </Protected>
  );
}
