import { Activity, AlertCircle, ArrowRight, CheckCircle2, LayoutGrid, List, RefreshCw, Sparkles } from "lucide-react";
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
import { Button } from "../components/ui/button";
import type { ResearchRunStatus } from "../types/domain";

type SortKey = "created" | "updated" | "status";

export function DashboardPage() {
  const { workspaceName } = useWorkspace();
  const { data, isLoading, isError, error, refetch, isFetching } = useResearchRuns();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ResearchRunStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [view, setView] = useState<"cards" | "table">("cards");

  const runs = useMemo(() => data?.items ?? [], [data?.items]);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <Link
        to="/research/new"
        className="group relative mb-8 block overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-elevated/80 to-surface/80 p-6 backdrop-blur-sm transition-all duration-200 hover:border-accent/40 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)]"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-2.5 py-0.5 text-[11px] font-medium text-accent font-mono uppercase tracking-wider">
              <Sparkles size={11} />
              Launch multi-agent run
            </div>
            <p className="mt-2.5 text-base font-medium text-fg sm:text-lg">
              Ask a scientific question to discover papers, verify claims, and synthesize a review.
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-strong text-white shadow-md transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight size={18} />
          </div>
        </div>
      </Link>

      {isLoading ? (
        <MetricSkeleton />
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total runs" value={metrics.total} icon={Activity} hint="Stored research executions" />
          <MetricCard label="Completed" value={metrics.completed} icon={CheckCircle2} />
          <MetricCard label="Running" value={metrics.running} icon={Sparkles} />
          <MetricCard label="Pending / failed" value={metrics.other} icon={AlertCircle} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fg">Recent research activity</h2>
          <p className="text-xs text-fg-muted">
            {data?.pagination ? `Showing ${runs.length} of ${data.pagination.total} server records.` : "Active investigations in this workspace."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Filter questions…" className="w-64" />
          <FilterPopover value={status} onChange={setStatus} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-line bg-surface/90 px-3 text-sm text-fg-secondary focus:border-accent/40 focus:outline-none"
            aria-label="Sort runs"
          >
            <option value="created">Newest created</option>
            <option value="updated">Recently updated</option>
            <option value="status">Status</option>
          </select>
          <div className="flex rounded-lg border border-line bg-surface/80 p-0.5">
            <button
              type="button"
              aria-label="Card view"
              className={`rounded-md p-1.5 transition-colors ${view === "cards" ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"}`}
              onClick={() => setView("cards")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              aria-label="Table view"
              className={`rounded-md p-1.5 transition-colors ${view === "table" ? "bg-elevated text-fg shadow-sm" : "text-fg-muted hover:text-fg"}`}
              onClick={() => setView("table")}
            >
              <List size={15} />
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
            <Button asChild>
              <Link to="/research/new">
                Create first investigation
              </Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No research runs match your filters"
          description="Try broadening the text filter or resetting the status dropdown."
        />
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((run) => (
            <ResearchRunCard key={run.id} run={run} />
          ))}
        </div>
      ) : (
        <ResearchRunTable runs={filtered} />
      )}
    </div>
  );
}
