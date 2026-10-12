/**
 * ToastContainer.jsx — renders all active toast notifications.
 */
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} color="var(--status-completed)" />,
  error:   <XCircle     size={16} color="var(--status-failed)" />,
  info:    <Info        size={16} color="var(--accent-sky)" />,
};

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role="alert">
          {ICONS[t.type] ?? ICONS.info}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onRemove(t.id)}
            aria-label="Dismiss"
            style={{ padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
