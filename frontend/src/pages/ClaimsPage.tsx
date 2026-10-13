import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useClaims, useResearchRuns } from "../hooks/useResearch";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { EvidenceCard } from "../components/research/EvidenceCard";
import { EvidenceDrawer } from "../components/research/EvidenceDrawer";
import { useToast } from "../hooks/useToast";
import type { EvidencePassage } from "../types/domain";

export function ClaimsPage() {
  const runsQuery = useResearchRuns();
  const completed = (runsQuery.data?.items ?? []).filter((run) => run.status === "completed");
  const [runId, setRunId] = useState("");
  const claimsQuery = useClaims(runId || undefined, Boolean(runId));
  const [evidence, setEvidence] = useState<EvidencePassage | null>(null);
  const { toast } = useToast();

  return (
    <div>
      <PageHeader
        title="Claims & evidence"
        description="Inspect scientific assertions and the passages the backend classified as supporting, contradicting, or contextual."
      />
      {runsQuery.isLoading ? (
        <LoadingSkeleton />
      ) : completed.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No completed investigations"
          description="Claims appear after a research run finishes the multi-agent pipeline."
        />
      ) : (
        <>
          <select
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            className="mb-6 h-10 w-full max-w-xl rounded-lg border border-line bg-elevated px-3 text-sm"
            aria-label="Select completed run"
          >
            <option value="">Select a completed run</option>
            {completed.map((run) => (
              <option key={run.id} value={run.id}>
                {run.question}
              </option>
            ))}
          </select>
          {runId && claimsQuery.isLoading ? <LoadingSkeleton /> : null}
          {runId && claimsQuery.isError ? (
            <ErrorState
              message={claimsQuery.error instanceof Error ? claimsQuery.error.message : "Claims unavailable"}
              onRetry={() => void claimsQuery.refetch()}
            />
          ) : null}
          {runId && claimsQuery.data?.claims.length ? (
            <div className="space-y-4">
              <p className="text-sm text-fg-muted">{claimsQuery.data.claims.length} claims</p>
              {claimsQuery.data.claims.map((claim) => (
                <EvidenceCard key={claim.id} claim={claim} onSelectEvidence={setEvidence} />
              ))}
            </div>
          ) : null}
          {runId && claimsQuery.data && claimsQuery.data.claims.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No claims returned"
              description="This completed run did not include claim records."
              action={
                <Link to={`/research/${runId}?tab=claims`} className="text-sm text-accent">
                  Open workspace
                </Link>
              }
            />
          ) : null}
        </>
      )}
      <EvidenceDrawer
        evidence={evidence}
        onClose={() => setEvidence(null)}
        onCopied={() => toast("Passage copied.", "success")}
      />
    </div>
  );
}
