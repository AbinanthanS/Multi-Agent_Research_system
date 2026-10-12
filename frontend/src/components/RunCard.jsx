/**
 * RunCard.jsx — summary card shown in the dashboard list.
 */
import { Calendar, FileText, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

function fmtDate(str) {
  if (!str) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(str));
}

export function RunCard({ run, onClick }) {
  return (
    <article
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        padding: 'var(--space-5)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
      aria-label={`Research run: ${run.topic}`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={18} color="var(--accent-primary)" />
          </div>
          <h3 className="truncate" style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            {run.topic}
          </h3>
        </div>
        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          <StatusBadge status={run.status} />
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>
      </div>

      {/* Description */}
      {run.description && (
        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {run.description}
        </p>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        <Calendar size={12} />
        <span>{fmtDate(run.created_at)}</span>
      </div>
    </article>
  );
}
