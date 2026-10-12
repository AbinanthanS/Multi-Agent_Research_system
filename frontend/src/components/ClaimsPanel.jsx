/**
 * ClaimsPanel.jsx — displays extracted claims and their supporting evidence.
 */
import { ShieldCheck, ShieldX, Info } from 'lucide-react';

const SUPPORT_CONFIG = {
  supporting:   { icon: <ShieldCheck size={14} />, color: 'var(--status-completed)', label: 'Supporting' },
  contradicting: { icon: <ShieldX    size={14} />, color: 'var(--status-failed)',    label: 'Contradicting' },
  contextual:   { icon: <Info        size={14} />, color: 'var(--accent-sky)',        label: 'Contextual' },
};

function EvidenceItem({ ev }) {
  const cfg = SUPPORT_CONFIG[ev.support_type] ?? SUPPORT_CONFIG.contextual;
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-4)',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      <div className="flex items-center gap-2" style={{ color: cfg.color, fontSize: '0.75rem', fontWeight: 500 }}>
        {cfg.icon}
        {cfg.label}
        {ev.confidence_score != null && (
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            {Math.round(ev.confidence_score * 100)}% confidence
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {ev.passage_text}
      </p>
    </div>
  );
}

export function ClaimsPanel({ claims }) {
  if (!claims?.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <ShieldCheck size={28} />
        </div>
        <p>No claims extracted yet. Execute the run first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="card"
          style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {/* Claim text */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)',
            }}>
              C
            </div>
            <p style={{ fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.6, flex: 1 }}>
              {claim.claim_text}
            </p>
          </div>

          {/* Evidence */}
          {claim.evidence?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingLeft: 'calc(28px + var(--space-3))' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-1)' }}>
                Evidence ({claim.evidence.length})
              </p>
              {claim.evidence.map((ev, i) => (
                <EvidenceItem key={ev.id ?? i} ev={ev} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
