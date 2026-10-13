import { confidenceRatio, formatConfidence } from "../../lib/format";

export function ConfidenceIndicator({ value }: { value: number | null | undefined }) {
  const ratio = confidenceRatio(value);
  const label = formatConfidence(value);
  if (ratio == null || !label) {
    return <span className="text-xs text-fg-muted">No confidence score</span>;
  }
  return (
    <div className="flex items-center gap-2" title="Model-reported confidence, not a calibrated probability">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-fg-secondary">{label}</span>
    </div>
  );
}
