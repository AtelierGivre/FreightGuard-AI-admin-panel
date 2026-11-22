import { AlertCircle, CheckCircle, Clock, FileText, XCircle, Eye, CircleDot } from 'lucide-react';

const MAP = {
  draft: { cls: 'slate', label: 'Draft', icon: FileText },
  sent: { cls: 'blue', label: 'Sent', icon: Clock },
  under_review: { cls: 'purple', label: 'Under review', icon: Eye },
  won: { cls: 'green', label: 'Won', icon: CheckCircle },
  lost: { cls: 'red', label: 'Lost', icon: XCircle },
  ok: { cls: 'green', label: 'OK', icon: CheckCircle },
  overcharged: { cls: 'amber', label: 'Overcharged', icon: AlertCircle },
  invalid: { cls: 'red', label: 'Invalid', icon: AlertCircle },
  skipped: { cls: 'slate', label: 'Manual review', icon: CircleDot },
  pending: { cls: 'amber', label: 'Pending', icon: Clock },
  processing: { cls: 'blue', label: 'Processing', icon: Clock },
  audited: { cls: 'green', label: 'Audited', icon: CheckCircle },
  failed: { cls: 'red', label: 'Failed', icon: XCircle },
  confirmed: { cls: 'green', label: 'Confirmed', icon: CheckCircle },
  rejected: { cls: 'red', label: 'Rejected', icon: XCircle },
  unreviewed: { cls: 'amber', label: 'Unreviewed', icon: Clock },
  admin: { cls: 'purple', label: 'Admin', icon: CircleDot },
  operator: { cls: 'blue', label: 'Operator', icon: CircleDot },
  user: { cls: 'slate', label: 'User', icon: CircleDot },
};

export default function StatusPill({ value }) {
  const map = MAP[value] || { cls: 'slate', label: value || '—', icon: CircleDot };
  const Icon = map.icon;
  return (
    <span className={`pill ${map.cls}`}>
      <Icon size={11} strokeWidth={2.5} />
      {map.label}
    </span>
  );
}
