'use client';

import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { STAFF_ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function AdminDisputes() {
  const { data: disputes, loading, error, reload } = useApiData(api.getAllDisputes);

  return (
    <Protected roles={STAFF_ROLES}>
      <Layout title="All Disputes" subtitle="Platform-wide dispute oversight">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3>Disputes</h3>
            <span className="text-sm text-muted">
              {loading ? 'Loading…' : `${disputes?.length || 0} records`}
            </span>
          </div>
          <DataTable
            columns={[
              {
                header: 'Invoice #',
                key: 'invoiceNumber',
                render: (row) => (
                  <span className="mono strong">
                    {row.invoice?.invoiceNumber || row.invoiceNumber || '—'}
                  </span>
                ),
              },
              { header: 'Company', key: 'company', render: (row) => row.company?.name || '—' },
              {
                header: 'Carrier',
                key: 'carrierName',
                render: (row) => row.invoice?.carrierName || row.carrierName || '—',
              },
              {
                header: 'Status',
                key: 'status',
                render: (row) => <StatusPill value={row.status} />,
              },
              {
                header: 'Disputed',
                key: 'disputedAmount',
                numeric: true,
                render: (row) => <span className="num strong">{money(row.disputedAmount)}</span>,
              },
            ]}
            rows={disputes || []}
          />
        </div>
      </Layout>
    </Protected>
  );
}
