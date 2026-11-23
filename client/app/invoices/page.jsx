'use client';

import { useState } from 'react';
import { Play, Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { money, confidencePct } from '@/lib/format';
import { useApiData } from '@/hooks/useApiData';

const emptyForm = { invoiceNumber: '', carrierName: '', port: '', totalBilled: '' };

export default function Invoices() {
  const { data: invoices, loading, error, reload } = useApiData(api.getInvoices);
  const [selected, setSelected] = useState(null);
  const [lines, setLines] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const openInvoice = async (invoice) => {
    setSelected(invoice);
    try {
      const result = await api.getInvoice(invoice._id);
      setLines(result.data?.lines || []);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const runAudit = async (invoice) => {
    try {
      const result = await api.runAudit(invoice._id);
      const found = Array.isArray(result.data) ? result.data : result.data?.lines || [];
      if (found.length) {
        setSelected(invoice);
        setLines(found);
      }
      await reload();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const addInvoice = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      await api.createInvoice({ ...form, totalBilled: Number(form.totalBilled) });
      setShowAdd(false);
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Protected>
      <Layout title="Invoices" subtitle="Enter and audit demurrage invoices">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}
        {formError && <div className="alert error mb-16">{formError}</div>}

        <div className="flex justify-between items-center mb-16">
          <span className="text-sm text-muted">
            {loading ? 'Loading…' : `${invoices?.length || 0} invoices`}
          </span>
          <button className="btn btn-primary" onClick={() => setShowAdd((value) => !value)}>
            <Plus size={15} /> Add invoice
          </button>
        </div>

        {showAdd && (
          <div className="card mb-22">
            <div className="card-header">
              <h3>New invoice</h3>
            </div>
            <div className="card-body">
              <form className="form-grid" onSubmit={addInvoice}>
                <div className="form-group">
                  <label htmlFor="invoiceNumber">Invoice number</label>
                  <input
                    id="invoiceNumber"
                    className="form-control"
                    required
                    value={form.invoiceNumber}
                    onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="carrierName">Carrier</label>
                  <input
                    id="carrierName"
                    className="form-control"
                    required
                    value={form.carrierName}
                    onChange={(event) => setForm({ ...form, carrierName: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="port">Port</label>
                  <input
                    id="port"
                    className="form-control"
                    required
                    value={form.port}
                    onChange={(event) => setForm({ ...form, port: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="totalBilled">Total billed</label>
                  <input
                    id="totalBilled"
                    className="form-control"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.totalBilled}
                    onChange={(event) => setForm({ ...form, totalBilled: event.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <button className="btn btn-primary" type="submit">
                    Save invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <DataTable
            columns={[
              {
                header: 'Invoice #',
                key: 'invoiceNumber',
                render: (row) => <span className="strong mono">{row.invoiceNumber}</span>,
              },
              { header: 'Carrier', key: 'carrierName' },
              { header: 'Port', key: 'port' },
              {
                header: 'Container',
                key: 'containerNumber',
                render: (row) => <span className="mono text-sm">{row.containerNumber || '—'}</span>,
              },
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
              {
                header: 'Actions',
                render: (row) => (
                  <div className="flex gap-8">
                    <button className="btn btn-outline btn-sm" onClick={() => openInvoice(row)}>
                      View
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => runAudit(row)}>
                      <Play size={12} /> Audit
                    </button>
                  </div>
                ),
              },
            ]}
            rows={invoices || []}
            loading={loading}
          />
        </div>

        {selected && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <h3>Audit result — {selected.invoiceNumber}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <DataTable
              columns={[
                { header: 'Line', key: 'description' },
                { header: 'Days', key: 'days', numeric: true },
                {
                  header: 'Billed',
                  key: 'billedAmount',
                  numeric: true,
                  render: (row) => <span className="num">{money(row.billedAmount)}</span>,
                },
                {
                  header: 'Correct',
                  key: 'correctAmount',
                  numeric: true,
                  render: (row) => <span className="num">{money(row.correctAmount)}</span>,
                },
                {
                  header: 'Verdict',
                  key: 'verdict',
                  render: (row) => <StatusPill value={row.verdict} />,
                },
                {
                  header: 'Confidence',
                  key: 'confidence',
                  numeric: true,
                  render: (row) => <span className="num">{confidencePct(row.confidence)}</span>,
                },
                {
                  header: 'Reason',
                  key: 'reason',
                  render: (row) => <span className="text-sm text-slate">{row.reason}</span>,
                },
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
