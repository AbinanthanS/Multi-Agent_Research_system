import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import type { ToastItem } from "../../hooks/useToast";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const COLORS = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
  warning: "text-warning",
};

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="no-print fixed right-5 bottom-5 z-60 flex w-[min(100%-2rem,360px)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className="flex items-start gap-3 rounded-xl border border-line bg-elevated px-4 py-3 text-sm shadow-2xl"
          >
            <Icon size={16} className={`mt-0.5 ${COLORS[toast.type]}`} />
            <p className="flex-1 text-fg">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onRemove(toast.id)}
              className="text-fg-muted hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
