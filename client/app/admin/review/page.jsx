'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Check, X, Eye } from 'lucide-react';
import Layout from '@/components/Layout';
import Protected from '@/components/Protected';
import StatusPill from '@/components/StatusPill';
import { api } from '@/lib/api';

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState({});

  const load = () => api.getReviewQueue().then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const review = async (id, status) => {
    await api.reviewLine(id, { reviewStatus: status, reviewNote: note[id] || '' });
    load();
  };

  return (
    <Protected roles={['admin', 'operator']}>
      <Layout title="Review Queue" subtitle="Confirm or reject low-confidence AI flags before dispute letters go out">
        <div className="alert info mb-16">
          <Eye size={16} />
          <div><strong>Operator gate.</strong> PRD risk mitigation requires human review for anything under 0.7 confidence. Confirming a flag makes it eligible for dispute letters; rejecting removes it.</div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Flagged lines awaiting review</h3><span className="pill amber">{items.length} items</span></div>
          {items.length === 0 && <div className="empty"><ClipboardCheck size={30} style={{ margin: '0 auto 10px' }} />Queue is clear. All flags have been reviewed.</div>}
          {items.map((item) => (
            <div key={item._id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
              <div className="flex justify-between items-center gap-12">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <span className="mono strong">{item.invoiceRef?.invoiceNumber || item.invoice?.invoiceNumber || '—'}</span>
                    <StatusPill value={item.verdict} />
                    <span className="text-sm text-muted">Confidence: {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : '—'}</span>
                  </div>
                  <div className="text-sm text-slate">{item.description} · {item.invoiceRef?.carrierName} · {item.invoiceRef?.port}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 6 }}>{item.reason}</div>
                  <div className="flex gap-16 text-sm" style={{ marginTop: 8 }}>
                    <span>Billed <span className="num">{money(item.billedAmount)}</span></span>
                    <span>Correct <span className="num">{money(item.correctAmount)}</span></span>
                    <span>Recoverable <span className="num strong text-indigo">{money((item.billedAmount || 0) - (item.correctAmount || 0))}</span></span>
                  </div>
                </div>
                <div style={{ width: 260, flexShrink: 0 }}>
                  <input className="form-control" placeholder="Review note (optional)" value={note[item._id] || ''} onChange={(e) => setNote({ ...note, [item._id]: e.target.value })} />
                  <div className="flex gap-8" style={{ marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => review(item._id, 'confirmed')}><Check size={12} /> Confirm</button>
                    <button className="btn btn-outline btn-sm" onClick={() => review(item._id, 'rejected')}><X size={12} /> Reject</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </Protected>
  );
}
