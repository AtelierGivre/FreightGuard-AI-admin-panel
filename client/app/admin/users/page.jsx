'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import { ROLES } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function UserManagement() {
  const { data: users, loading, error, reload } = useApiData(api.getUsers);
  const [actionError, setActionError] = useState('');

  const change = async (row, patch) => {
    setActionError('');
    try {
      await api.updateUser(row._id, patch);
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <Protected roles={[ROLES.ADMIN]}>
      <Layout title="User Management" subtitle="Manage roles and account access (admin only)">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}
        {actionError && <div className="alert error mb-16">{actionError}</div>}

        <div className="card">
          <div className="card-header">
            <h3>All users</h3>
            <span className="text-sm text-muted">
              {loading ? 'Loading…' : `${users?.length || 0} accounts`}
            </span>
          </div>
          <DataTable
            columns={[
              {
                header: 'Name',
                key: 'name',
                render: (row) => <span className="strong">{row.name}</span>,
              },
              { header: 'Email', key: 'email' },
              { header: 'Company', key: 'company', render: (row) => row.company?.name || '—' },
              { header: 'Role', key: 'role', render: (row) => <StatusPill value={row.role} /> },
              {
                header: 'Active',
                key: 'isActive',
                render: (row) => <StatusPill value={row.isActive ? 'confirmed' : 'rejected'} />,
              },
              {
                header: 'Change role',
                render: (row) => (
                  <select
                    className="form-control form-control-compact"
                    aria-label={`Change role for ${row.name}`}
                    value={row.role}
                    onChange={(event) => change(row, { role: event.target.value })}
                  >
                    {Object.values(ROLES).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                header: 'Access',
                render: (row) => (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => change(row, { isActive: !row.isActive })}
                  >
                    {row.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                ),
              },
            ]}
            rows={users || []}
          />
        </div>
      </Layout>
    </Protected>
  );
}
