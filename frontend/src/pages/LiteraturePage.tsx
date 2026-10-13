import { useState } from "react";
import { Link } from "react-router-dom";
import { usePapers, useResearchRuns } from "../hooks/useResearch";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { EmptyState } from "../components/ui/EmptyState";
import { PaperCard } from "../components/research/PaperCard";
import { BookOpen } from "lucide-react";

export function LiteraturePage() {
  const runsQuery = useResearchRuns();
  const [runId, setRunId] = useState("");
  const papersQuery = usePapers(runId || undefined, Boolean(runId));
  const runs = runsQuery.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Literature discovery"
        description="Select a research run to inspect discovered papers. Discovery itself runs from the investigation workspace so provider results stay attached to the correct question."
      />
      {runsQuery.isLoading ? (
        <LoadingSkeleton />
      ) : runsQuery.isError ? (
        <ErrorState
          message={runsQuery.error instanceof Error ? runsQuery.error.message : "Unable to load runs"}
          onRetry={() => void runsQuery.refetch()}
        />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No runs to inspect"
          description="Create a research run, then discover papers from its workspace."
          action={
            <Link to="/research/new" className="rounded-lg bg-accent-strong px-3 py-2 text-sm text-white">
              New Research
            </Link>
          }
        />
      ) : (
        <>
          <label className="mb-2 block text-sm text-fg-secondary" htmlFor="run-select">
            Research run
          </label>
          <select
            id="run-select"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            className="mb-6 h-10 w-full max-w-xl rounded-lg border border-line bg-elevated px-3 text-sm"
          >
            <option value="">Select a run</option>
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.question}
              </option>
            ))}
          </select>
          {runId ? (
            papersQuery.isLoading ? (
              <LoadingSkeleton />
            ) : papersQuery.isError ? (
              <ErrorState
                message={papersQuery.error instanceof Error ? papersQuery.error.message : "Papers unavailable"}
                onRetry={() => void papersQuery.refetch()}
              />
            ) : !papersQuery.data?.papers.length ? (
              <EmptyState
                icon={BookOpen}
                title="No papers for this run"
                description="Open the workspace to run literature discovery against arXiv and Semantic Scholar."
                action={
                  <Link
                    to={`/research/${runId}?tab=literature`}
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    Open literature tab
                  </Link>
                }
              />
            ) : (
              <div className="max-w-3xl">
                <p className="mb-3 text-sm text-fg-muted">{papersQuery.data.count} papers</p>
                {papersQuery.data.papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-fg-muted">Choose a run to load its paper library.</p>
          )}
        </>
      )}
    </div>
  );
}
