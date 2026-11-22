'use client';

import { useState } from 'react';
import { ClipboardCheck, Check, X, Eye } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import { api } from '@/lib/api';
import { money, confidencePct } from '@/lib/format';
import { STAFF_ROLES, REVIEW_CONFIDENCE_THRESHOLD } from '@/lib/constants';
import { useApiData } from '@/hooks/useApiData';

export default function ReviewQueue() {
  const { data: items, loading, error, reload } = useApiData(api.getReviewQueue);
  const [notes, setNotes] = useState({});
  const [actionError, setActionError] = useState('');

  const review = async (id, reviewStatus) => {
    setActionError('');
    try {
      await api.reviewLine(id, { reviewStatus, reviewNote: notes[id] || '' });
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <Protected roles={STAFF_ROLES}>
      <Layout
        title="Review Queue"
        subtitle="Confirm or reject low-confidence flags before dispute letters go out"
      >
        <div className="alert info mb-16">
          <Eye size={16} />
          <div>
            <strong>Operator gate.</strong> Flags below{' '}
            {Math.round(REVIEW_CONFIDENCE_THRESHOLD * 100)}% confidence require human review.
            Confirming a flag makes it eligible for a dispute letter; rejecting removes it.
          </div>
        </div>

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
            <h3>Flagged lines awaiting review</h3>
            <span className="pill amber">{(items || []).length} items</span>
          </div>

          {loading && <div className="empty">Loading queue…</div>}
          {!loading && (!items || items.length === 0) && (
            <div className="empty">
              <ClipboardCheck size={30} style={{ margin: '0 auto 10px' }} />
              Queue is clear. All flags have been reviewed.
            </div>
          )}

          {(items || []).map((item) => (
            <div key={item._id} className="review-row">
              <div className="review-detail">
                <div className="review-heading">
                  <span className="mono strong">
                    {item.invoiceRef?.invoiceNumber || item.invoice?.invoiceNumber || '—'}
                  </span>
                  <StatusPill value={item.verdict} />
                  <span
                    className={`text-sm ${item.confidence < REVIEW_CONFIDENCE_THRESHOLD ? 'text-indigo' : 'text-muted'}`}
                  >
                    Confidence: {confidencePct(item.confidence)}
                  </span>
                </div>
                <div className="text-sm text-slate">
                  {item.description} · {item.invoiceRef?.carrierName || '—'} ·{' '}
                  {item.invoiceRef?.port || '—'}
                </div>
                <div className="text-sm text-muted" style={{ marginTop: 6 }}>
                  {item.reason}
                </div>
                <div className="flex gap-16 text-sm" style={{ marginTop: 8 }}>
                  <span>
                    Billed <span className="num">{money(item.billedAmount)}</span>
                  </span>
                  <span>
                    Correct <span className="num">{money(item.correctAmount)}</span>
                  </span>
                  <span>
                    Recoverable{' '}
                    <span className="num strong text-indigo">
                      {money((item.billedAmount || 0) - (item.correctAmount || 0))}
                    </span>
                  </span>
                </div>
              </div>

              <div className="review-actions">
                <input
                  className="form-control"
                  aria-label={`Review note for ${item._id}`}
                  placeholder="Review note (optional)"
                  value={notes[item._id] || ''}
                  onChange={(event) => setNotes({ ...notes, [item._id]: event.target.value })}
                />
                <div className="flex gap-8" style={{ marginTop: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => review(item._id, 'confirmed')}
                  >
                    <Check size={12} /> Confirm
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => review(item._id, 'rejected')}
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </Protected>
  );
}
