'use client';

import { useEffect, useState } from 'react';
import { Settings, Percent, Database, ShieldCheck } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => { api.getSettings().then((r) => setSettings(r.data)); }, []);

  return (
    <Protected roles={['admin']}>
      <Layout title="Platform Settings" subtitle="Fee configuration and system information">
        <div className="card mb-22">
          <div className="card-header"><h3>Recovery fee</h3><Percent size={16} color="var(--indigo)" /></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--indigo)' }}>{settings?.defaultFeePct ?? 25}%</div>
              <div>
                <div className="strong">Standard contingency fee</div>
                <div className="text-sm text-muted">Charged only on money actually recovered. Configured per company at the database level.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-22">
          <div className="card-header"><h3>Company fee overrides</h3></div>
          <DataTable
            columns={[
              { header: 'Company', key: 'name', render: (r) => <span className="strong">{r.name}</span> },
              { header: 'Plan', key: 'plan' },
              { header: 'Fee %', key: 'feePct', numeric: true },
            ]}
            rows={settings?.companies || []}
          />
        </div>

        <div className="card">
          <div className="card-header"><h3>System information</h3><Database size={16} color="var(--indigo)" /></div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <div className="flex justify-between"><span className="text-slate">Frontend</span><span className="mono">Next.js 14 (App Router)</span></div>
            <div className="flex justify-between"><span className="text-slate">Backend</span><span className="mono">Node.js + Express.js</span></div>
            <div className="flex justify-between"><span className="text-slate">Database</span><span className="mono">MongoDB (Mongoose)</span></div>
            <div className="flex justify-between"><span className="text-slate">Auth</span><span className="mono">JWT + role-based access control</span></div>
            <div className="flex justify-between"><span className="text-slate">Mode</span><span className="mono">{api.isDemo ? 'Demo (mock data)' : 'Live API'}</span></div>
          </div>
        </div>
      </Layout>
    </Protected>
  );
}
