import { Copy, X } from "lucide-react";
import { useEffect } from "react";
import type { EvidencePassage } from "../../types/domain";

const SUPPORT_STYLES: Record<string, string> = {
  supporting: "text-success border-success/30 bg-success/10",
  contradicting: "text-error border-error/30 bg-error/10",
  contextual: "text-accent border-accent/30 bg-accent/10",
};

export function EvidenceDrawer({
  evidence,
  onClose,
  onCopied,
}: {
  evidence: EvidencePassage | null;
  onClose: () => void;
  onCopied: () => void;
}) {
  useEffect(() => {
    if (!evidence) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evidence, onClose]);

  if (!evidence) return null;

  const style = SUPPORT_STYLES[evidence.support_type] ?? "text-fg-secondary border-line bg-surface";

  async function copyPassage() {
    if (!evidence?.passage_text) return;
    await navigator.clipboard.writeText(evidence.passage_text);
    onCopied();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true">
      <button className="flex-1" aria-label="Close evidence inspector" onClick={onClose} />
      <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-elevated p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-fg-muted">Evidence inspector</p>
            <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] capitalize ${style}`}>
              {evidence.support_type || "unclassified"}
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-fg-muted hover:text-fg" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <blockquote className="rounded-xl border border-line bg-app p-4 font-serif text-[15px] leading-relaxed text-fg">
          {evidence.passage_text || "Passage text was not returned by the API."}
        </blockquote>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-fg-muted">Page</dt>
            <dd className="mt-1 font-mono text-fg-secondary">{evidence.page_number ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-fg-muted">Section</dt>
            <dd className="mt-1 text-fg-secondary">{evidence.section || "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] uppercase tracking-wider text-fg-muted">Passage ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-fg-secondary">
              {evidence.passage_id || "—"}
            </dd>
          </div>
        </dl>
        {evidence.explanation ? (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wider text-fg-muted">Explanation</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{evidence.explanation}</p>
          </div>
        ) : null}
        <p className="mt-5 text-xs text-fg-muted">
          Support labels describe how the backend classified this passage relative to the claim. They are not independent scientific verification.
        </p>
        <button
          type="button"
          onClick={() => void copyPassage()}
          disabled={!evidence.passage_text}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-fg hover:border-accent/40 disabled:opacity-40"
        >
          <Copy size={14} />
          Copy passage
        </button>
      </aside>
    </div>
  );
}
