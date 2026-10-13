import { FileText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useReport, useResearchRun, useResearchRuns } from "../hooks/useResearch";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { ReportReader } from "../components/research/ReportReader";

export function ReportsPage() {
  const runsQuery = useResearchRuns();
  const completed = (runsQuery.data?.items ?? []).filter((run) => run.status === "completed");
  const [runId, setRunId] = useState("");
  const reportQuery = useReport(runId || undefined, Boolean(runId));
  const runQuery = useResearchRun(runId || undefined);

  return (
    <div>
      <PageHeader
        title="Research reports"
        description="Read publication-quality markdown reviews generated after pipeline execution."
      />
      {runsQuery.isLoading ? (
        <LoadingSkeleton />
      ) : completed.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Reports are available after a research run completes successfully."
        />
      ) : (
        <>
          <select
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            className="mb-6 h-10 w-full max-w-xl rounded-lg border border-line bg-elevated px-3 text-sm"
            aria-label="Select report"
          >
            <option value="">Select a completed run</option>
            {completed.map((run) => (
              <option key={run.id} value={run.id}>
                {run.question}
              </option>
            ))}
          </select>
          {runId && reportQuery.isLoading ? <LoadingSkeleton /> : null}
          {runId && reportQuery.isError ? (
            <ErrorState
              message={reportQuery.error instanceof Error ? reportQuery.error.message : "Report unavailable"}
              onRetry={() => void reportQuery.refetch()}
            />
          ) : null}
          {runId && reportQuery.data?.report?.markdown_content ? (
            <ReportReader report={reportQuery.data.report} run={runQuery.data} />
          ) : runId && reportQuery.data && !reportQuery.data.report ? (
            <EmptyState
              icon={FileText}
              title="No report stored"
              description="This run completed without a stored report payload."
              action={
                <Link to={`/research/${runId}?tab=report`} className="text-sm text-accent">
                  Open workspace
                </Link>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
