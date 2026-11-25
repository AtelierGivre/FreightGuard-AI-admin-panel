'use client';

import { useState } from 'react';
import { CircleDollarSign, Download, FileDown, FileText, Percent, Scale } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import DataTable from '@/components/DataTable';
import KpiCard from '@/components/KpiCard';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { formatDate, money } from '@/lib/format';
import { downloadLetterPdf, downloadLetterText } from '@/lib/letterExport';
import { useApiData } from '@/hooks/useApiData';
import { useAuth } from '@/context/AuthContext';

const DISPUTE_PAGE_SIZE = 25;
const INVOICE_PAGE_SIZE = 200;
const STATUSES = ['draft', 'sent', 'under_review', 'won', 'lost'];
const NEXT_STATUS = {
  draft: ['sent'],
  sent: ['under_review', 'won', 'lost'],
  under_review: ['won', 'lost'],
  won: [],
  lost: [],
};

const emptyResult = () => Promise.resolve({ data: null });

export default function Disputes() {
  const { isStaff } = useAuth();
  const [disputePage, setDisputePage] = useState(1);
  const {
    data: disputeRows,
    meta: disputeMeta,
    loading: disputesLoading,
    error: disputesError,
    reload: reloadDisputes,
  } = useApiData(
    () =>
      api.getDisputes({
        limit: DISPUTE_PAGE_SIZE,
        skip: (disputePage - 1) * DISPUTE_PAGE_SIZE,
      }),
    [disputePage],
  );
  const {
    data: invoices,
    loading: invoicesLoading,
    error: invoicesError,
    reload: reloadInvoices,
  } = useApiData(() => api.getInvoices({ limit: INVOICE_PAGE_SIZE }), []);
  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    reload: reloadDashboard,
  } = useApiData(api.getDashboard, []);
  const [selectedId, setSelectedId] = useState('');
  const {
    data: selected,
    loading: detailLoading,
    error: detailError,
    reload: reloadSelectedDispute,
  } = useApiData(() => (selectedId ? api.getDispute(selectedId) : emptyResult()), [selectedId]);
  const {
    data: selectedRecovery,
    loading: recoveryLoading,
    error: recoveryError,
    reload: reloadSelectedRecovery,
  } = useApiData(
    () => (selectedId ? api.getRecoveryForDispute(selectedId) : emptyResult()),
    [selectedId],
  );
  const [letterText, setLetterText] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [statusChoice, setStatusChoice] = useState('');
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveredAt, setRecoveredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');

  const disputes = disputeRows || [];
  const kpis = dashboard?.kpis || {};
  const loadError =
    disputesError || invoicesError || dashboardError || detailError || recoveryError;
  const retryAll = () =>
    Promise.all([
      reloadDisputes(),
      reloadInvoices(),
      reloadDashboard(),
      reloadSelectedDispute(),
      reloadSelectedRecovery(),
    ]);

  const activeInvoiceId =
    invoiceId ||
    (invoices || []).find((item) => item.auditStatus === 'audited')?._id ||
    invoices?.[0]?._id ||
    '';

  const view = (dispute) => {
    setSelectedId(dispute._id);
    setLetterText(dispute.letterText || '');
    setStatusChoice('');
    setActionError('');
  };

  const generate = async () => {
    if (!activeInvoiceId) {
      setActionError('Choose an invoice first');
      return;
    }
    setBusy('generate');
    setActionError('');
    try {
      const result = await api.generateDisputeLetter({ invoiceId: activeInvoiceId });
      setLetterText(result.data?.letterText || result.data?.dispute?.letterText || '');
      setSelectedId(result.data?.dispute?._id || '');
      setStatusChoice('');
      await Promise.all([reloadDisputes(), reloadDashboard()]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const updateStatus = async () => {
    if (!selected || !statusChoice) return;
    setBusy('status');
    setActionError('');
    try {
      await api.updateDisputeStatus(selected._id, { status: statusChoice });
      setStatusChoice('');
      await Promise.all([reloadDisputes(), reloadDashboard(), reloadSelectedDispute()]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const recordRecovery = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setBusy('recovery');
    setActionError('');
    try {
      await api.recordRecovery(selected._id, {
        amount: Number(recoveryAmount),
        recoveredAt: new Date(recoveredAt).toISOString(),
      });
      setRecoveryAmount('');
      await Promise.all([
        reloadDisputes(),
        reloadDashboard(),
        reloadSelectedDispute(),
        reloadSelectedRecovery(),
      ]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const markBilling = async (billingStatus) => {
    if (!selectedRecovery) return;
    setBusy('billing');
    setActionError('');
    try {
      await api.updateRecoveryBilling(selectedRecovery._id, { billingStatus });
      await Promise.all([reloadSelectedRecovery(), reloadDashboard()]);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const statusOptions = selected
    ? STATUSES.filter(
        (status) =>
          NEXT_STATUS[selected.status]?.includes(status) ||
          (status === 'won' && Boolean(selectedRecovery)),
      )
    : [];

  const invoiceNumber = selected?.invoice?.invoiceNumber || 'invoice';

  return (
    <Protected>
      <Layout title="Disputes" subtitle="Letters, status tracking and recovery">
        {loadError && (
          <div className="alert error mb-16">
            {loadError}{' '}
            <button className="btn btn-ghost btn-sm" onClick={retryAll}>
              Retry
            </button>
          </div>
        )}
        {actionError && <div className="alert error mb-16">{actionError}</div>}

        <div className="kpi-grid mb-22">
          <KpiCard
            label="Active disputes"
            value={kpis.activeDisputes ?? 0}
            icon={Scale}
            color="blue"
            loading={dashboardLoading}
          />
          <KpiCard
            label="Disputed amount"
            value={money(kpis.disputedAmount ?? 0)}
            icon={FileText}
            color="indigo"
            loading={dashboardLoading}
          />
          <KpiCard
            label="Recovered"
            value={money(kpis.recoveredAmount ?? 0)}
            icon={CircleDollarSign}
            color="green"
            loading={dashboardLoading}
          />
          <KpiCard
            label="Fees recorded"
            value={money(kpis.feeRecorded ?? 0)}
            icon={Percent}
            color="purple"
            loading={dashboardLoading}
          />
        </div>

        <div className="card mb-22">
          <div className="card-header">
            <h3>Generate dispute letter</h3>
          </div>
          <div className="card-body">
            <p className="text-sm text-muted mb-12">
              Accept the relevant flags on the Invoices page first. Only accepted flags appear in
              the letter.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="disputeInvoice">Invoice</label>
                <select
                  id="disputeInvoice"
                  className="form-control"
                  value={activeInvoiceId}
                  onChange={(event) => setInvoiceId(event.target.value)}
                  disabled={invoicesLoading}
                >
                  <option value="">Select an invoice</option>
                  {(invoices || []).map((invoice) => (
                    <option key={invoice._id} value={invoice._id}>
                      {invoice.invoiceNumber} · {invoice.carrierName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button
                  className="btn btn-primary"
                  onClick={generate}
                  disabled={busy === 'generate'}
                >
                  <FileDown size={15} /> Generate / refresh letter
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-22">
          <div className="card-header">
            <h3>All disputes</h3>
            <span className="text-sm text-muted">
              {disputeMeta?.total ?? disputes.length} records
            </span>
          </div>
          <DataTable
            columns={[
              {
                header: 'Invoice #',
                key: 'invoice',
                render: (row) => (
                  <span className="strong mono">{row.invoice?.invoiceNumber || '—'}</span>
                ),
              },
              {
                header: 'Carrier',
                key: 'carrier',
                render: (row) => row.invoice?.carrierName || '—',
              },
              {
                header: 'Status',
                key: 'status',
                render: (row) => <StatusPill value={row.status} />,
              },
              {
                header: 'Disputed',
                key: 'disputedAmount',
                numeric: true,
                render: (row) => <span className="num strong">{money(row.disputedAmount)}</span>,
              },
              {
                header: 'Sent',
                key: 'sentAt',
                render: (row) => <span className="text-sm">{formatDate(row.sentAt)}</span>,
              },
              {
                header: 'Actions',
                render: (row) => (
                  <button className="btn btn-outline btn-sm" onClick={() => view(row)}>
                    Open
                  </button>
                ),
              },
            ]}
            rows={disputes}
            loading={disputesLoading}
            empty="No disputes yet. Generate a letter from an audited invoice above."
          />
          <Pagination meta={disputeMeta} onPage={setDisputePage} disabled={disputesLoading} />
        </div>

        {detailLoading && selectedId && (
          <div className="card mb-22">
            <div className="empty">Loading dispute detail…</div>
          </div>
        )}

        {selected && (
          <div className="card">
            <div className="card-header">
              <h3>Dispute detail — {invoiceNumber}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedId('')}>
                Close
              </button>
            </div>
            <div className="card-body">
              <div className="flex justify-between items-center mb-16">
                <StatusPill value={selected.status} />
                <div className="flex gap-8">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => downloadLetterText(letterText, invoiceNumber)}
                    disabled={!letterText}
                  >
                    <Download size={13} /> TXT
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => downloadLetterPdf(letterText, invoiceNumber)}
                    disabled={!letterText}
                  >
                    <FileDown size={13} /> PDF
                  </button>
                </div>
              </div>

              <textarea
                className="form-control mono"
                rows={14}
                value={letterText}
                readOnly
                aria-label="Dispute letter"
              />

              <div className="form-grid mt-16">
                <div className="form-group">
                  <label htmlFor="disputeStatus">Move to status</label>
                  <select
                    id="disputeStatus"
                    className="form-control"
                    value={statusChoice}
                    onChange={(event) => setStatusChoice(event.target.value)}
                    disabled={!statusOptions.length}
                  >
                    <option value="">
                      {statusOptions.length ? 'Select next status' : 'No transitions'}
                    </option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button
                    className="btn btn-primary"
                    onClick={updateStatus}
                    disabled={!statusChoice || busy === 'status'}
                  >
                    Save status
                  </button>
                </div>
              </div>

              {recoveryLoading ? (
                <div className="empty mt-16">Loading recovery…</div>
              ) : selectedRecovery ? (
                <div className="alert success mt-16">
                  Recovered <strong>{money(selectedRecovery.amount)}</strong> on{' '}
                  {formatDate(selectedRecovery.recoveredAt)} · Fee{' '}
                  <strong>{money(selectedRecovery.feeAmount)}</strong> ({selectedRecovery.feePct}%)
                  · Billing: {selectedRecovery.billingStatus}
                  {isStaff && (
                    <div className="flex gap-8 mt-8">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => markBilling('paid')}
                        disabled={selectedRecovery.billingStatus === 'paid' || busy === 'billing'}
                      >
                        Mark fee paid
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => markBilling('due')}
                        disabled={selectedRecovery.billingStatus === 'due' || busy === 'billing'}
                      >
                        Mark due
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                selected.status !== 'lost' &&
                selected.status !== 'won' && (
                  <form className="form-grid mt-16" onSubmit={recordRecovery}>
                    <div className="form-group">
                      <label htmlFor="recoveryAmount">Recovered amount</label>
                      <input
                        id="recoveryAmount"
                        className="form-control"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={recoveryAmount}
                        onChange={(event) => setRecoveryAmount(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="recoveredAt">Recovered on</label>
                      <input
                        id="recoveredAt"
                        className="form-control"
                        type="date"
                        required
                        value={recoveredAt}
                        onChange={(event) => setRecoveredAt(event.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={busy === 'recovery'}
                      >
                        Record recovery + fee
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          </div>
        )}
      </Layout>
    </Protected>
  );
}
