import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { EvidencePassage, ResearchClaim } from "../../types/domain";
import { formatDateTime } from "../../lib/format";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

function countBy(evidence: EvidencePassage[], type: string) {
  return evidence.filter((item) => item.support_type === type).length;
}

const CHIP: Record<string, string> = {
  supporting: "text-success",
  contradicting: "text-error",
  contextual: "text-accent",
};

export function EvidenceCard({
  claim,
  onSelectEvidence,
}: {
  claim: ResearchClaim;
  onSelectEvidence: (evidence: EvidencePassage) => void;
}) {
  const [open, setOpen] = useState(false);
  const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];

  return (
    <article className="rounded-xl border border-line bg-elevated p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {claim.claim_type ? (
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-secondary">
            {claim.claim_type}
          </span>
        ) : null}
        <ConfidenceIndicator value={claim.confidence} />
        <span className="ml-auto font-mono text-[11px] text-fg-muted">
          {formatDateTime(claim.created_at)}
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-fg">{claim.claim_text}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className={CHIP.supporting}>Supporting {countBy(evidence, "supporting")}</span>
        <span className={CHIP.contradicting}>Contradicting {countBy(evidence, "contradicting")}</span>
        <span className={CHIP.contextual}>Contextual {countBy(evidence, "contextual")}</span>
        <span className="text-fg-muted">Total {evidence.length}</span>
      </div>
      {evidence.length > 0 ? (
        <>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-xs text-accent"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <ChevronDown size={14} className={open ? "rotate-180" : ""} />
            {open ? "Hide evidence" : "Inspect evidence"}
          </button>
          {open ? (
            <ul className="mt-3 space-y-2">
              {evidence.map((item, index) => (
                <li key={`${item.passage_id ?? "ev"}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onSelectEvidence(item)}
                    className="w-full rounded-lg border border-line bg-app px-3 py-2 text-left text-sm hover:border-accent/40"
                  >
                    <span className={`text-[11px] capitalize ${CHIP[item.support_type] ?? "text-fg-muted"}`}>
                      {item.support_type || "unclassified"}
                    </span>
                    <p className="mt-1 line-clamp-2 text-fg-secondary">
                      {item.passage_text || "Passage unavailable"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-xs text-fg-muted">No evidence passages were returned for this claim.</p>
      )}
    </article>
  );
}
