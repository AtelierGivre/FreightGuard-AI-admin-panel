'use client';

import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { STAFF_ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function AdminInvoices() {
  const { data: invoices, loading, error, reload } = useApiData(api.getAllInvoices);
  const total = (invoices || []).reduce((sum, invoice) => sum + (invoice.totalBilled || 0), 0);

  return (
    <Protected roles={STAFF_ROLES}>
      <Layout title="All Invoices" subtitle="Platform-wide invoice oversight">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-label">Total invoices</div>
            <div className="kpi-value">{loading ? '—' : invoices?.length || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Total billed</div>
            <div className="kpi-value">{money(total)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Audited</div>
            <div className="kpi-value">
              {(invoices || []).filter((invoice) => invoice.auditStatus === 'audited').length}
            </div>
          </div>
        </div>

        <div className="card">
          <DataTable
            columns={[
              {
                header: 'Invoice #',
                key: 'invoiceNumber',
                render: (row) => <span className="mono strong">{row.invoiceNumber}</span>,
              },
              { header: 'Company', key: 'company', render: (row) => row.company?.name || '—' },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Port', key: 'port' },
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
            rows={invoices || []}
          />
        </div>
      </Layout>
    </Protected>
  );
}
