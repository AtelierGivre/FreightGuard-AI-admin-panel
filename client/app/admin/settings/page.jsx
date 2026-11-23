'use client';

import { Percent, Database } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function AdminSettings() {
  const { data: settings, loading, error, reload } = useApiData(api.getSettings);

  return (
    <Protected roles={[ROLES.ADMIN]}>
      <Layout title="Platform Settings" subtitle="Fee configuration and system information">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <div className="card mb-22">
          <div className="card-header">
            <h3>Recovery fee</h3>
            <Percent size={16} color="var(--indigo)" />
          </div>
          <div className="card-body">
            <div className="flex items-center gap-16">
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--indigo)' }}>
                {loading ? '—' : `${settings?.defaultFeePct}%`}
              </div>
              <div>
                <div className="strong">Standard contingency fee</div>
                <div className="text-sm text-muted">
                  Charged only on money actually recovered. Configured per company at the database
                  level.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-22">
          <div className="card-header">
            <h3>Company fee overrides</h3>
          </div>
          <DataTable
            columns={[
              {
                header: 'Company',
                key: 'name',
                render: (row) => <span className="strong">{row.name}</span>,
              },
              { header: 'Plan', key: 'plan' },
              {
                header: 'Fee %',
                key: 'feePct',
                numeric: true,
                render: (row) => <span className="num">{row.feePct}%</span>,
              },
            ]}
            rows={settings?.companies || []}
            loading={loading}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>System information</h3>
            <Database size={16} color="var(--indigo)" />
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <div className="flex justify-between">
              <span className="text-slate">Frontend</span>
              <span className="mono">Next.js 16 (App Router)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Backend</span>
              <span className="mono">Node.js + Express.js</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Database</span>
              <span className="mono">MongoDB (Mongoose)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Auth</span>
              <span className="mono">JWT + role-based access control</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">API endpoint</span>
              <span className="mono">{api.apiBaseUrl || 'Not configured'}</span>
            </div>
          </div>
        </div>
      </Layout>
    </Protected>
  );
}
