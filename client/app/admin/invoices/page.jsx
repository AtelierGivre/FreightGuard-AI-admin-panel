'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { api.getAllInvoices().then((r) => setInvoices(r.data)); }, []);

  const total = invoices.reduce((s, i) => s + (i.totalBilled || 0), 0);

  return (
    <Protected roles={['admin', 'operator']}>
      <Layout title="All Invoices" subtitle="Platform-wide invoice oversight">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kpi-card"><div className="kpi-label">Total invoices</div><div className="kpi-value">{invoices.length}</div></div>
          <div className="kpi-card"><div className="kpi-label">Total billed</div><div className="kpi-value">{money(total)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Audited</div><div className="kpi-value">{invoices.filter((i) => i.auditStatus === 'audited').length}</div></div>
        </div>
        <div className="card">
          <DataTable
            columns={[
              { header: 'Invoice #', key: 'invoiceNumber', render: (r) => <span className="mono strong">{r.invoiceNumber}</span> },
              { header: 'Company', key: 'company', render: (r) => r.company?.name || '—' },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Port', key: 'port' },
              { header: 'Billed', key: 'totalBilled', numeric: true, render: (r) => <span className="num strong">{money(r.totalBilled)}</span> },
              { header: 'Status', key: 'auditStatus', render: (r) => <StatusPill value={r.auditStatus} /> },
            ]}
            rows={invoices}
          />
        </div>
      </Layout>
    </Protected>
  );
}
