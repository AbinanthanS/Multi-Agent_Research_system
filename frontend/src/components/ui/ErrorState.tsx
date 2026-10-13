import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Unable to load this view",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-error/25 bg-error/5 px-5 py-8 text-center">
      <AlertTriangle className="mx-auto mb-3 text-error" size={22} />
      <h2 className="text-sm font-medium text-fg">{title}</h2>
      <p className="mt-2 text-sm text-fg-secondary">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-line bg-elevated px-3 py-1.5 text-sm text-fg hover:border-accent/40"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
