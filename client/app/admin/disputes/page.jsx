'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  useEffect(() => { api.getAllDisputes().then((r) => setDisputes(r.data)); }, []);

  return (
    <Protected roles={['admin', 'operator']}>
      <Layout title="All Disputes" subtitle="Platform-wide dispute oversight">
        <div className="card">
          <DataTable
            columns={[
              { header: 'Invoice #', key: 'invoiceNumber', render: (r) => <span className="mono strong">{r.invoiceNumber}</span> },
              { header: 'Company', key: 'company', render: (r) => r.company?.name || '—' },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Status', key: 'status', render: (r) => <StatusPill value={r.status} /> },
              { header: 'Disputed', key: 'disputedAmount', numeric: true, render: (r) => <span className="num strong">{money(r.disputedAmount)}</span> },
            ]}
            rows={disputes}
          />
        </div>
      </Layout>
    </Protected>
  );
}
