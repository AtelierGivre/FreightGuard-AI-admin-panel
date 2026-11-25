'use client';

import { useRouter } from 'next/navigation';
import {
  FileText,
  BadgeIndianRupee,
  AlertTriangle,
  CircleDollarSign,
  Percent,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
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

const share = (part, total) => (total ? Math.round((part / total) * 100) : 0);

export default function Dashboard() {
  const router = useRouter();
  const { data, loading, error, reload } = useApiData(api.getDashboard);
  const k = data?.kpis || {};
  const weekly = data?.weekly || [];
  const maxRecovered = Math.max(1, ...weekly.map((week) => week.recovered || 0));

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
            value={k.auditedInvoices}
            icon={FileText}
            color="indigo"
            foot={`${k.totalInvoices ?? 0} total invoices`}
            loading={loading}
          />
          <KpiCard
            label="Total billed"
            value={money(k.totalBilled)}
            icon={BadgeIndianRupee}
            color="blue"
            foot="Across all invoices"
            loading={loading}
          />
          <KpiCard
            label="Flagged amount"
            value={money(k.flaggedAmount)}
            icon={AlertTriangle}
            color="amber"
            foot="Potentially recoverable"
            loading={loading}
          />
          <KpiCard
            label="Recovered"
            value={money(k.recoveredAmount)}
            icon={CircleDollarSign}
            color="green"
            foot={`${k.recoveryRate ?? 0}% recovery rate`}
            loading={loading}
          />
          <KpiCard
            label={`Fee due (${k.feePct ?? DEFAULT_FEE_PCT}%)`}
            value={money(k.feeDue)}
            icon={Percent}
            color="purple"
            foot="Billed on recovery only"
            loading={loading}
          />
          <KpiCard
            label="Pending audits"
            value={Math.max(0, (k.totalInvoices ?? 0) - (k.auditedInvoices ?? 0))}
            icon={Clock}
            color="indigo"
            foot="Awaiting rules engine"
            loading={loading}
          />
        </div>

        <div className="insight-grid">
          <div className="insight-card">
            <div className="insight-head">
              <div>
                <h3>Recovery trend</h3>
                <p>Weekly recovered amount across audited invoices</p>
              </div>
              <span className="pill green">
                <TrendingUp size={12} /> {money(k.recoveredAmount)} total
              </span>
            </div>
            <div className="bar-chart">
              {loading
                ? [0, 1, 2, 3].map((i) => (
                    <div className="bar-col" key={i}>
                      <div
                        className="skeleton"
                        style={{ width: '100%', height: `${45 + i * 12}%` }}
                      />
                      <span className="bar-label">W{i + 1}</span>
                    </div>
                  ))
                : weekly.map((week) => {
                    const height = Math.max(
                      6,
                      Math.round(((week.recovered || 0) / maxRecovered) * 100),
                    );
                    return (
                      <div
                        className="bar-col"
                        key={week.week}
                        title={`${week.week}: ${week.invoices} invoices · ${money(week.recovered)} recovered`}
                      >
                        <div
                          className={`bar${week.recovered > 0 ? ' has-recovery' : ''}`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="bar-label">{week.week}</span>
                      </div>
                    );
                  })}
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-head">
              <div>
                <h3>Audit health</h3>
                <p>How much of the billed value is accounted for</p>
              </div>
              <Activity size={17} color="var(--indigo)" aria-hidden="true" />
            </div>
            <div className="progress-row">
              <div className="progress-meta">
                <span className="text-slate">Invoices audited</span>
                <span>{share(k.auditedInvoices || 0, k.totalInvoices || 0)}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${share(k.auditedInvoices || 0, k.totalInvoices || 0)}%` }}
                />
              </div>
            </div>
            <div className="progress-row">
              <div className="progress-meta">
                <span className="text-slate">Value recovered</span>
                <span>{k.recoveryRate ?? 0}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill green" style={{ width: `${k.recoveryRate ?? 0}%` }} />
              </div>
            </div>
            <div className="progress-row">
              <div className="progress-meta">
                <span className="text-slate">Value flagged</span>
                <span>{share(k.flaggedAmount || 0, k.totalBilled || 0)}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill amber"
                  style={{ width: `${share(k.flaggedAmount || 0, k.totalBilled || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-22">
          <div className="card-header">
            <h3>Recent invoices</h3>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/invoices')}>
              View all <ArrowRight size={13} />
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
            loading={loading}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Quick actions</h3>
          </div>
          <div className="card-body flex gap-12">
            <button className="btn btn-primary" onClick={() => router.push('/invoices')}>
              Audit an invoice
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/contracts')}>
              Add a contract
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/disputes')}>
              Manage disputes
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/recoveries')}>
              View recoveries
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
