'use client';

import { BadgeIndianRupee, Percent, CircleDollarSign } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import KpiCard from '@/components/KpiCard';
import DataTable from '@/components/DataTable';
import { recoveries } from '../lib/demoData';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Recoveries() {
  const total = recoveries.reduce((s, r) => s + r.amount, 0);
  const fees = recoveries.reduce((s, r) => s + r.feeAmount, 0);
  return (
    <Protected>
      <Layout title="Recoveries" subtitle="Money won back and fee calculation">
        <div className="kpi-grid">
          <KpiCard label="Total recovered" value={money(total)} icon={CircleDollarSign} color="green" />
          <KpiCard label="Fee due (25%)" value={money(fees)} icon={Percent} color="purple" foot="Exactly 25% of recovered total" />
          <KpiCard label="Net to customer" value={money(total - fees)} icon={BadgeIndianRupee} color="indigo" />
        </div>
        <div className="card">
          <div className="card-header"><h3>Recovery records</h3></div>
          <DataTable
            columns={[
              { header: 'Recovered', key: 'amount', numeric: true, render: (r) => <span className="num strong">{money(r.amount)}</span> },
              { header: 'Fee %', key: 'feePct', numeric: true, render: (r) => <span className="num">{r.feePct}%</span> },
              { header: 'Fee amount', key: 'feeAmount', numeric: true, render: (r) => <span className="num">{money(r.feeAmount)}</span> },
              { header: 'Date', key: 'recoveredAt', render: (r) => new Date(r.recoveredAt).toLocaleDateString() },
            ]}
            rows={recoveries}
          />
        </div>
      </Layout>
    </Protected>
  );
}
