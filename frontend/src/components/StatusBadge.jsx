/**
 * StatusBadge.jsx — colour-coded pill for research run status.
 */
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const CONFIG = {
  pending:   { icon: <Clock size={11} />,       label: 'Pending' },
  running:   { icon: <Loader2 size={11} className="spin" />, label: 'Running' },
  completed: { icon: <CheckCircle2 size={11} />, label: 'Completed' },
  failed:    { icon: <XCircle size={11} />,      label: 'Failed' },
};

export function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`badge badge-${status ?? 'pending'}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
