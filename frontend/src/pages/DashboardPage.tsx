import { Activity, AlertCircle, CheckCircle2, LayoutGrid, List, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useResearchRuns } from "../hooks/useResearch";
import { useWorkspace } from "../context/WorkspaceContext";
import { PageHeader } from "../components/ui/PageHeader";
import { MetricCard } from "../components/ui/MetricCard";
import { SearchInput } from "../components/ui/SearchInput";
import { FilterPopover } from "../components/ui/FilterPopover";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingSkeleton, MetricSkeleton } from "../components/ui/LoadingSkeleton";
import { ResearchRunCard } from "../components/research/ResearchRunCard";
import { ResearchRunTable } from "../components/research/ResearchRunTable";
import type { ResearchRunStatus } from "../types/domain";

type SortKey = "created" | "updated" | "status";

export function DashboardPage() {
  const { workspaceName } = useWorkspace();
  const { data, isLoading, isError, error, refetch, isFetching } = useResearchRuns();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ResearchRunStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [view, setView] = useState<"cards" | "table">("cards");

  const runs = data?.items ?? [];
  const metrics = useMemo(() => {
    return {
      total: runs.length,
      completed: runs.filter((r) => r.status === "completed").length,
      running: runs.filter((r) => r.status === "running").length,
      other: runs.filter((r) => r.status === "pending" || r.status === "failed").length,
    };
  }, [runs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs
      .filter((run) => {
        const textMatch =
          !q ||
          run.question.toLowerCase().includes(q) ||
          (run.filters?.domain ?? "").toLowerCase().includes(q);
        const statusMatch = status === "all" || run.status === status;
        return textMatch && statusMatch;
      })
      .sort((a, b) => {
        if (sort === "status") return a.status.localeCompare(b.status);
        if (sort === "updated") return +new Date(b.updated_at) - +new Date(a.updated_at);
        return +new Date(b.created_at) - +new Date(a.created_at);
      });
  }, [runs, query, status, sort]);

  return (
    <div>
      <PageHeader
        eyebrow={workspaceName}
        title="Scientific intelligence overview"
        description="Launch evidence-grounded literature reviews, inspect multi-agent investigations, and open publication-quality reports from a single workspace."
        actions={
          <>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-fg-secondary hover:text-fg"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              to="/research/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent-strong px-3 text-sm text-white"
            >
              <Plus size={14} />
              New Research
            </Link>
          </>
        }
      />

      <Link
        to="/research/new"
        className="mb-8 block rounded-2xl border border-line bg-elevated p-5 transition-colors hover:border-accent/40"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-muted">
          Start an investigation
        </p>
        <p className="mt-2 text-lg text-fg-secondary">
          Ask a research question and the pipeline will discover literature, extract claims, and synthesize a review.
        </p>
      </Link>

      {isLoading ? (
        <MetricSkeleton />
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total runs" value={metrics.total} icon={Activity} hint="From GET /research-runs" />
          <MetricCard label="Completed" value={metrics.completed} icon={CheckCircle2} />
          <MetricCard label="Running" value={metrics.running} icon={Sparkles} />
          <MetricCard label="Pending / failed" value={metrics.other} icon={AlertCircle} />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-fg">Recent research activity</h2>
          <p className="text-xs text-fg-muted">
            Search, status, and sort are applied in the browser on the fetched list.
            {data?.pagination ? ` Showing ${runs.length} of ${data.pagination.total} server records.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Filter questions (client-side)" className="w-64" />
          <FilterPopover value={status} onChange={setStatus} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg-secondary"
            aria-label="Sort runs"
          >
            <option value="created">Newest created</option>
            <option value="updated">Recently updated</option>
            <option value="status">Status</option>
          </select>
          <div className="flex rounded-lg border border-line">
            <button
              type="button"
              aria-label="Card view"
              className={`px-2 py-1.5 ${view === "cards" ? "bg-surface text-fg" : "text-fg-muted"}`}
              onClick={() => setView("cards")}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              aria-label="Table view"
              className={`px-2 py-1.5 ${view === "table" ? "bg-surface text-fg" : "text-fg-muted"}`}
              onClick={() => setView("table")}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : "Failed to load runs"} onRetry={() => void refetch()} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="This workspace has no research runs yet"
          description="Create a research question to discover papers, extract evidence-grounded claims, and generate a scientific review."
          action={
            <Link to="/research/new" className="rounded-lg bg-accent-strong px-3 py-2 text-sm text-white">
              Create first investigation
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No runs match the current filters"
          description="Clear the client-side search or status filter to see the full fetched list."
        />
      ) : view === "table" ? (
        <ResearchRunTable runs={filtered} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((run) => (
            <ResearchRunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      {!isLoading && runs.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2 text-sm">
          <Link to="/literature" className="rounded-lg border border-line px-3 py-2 text-fg-secondary hover:text-fg">
            Discover papers
          </Link>
          <Link to="/claims" className="rounded-lg border border-line px-3 py-2 text-fg-secondary hover:text-fg">
            Inspect evidence
          </Link>
          <Link to="/reports" className="rounded-lg border border-line px-3 py-2 text-fg-secondary hover:text-fg">
            Open reports
          </Link>
        </div>
      ) : null}
    </div>
  );
}
