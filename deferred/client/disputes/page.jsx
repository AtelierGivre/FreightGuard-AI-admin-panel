'use client';

import { useEffect, useState } from 'react';
import { Scale, FileDown } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUSES = ['draft', 'sent', 'under_review', 'won', 'lost'];

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [letter, setLetter] = useState(null);

  const load = () => api.getDisputes().then((r) => setDisputes(r.data));
  useEffect(() => { load(); }, []);

  const changeStatus = async (row, status) => {
    await api.updateDispute(row._id, { status });
    load();
  };

  return (
    <Protected>
      <Layout title="Disputes" subtitle="Dispute letters and status tracking">
        <div className="card">
          <div className="card-header"><h3>All disputes</h3><span className="text-sm text-muted">{disputes.length} records</span></div>
          <DataTable
            columns={[
              { header: 'Invoice #', key: 'invoiceNumber', render: (r) => <span className="strong mono">{r.invoiceNumber}</span> },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Status', key: 'status', render: (r) => <StatusPill value={r.status} /> },
              { header: 'Disputed', key: 'disputedAmount', numeric: true, render: (r) => <span className="num strong">{money(r.disputedAmount)}</span> },
              { header: 'Move to', render: (r) => (
                <select className="form-control" style={{ width: 130, padding: '5px 8px', fontSize: 11 }} value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) },
              { header: 'Letter', render: (r) => <button className="btn btn-outline btn-sm" onClick={() => setLetter(r)}><FileDown size={12} /> View</button> },
            ]}
            rows={disputes}
          />
        </div>

        {letter && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><h3>Dispute letter — {letter.invoiceNumber}</h3><button className="btn btn-ghost btn-sm" onClick={() => setLetter(null)}>Close</button></div>
            <div className="card-body">
              <pre className="mono text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--navy-soft)' }}>
{letter.letterText || 'No letter text stored for this dispute. Generate one from the audited invoice.'}
              </pre>
            </div>
          </div>
        )}
      </Layout>
    </Protected>
  );
}
