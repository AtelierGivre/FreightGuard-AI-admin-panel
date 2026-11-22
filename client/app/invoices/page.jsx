'use client';

import { useEffect, useState } from 'react';
import { FileText, Play, Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [lines, setLines] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ invoiceNumber: '', carrierName: '', port: '', totalBilled: '' });

  const load = () => api.getInvoices().then((r) => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const openInvoice = async (inv) => {
    setSelected(inv);
    const res = await api.getInvoice(inv._id);
    setLines(res.data?.lines || []);
  };

  const audit = async (inv) => {
    const res = await api.runAudit(inv._id);
    const found = Array.isArray(res.data) ? res.data : (res.data?.lines || []);
    if (found.length) { setSelected(inv); setLines(found); }
    else await load();
  };

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.createInvoice({ ...form, totalBilled: Number(form.totalBilled) });
      setShowAdd(false); setForm({ invoiceNumber: '', carrierName: '', port: '', totalBilled: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <Protected>
      <Layout title="Invoices" subtitle="Upload and audit demurrage invoices">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={15} /> Add invoice</button>
        </div>

        {showAdd && (
          <div className="card mb-22">
            <div className="card-header"><h3>New invoice</h3></div>
            <div className="card-body">
              <form className="form-grid" onSubmit={add}>
                <div className="form-group"><label>Invoice number</label><input className="form-control" required value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
                <div className="form-group"><label>Carrier</label><input className="form-control" required value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} /></div>
                <div className="form-group"><label>Port</label><input className="form-control" required value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></div>
                <div className="form-group"><label>Total billed</label><input className="form-control" type="number" step="0.01" required value={form.totalBilled} onChange={(e) => setForm({ ...form, totalBilled: e.target.value })} /></div>
                <div className="form-group full"><button className="btn btn-primary" type="submit">Save invoice</button></div>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <DataTable
            columns={[
              { header: 'Invoice #', key: 'invoiceNumber', render: (r) => <span className="strong mono">{r.invoiceNumber}</span> },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Port', key: 'port' },
              { header: 'Container', key: 'containerNumber', render: (r) => <span className="mono text-sm">{r.containerNumber || '—'}</span> },
              { header: 'Billed', key: 'totalBilled', numeric: true, render: (r) => <span className="num strong">{money(r.totalBilled)}</span> },
              { header: 'Status', key: 'auditStatus', render: (r) => <StatusPill value={r.auditStatus} /> },
              { header: 'Actions', render: (r) => (
                <div className="flex gap-8">
                  <button className="btn btn-outline btn-sm" onClick={() => openInvoice(r)}>View</button>
                  <button className="btn btn-primary btn-sm" onClick={() => audit(r)}><Play size={12} /> Audit</button>
                </div>
              ) },
            ]}
            rows={invoices}
          />
        </div>

        {selected && (
          <div className="card mt-16" style={{ marginTop: 16 }}>
            <div className="card-header"><h3>Audit result — {selected.invoiceNumber}</h3><button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button></div>
            <DataTable
              columns={[
                { header: 'Line', key: 'description' },
                { header: 'Days', key: 'days', numeric: true },
                { header: 'Billed', key: 'billedAmount', numeric: true, render: (r) => <span className="num">{money(r.billedAmount)}</span> },
                { header: 'Correct', key: 'correctAmount', numeric: true, render: (r) => <span className="num">{money(r.correctAmount)}</span> },
                { header: 'Verdict', key: 'verdict', render: (r) => <StatusPill value={r.verdict} /> },
                { header: 'Confidence', key: 'confidence', numeric: true, render: (r) => <span className="num">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—'}</span> },
                { header: 'Reason', key: 'reason', render: (r) => <span className="text-sm text-slate">{r.reason}</span> },
              ]}
              rows={lines}
              empty="No line items recorded. Run an audit to generate flags."
            />
          </div>
        )}
      </Layout>
    </Protected>
  );
}
