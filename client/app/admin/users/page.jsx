'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);

  const load = () => api.getUsers().then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const change = async (row, patch) => {
    await api.updateUser(row._id, patch);
    load();
  };

  return (
    <Protected roles={['admin']}>
      <Layout title="User Management" subtitle="Manage roles and account access (admin only)">
        <div className="card">
          <div className="card-header"><h3>All users</h3><span className="text-sm text-muted">{users.length} accounts</span></div>
          <DataTable
            columns={[
              { header: 'Name', key: 'name', render: (r) => <span className="strong">{r.name}</span> },
              { header: 'Email', key: 'email' },
              { header: 'Company', key: 'company', render: (r) => r.company?.name || '—' },
              { header: 'Role', key: 'role', render: (r) => <StatusPill value={r.role} /> },
              { header: 'Active', key: 'isActive', render: (r) => <StatusPill value={r.isActive ? 'confirmed' : 'rejected'} /> },
              { header: 'Change role', render: (r) => (
                <select className="form-control" style={{ width: 110, padding: '5px 8px', fontSize: 11 }} value={r.role} onChange={(e) => change(r, { role: e.target.value })}>
                  <option value="user">user</option><option value="operator">operator</option><option value="admin">admin</option>
                </select>
              ) },
              { header: 'Access', render: (r) => (
                <button className="btn btn-outline btn-sm" onClick={() => change(r, { isActive: !r.isActive })}>
                  {r.isActive ? 'Deactivate' : 'Activate'}
                </button>
              ) },
            ]}
            rows={users}
          />
        </div>
      </Layout>
    </Protected>
  );
}
