'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ carrierName: '', port: '', freeDays: 4, dayRule: 'calendar' });

  const load = () => api.getContracts().then((r) => setContracts(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.createContract({ ...form, freeDays: Number(form.freeDays) });
      setShowAdd(false); setForm({ carrierName: '', port: '', freeDays: 4, dayRule: 'calendar' });
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <Protected>
      <Layout title="Contracts" subtitle="Tariff contracts used by the audit engine">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}><Plus size={15} /> Add contract</button>
        </div>
        {showAdd && (
          <div className="card mb-22">
            <div className="card-header"><h3>New tariff contract</h3></div>
            <div className="card-body">
              <form className="form-grid" onSubmit={add}>
                <div className="form-group"><label>Carrier name</label><input className="form-control" required value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} /></div>
                <div className="form-group"><label>Port</label><input className="form-control" required value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} /></div>
                <div className="form-group"><label>Free days</label><input className="form-control" type="number" min="0" required value={form.freeDays} onChange={(e) => setForm({ ...form, freeDays: e.target.value })} /></div>
                <div className="form-group"><label>Day rule</label><select className="form-control" value={form.dayRule} onChange={(e) => setForm({ ...form, dayRule: e.target.value })}><option value="calendar">Calendar days</option><option value="working">Working days</option></select></div>
                <div className="form-group full"><button className="btn btn-primary" type="submit">Save contract</button></div>
              </form>
            </div>
          </div>
        )}
        <div className="card">
          <DataTable
            columns={[
              { header: 'Carrier', key: 'carrierName', render: (r) => <span className="strong">{r.carrierName}</span> },
              { header: 'Port', key: 'port' },
              { header: 'Container', key: 'containerType', render: (r) => <span className="mono">{r.containerType?.toUpperCase()}</span> },
              { header: 'Free days', key: 'freeDays', numeric: true },
              { header: 'Day rule', key: 'dayRule' },
              { header: 'Tiers', key: 'tiers', render: (r) => <span className="text-sm text-slate">{(r.tiers || []).length} tier(s)</span> },
            ]}
            rows={contracts}
          />
        </div>
      </Layout>
    </Protected>
  );
}
