'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { useApiData } from '@/hooks/useApiData';

const emptyForm = { carrierName: '', port: '', freeDays: 4, dayRule: 'calendar' };

export default function Contracts() {
  const { data: contracts, loading, error, reload } = useApiData(api.getContracts);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const addContract = async (event) => {
    event.preventDefault();
    setFormError('');
    try {
      await api.createContract({ ...form, freeDays: Number(form.freeDays) });
      setShowAdd(false);
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Protected>
      <Layout title="Contracts" subtitle="Tariff contracts used by the audit engine">
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
            {loading ? 'Loading…' : `${contracts?.length || 0} contracts`}
          </span>
          <button className="btn btn-primary" onClick={() => setShowAdd((value) => !value)}>
            <Plus size={15} /> Add contract
          </button>
        </div>

        {showAdd && (
          <div className="card mb-22">
            <div className="card-header">
              <h3>New tariff contract</h3>
            </div>
            <div className="card-body">
              <form className="form-grid" onSubmit={addContract}>
                <div className="form-group">
                  <label htmlFor="contractCarrier">Carrier name</label>
                  <input
                    id="contractCarrier"
                    className="form-control"
                    required
                    value={form.carrierName}
                    onChange={(event) => setForm({ ...form, carrierName: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contractPort">Port</label>
                  <input
                    id="contractPort"
                    className="form-control"
                    required
                    value={form.port}
                    onChange={(event) => setForm({ ...form, port: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="freeDays">Free days</label>
                  <input
                    id="freeDays"
                    className="form-control"
                    type="number"
                    min="0"
                    required
                    value={form.freeDays}
                    onChange={(event) => setForm({ ...form, freeDays: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dayRule">Day rule</label>
                  <select
                    id="dayRule"
                    className="form-control"
                    value={form.dayRule}
                    onChange={(event) => setForm({ ...form, dayRule: event.target.value })}
                  >
                    <option value="calendar">Calendar days</option>
                    <option value="working">Working days</option>
                  </select>
                </div>
                <div className="form-group full">
                  <button className="btn btn-primary" type="submit">
                    Save contract
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
                header: 'Carrier',
                key: 'carrierName',
                render: (row) => <span className="strong">{row.carrierName}</span>,
              },
              { header: 'Port', key: 'port' },
              {
                header: 'Container',
                key: 'containerType',
                render: (row) => (
                  <span className="mono">{(row.containerType || '—').toUpperCase()}</span>
                ),
              },
              { header: 'Free days', key: 'freeDays', numeric: true },
              { header: 'Day rule', key: 'dayRule' },
              {
                header: 'Tiers',
                key: 'tiers',
                render: (row) => (
                  <span className="text-sm text-slate">{(row.tiers || []).length} tier(s)</span>
                ),
              },
            ]}
            rows={contracts || []}
            loading={loading}
          />
        </div>
      </Layout>
    </Protected>
  );
}
