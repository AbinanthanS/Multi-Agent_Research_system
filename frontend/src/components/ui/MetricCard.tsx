import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="specular-card rounded-xl bg-elevated/90 p-4.5 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted font-mono">
          {label}
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/20 text-accent">
          <Icon size={14} />
        </div>
      </div>
      <p className="font-mono text-2xl font-semibold tracking-tight text-fg tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
