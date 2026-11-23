'use client';

import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Scale,
  BadgeIndianRupee,
  ClipboardCheck,
} from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import DataTable from '@/components/DataTable';
import StatusPill from '@/components/StatusPill';
import { api } from '@/lib/api';
import { money, confidencePct } from '@/lib/format';
import { REVIEW_CONFIDENCE_THRESHOLD, STAFF_ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

const loadOverview = async () => {
  const [stats, queue] = await Promise.all([api.getAdminStats(), api.getReviewQueue()]);
  return { data: { stats: stats.data, queue: queue.data } };
};

export default function AdminOverview() {
  const { data, loading, error, reload } = useApiData(loadOverview);
  const s = data?.stats || {};
  const queue = data?.queue || [];

  return (
    <Protected roles={STAFF_ROLES}>
      <Layout title="Admin Overview" subtitle="Platform-wide operations and performance">
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
            label="Total users"
            value={loading ? '—' : s.users?.total}
            icon={Users}
            color="indigo"
            foot={`${s.users?.operators ?? 0} operators · ${s.users?.admins ?? 0} admins`}
            loading={loading}
          />
          <KpiCard
            label="Companies"
            value={loading ? '—' : s.companies}
            icon={Building2}
            color="blue"
            loading={loading}
          />
          <KpiCard
            label="Invoices"
            value={loading ? '—' : s.invoices?.total}
            icon={FileText}
            color="indigo"
            foot={`${s.invoices?.audited ?? 0} audited · ${s.invoices?.pending ?? 0} pending`}
            loading={loading}
          />
          <KpiCard
            label="Flags raised"
            value={loading ? '—' : s.flags?.total}
            icon={AlertTriangle}
            color="amber"
            foot={`${money(s.flags?.flaggedAmount)} flagged`}
            loading={loading}
          />
          <KpiCard
            label="Disputes"
            value={loading ? '—' : s.disputes?.total}
            icon={Scale}
            color="purple"
            foot={`${s.disputes?.active ?? 0} active · ${s.disputes?.won ?? 0} won`}
            loading={loading}
          />
          <KpiCard
            label="Recovered"
            value={money(s.recoveries?.recoveredAmount)}
            icon={BadgeIndianRupee}
            color="green"
            foot={`${money(s.recoveries?.fees)} in fees`}
            loading={loading}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Operator review queue</h3>
            <span className="pill amber">
              <ClipboardCheck size={11} /> {queue.length} awaiting review
            </span>
          </div>
          <DataTable
            columns={[
              {
                header: 'Invoice',
                key: 'invoice',
                render: (row) => (
                  <span className="mono strong">
                    {row.invoiceRef?.invoiceNumber || row.invoice?.invoiceNumber || '—'}
                  </span>
                ),
              },
              {
                header: 'Carrier',
                key: 'carrier',
                render: (row) => row.invoiceRef?.carrierName || row.invoice?.carrierName || '—',
              },
              { header: 'Description', key: 'description' },
              {
                header: 'Billed',
                key: 'billedAmount',
                numeric: true,
                render: (row) => <span className="num">{money(row.billedAmount)}</span>,
              },
              {
                header: 'Confidence',
                key: 'confidence',
                numeric: true,
                render: (row) => (
                  <span
                    className={`num ${row.confidence < REVIEW_CONFIDENCE_THRESHOLD ? 'text-indigo' : ''}`}
                  >
                    {confidencePct(row.confidence)}
                  </span>
                ),
              },
              {
                header: 'Verdict',
                key: 'verdict',
                render: (row) => <StatusPill value={row.verdict} />,
              },
              {
                header: 'Review',
                key: 'reviewStatus',
                render: (row) => <StatusPill value={row.reviewStatus} />,
              },
            ]}
            rows={queue.slice(0, 8)}
            empty="No flags are awaiting review."
            loading={loading}
          />
        </div>
      </Layout>
    </Protected>
  );
}
