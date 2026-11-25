'use client';

import { useState } from 'react';
import { CircleDollarSign, Percent, Wallet } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import { useApiData } from '@/hooks/useApiData';
import { useAuth } from '@/context/AuthContext';

const sumBy = (rows, key) => (rows || []).reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
const PAGE_SIZE = 50;

export default function Recoveries() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useApiData(
    () => api.getRecoveries({ limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    [page],
  );
  const { isStaff } = useAuth();
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState('');

  const recoveries = data || [];
  const summary = meta?.summary || {};
  const total = summary.amount ?? sumBy(recoveries, 'amount');
  const fees = summary.fees ?? sumBy(recoveries, 'feeAmount');
  const due =
    summary.due ??
    recoveries
      .filter((row) => row.billingStatus !== 'paid')
      .reduce((sum, row) => sum + (Number(row.feeAmount) || 0), 0);

  const updateBilling = async (row, billingStatus) => {
    setBusyId(row._id);
    setActionError('');
    try {
      await api.updateRecoveryBilling(row._id, { billingStatus });
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <Protected>
      <Layout title="Recoveries" subtitle="Cash recovered and contingency fee billing">
        {error && (
          <div className="alert error mb-16">
            {error}{' '}
            <button className="btn btn-ghost btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        )}
        {actionError && <div className="alert error mb-16">{actionError}</div>}

        <div className="kpi-grid mb-22">
          <KpiCard
            label="Total recovered"
            value={money(total)}
            icon={CircleDollarSign}
            color="green"
            foot="Cash actually received"
            loading={loading}
          />
          <KpiCard
            label="Fee recorded"
            value={money(fees)}
            icon={Percent}
            color="purple"
            foot="Charged only on recovered cash"
            loading={loading}
          />
          <KpiCard
            label="Fee outstanding"
            value={money(due)}
            icon={Wallet}
            color="amber"
            foot="Fees not yet marked paid"
            loading={loading}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recovery records</h3>
            <span className="text-sm text-muted">{meta?.total ?? recoveries.length} records</span>
          </div>
          <DataTable
            columns={[
              {
                header: 'Invoice',
                key: 'invoice',
                render: (row) => (
                  <span className="strong mono">{row.dispute?.invoice?.invoiceNumber || '—'}</span>
                ),
              },
              {
                header: 'Carrier',
                key: 'carrier',
                render: (row) => row.dispute?.invoice?.carrierName || '—',
              },
              {
                header: 'Recovered',
                key: 'amount',
                numeric: true,
                render: (row) => <span className="num strong">{money(row.amount)}</span>,
              },
              {
                header: 'Fee',
                key: 'feeAmount',
                numeric: true,
                render: (row) => (
                  <span className="num">
                    {money(row.feeAmount)}{' '}
                    <span className="text-sm text-muted">({row.feePct}%)</span>
                  </span>
                ),
              },
              {
                header: 'Net to customer',
                key: 'net',
                numeric: true,
                render: (row) => (
                  <span className="num">{money((row.amount || 0) - (row.feeAmount || 0))}</span>
                ),
              },
              {
                header: 'Recovered on',
                key: 'recoveredAt',
                render: (row) => <span className="text-sm">{formatDate(row.recoveredAt)}</span>,
              },
              {
                header: 'Billing',
                key: 'billingStatus',
                render: (row) => (
                  <span className={`pill ${row.billingStatus === 'paid' ? 'green' : 'amber'}`}>
                    {row.billingStatus || 'due'}
                  </span>
                ),
              },
              ...(isStaff
                ? [
                    {
                      header: 'Action',
                      render: (row) => (
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={busyId === row._id || row.billingStatus === 'paid'}
                          onClick={() => updateBilling(row, 'paid')}
                        >
                          Mark paid
                        </button>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={recoveries}
            loading={loading}
            empty="No recoveries recorded yet."
          />
          <Pagination meta={meta} onPage={setPage} disabled={loading} />
        </div>
      </Layout>
    </Protected>
  );
}
