'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { STAFF_ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

const PAGE_SIZE = 50;

export default function AdminDisputes() {
  const [page, setPage] = useState(1);
  const {
    data: disputes,
    meta,
    loading,
    error,
    reload,
  } = useApiData(
    () => api.getAllDisputes({ limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    [page],
  );

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
              {loading ? 'Loading…' : `${meta?.total ?? disputes?.length ?? 0} records`}
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
            loading={loading}
          />
          <Pagination meta={meta} onPage={setPage} disabled={loading} />
        </div>
      </Layout>
    </Protected>
  );
}
