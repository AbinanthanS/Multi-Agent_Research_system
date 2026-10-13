import { CheckCircle2, Clock, Loader2, MinusCircle, XCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import type { ResearchRunStatus } from "../../types/domain";

const CONFIG: Record<
  ResearchRunStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    className: "bg-warning/10 text-warning border-warning/25",
    icon: Clock,
  },
  running: {
    label: "Running",
    className: "bg-info/10 text-info border-info/25",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success border-success/25",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-error/10 text-error border-error/25",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-fg-muted/10 text-fg-muted border-line",
    icon: MinusCircle,
  },
};

export function StatusBadge({ status }: { status?: string }) {
  const cfg = CONFIG[(status as ResearchRunStatus) ?? "pending"] ?? {
    label: status ?? "Unknown",
    className: "bg-fg-muted/10 text-fg-muted border-line",
    icon: Clock,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        cfg.className,
      )}
    >
      <Icon
        size={11}
        className={status === "running" ? "animate-spin" : undefined}
      />
      {cfg.label}
    </span>
  );
}
