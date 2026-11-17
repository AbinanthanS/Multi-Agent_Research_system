import { Copy, Play, RefreshCw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useClaims,
  useDeleteRun,
  useDiscoverPapers,
  useExecuteRun,
  usePapers,
  useReport,
  useResearchRun,
} from "../hooks/useResearch";
import { useToast } from "../hooks/useToast";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { PipelineStepper } from "../components/research/PipelineStepper";
import { PaperCard } from "../components/research/PaperCard";
import { EvidenceCard } from "../components/research/EvidenceCard";
import { EvidenceDrawer } from "../components/research/EvidenceDrawer";
import { ReportReader } from "../components/research/ReportReader";
import { SearchInput } from "../components/ui/SearchInput";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/button";
import { formatDateTime, formatDuration } from "../lib/format";
import { ApiClientError } from "../api/client";
import type { EvidencePassage, PaperDiscoveryResult, ResearchPaper } from "../types/domain";
import { BookOpen, FileText, ShieldCheck } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "literature", label: "Literature" },
  { id: "claims", label: "Claims & Evidence" },
  { id: "report", label: "Research Report" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ResearchWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "overview") as TabId;
  const runQuery = useResearchRun(id);
  const papersQuery = usePapers(id);
  const claimsQuery = useClaims(id, tab === "claims");
  const reportQuery = useReport(id, tab === "report");
  const discover = useDiscoverPapers(id ?? "");
  const execute = useExecuteRun(id ?? "");
  const deleteRun = useDeleteRun();
  const { toast } = useToast();
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [evidence, setEvidence] = useState<EvidencePassage | null>(null);
  const [paperQuery, setPaperQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const run = runQuery.data;
  const papers = useMemo(() => papersQuery.data?.papers ?? [], [papersQuery.data?.papers]);
  const duration = formatDuration(run?.started_at, run?.completed_at);
  const canDiscover = run && run.status !== "running" && run.status !== "completed";
  const canExecute =
    run &&
    run.status !== "running" &&
    run.status !== "completed" &&
    papers.length > 0 &&
    !discover.isPending;

  const filteredPapers = useMemo(() => {
    const q = paperQuery.toLowerCase();
    return papers.filter((paper) => {
      const yearOk = !yearFilter || String(paper.published_year ?? "") === yearFilter;
      const text = `${paper.title} ${paper.abstract ?? ""}`.toLowerCase();
      return yearOk && (!q || text.includes(q));
    });
  }, [papers, paperQuery, yearFilter]);

  const years = [...new Set(papers.map((p) => p.published_year).filter(Boolean))].sort();

  function setTab(next: TabId) {
    setParams({ tab: next });
  }

  async function onDiscover() {
    if (!run || discover.isPending) return;
    try {
      const result = await discover.mutateAsync(run.filters?.maxPapers);
      const arxiv = result.providers.arxiv;
      const semantic = result.providers.semanticScholar;
      const openAlex = result.providers.openAlex;
      const failed = [arxiv, semantic, openAlex].some(
        (provider) => provider && provider.status === "failed",
      );
      toast(
        failed
          ? "Discovery finished with provider warnings. Check the literature tab."
          : `Saved ${result.savedCount} of ${result.discoveredCount} discovered papers.`,
        failed ? "warning" : "success",
      );
      setTab("literature");
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "Discovery failed.", "error");
    }
  }

  async function onExecute() {
    if (execute.isPending) return;
    try {
      const result = await execute.mutateAsync();
      toast(
        result.status === "completed"
          ? "Pipeline finished. Report and claims are available."
          : `Execution returned status: ${result.status}`,
        "success",
      );
      setConfirmExecute(false);
      setTab("report");
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "Execution failed.", "error");
      setConfirmExecute(false);
    }
  }

  if (runQuery.isLoading) return <LoadingSkeleton rows={5} />;
  if (runQuery.isError) {
    return (
      <ErrorState
        title="Research run unavailable"
        message={runQuery.error instanceof Error ? runQuery.error.message : "Invalid or missing run."}
        onRetry={() => void runQuery.refetch()}
      />
    );
  }
  if (!run) return <ErrorState title="Not found" message="This research run does not exist." />;

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-fg-muted hover:text-fg">
        ← Overview
      </Link>
      <header className="specular-card mb-6 rounded-2xl bg-elevated/85 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-3xl text-xl leading-snug font-semibold tracking-tight text-fg">
            {run.question}
          </h1>
          <StatusBadge status={run.status} />
        </div>
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta
            label="Run ID"
            value={run.id}
            mono
            copyable
            onCopy={() => {
              void navigator.clipboard.writeText(run.id);
              toast("Run ID copied.", "success");
            }}
          />
          <Meta label="Created" value={formatDateTime(run.created_at)} />
          <Meta label="Completed" value={formatDateTime(run.completed_at)} />
          <Meta
            label="Scope"
            value={`${run.filters?.maxPapers ?? "—"} papers${run.filters?.domain ? ` · ${run.filters.domain}` : ""}`}
          />
        </div>
        {duration ? <p className="mt-3 font-mono text-xs text-fg-muted">Duration {duration}</p> : null}
        {run.error_message ? (
          <p className="mt-3 text-sm text-error">{run.error_message}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {canDiscover ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onDiscover()}
              disabled={discover.isPending || execute.isPending}
              className="gap-2"
            >
              <Search size={14} />
              {discover.isPending ? "Discovering papers…" : "Discover papers"}
            </Button>
          ) : null}
          {canExecute ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfirmExecute(true)}
              disabled={execute.isPending}
              className="gap-2 shadow-sm"
            >
              <Play size={14} />
              {execute.isPending ? "Executing pipeline…" : run.status === "failed" ? "Retry pipeline" : "Execute pipeline"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={run.status === "running"}
            className="gap-2"
          >
            <Trash2 size={14} />
            Delete run
          </Button>
        </div>
      </header>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-elevated/70 p-1 backdrop-blur-sm">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${tab === item.id ? "bg-surface text-fg shadow-sm" : "text-fg-secondary hover:text-fg hover:bg-surface/50"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <PipelineStepper runStatus={run.status} executing={execute.isPending} />
          {execute.isPending || run.status === "running" ? (
            <p className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-info">
              The research pipeline is executing as a single backend request. Stage-level agent progress is not streamed.
            </p>
          ) : null}
          {discover.data ? <DiscoverySummary result={discover.data} /> : null}
        </div>
      ) : null}

      {tab === "literature" ? (
        <LiteratureTab
          loading={papersQuery.isLoading || discover.isPending}
          error={papersQuery.error}
          onRetry={() => void papersQuery.refetch()}
          papers={filteredPapers}
          total={papers.length}
          query={paperQuery}
          setQuery={setPaperQuery}
          year={yearFilter}
          setYear={setYearFilter}
          years={years as number[]}
          onDiscover={canDiscover ? () => void onDiscover() : undefined}
          discovering={discover.isPending}
          discovery={discover.data}
        />
      ) : null}

      {tab === "claims" ? (
        claimsQuery.isLoading ? (
          <LoadingSkeleton />
        ) : claimsQuery.isError ? (
          <ErrorState
            message={claimsQuery.error instanceof Error ? claimsQuery.error.message : "Claims unavailable"}
            onRetry={() => void claimsQuery.refetch()}
          />
        ) : !claimsQuery.data?.claims.length ? (
          <EmptyState
            icon={ShieldCheck}
            title="No claims yet"
            description="Execute the research pipeline to extract claims and classified evidence passages."
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">{claimsQuery.data.claims.length} claims returned by the API</p>
            {claimsQuery.data.claims.map((claim) => (
              <EvidenceCard key={claim.id} claim={claim} onSelectEvidence={setEvidence} />
            ))}
          </div>
        )
      ) : null}

      {tab === "report" ? (
        reportQuery.isLoading ? (
          <LoadingSkeleton />
        ) : reportQuery.isError ? (
          <ErrorState
            message={reportQuery.error instanceof Error ? reportQuery.error.message : "Report unavailable"}
            onRetry={() => void reportQuery.refetch()}
          />
        ) : !reportQuery.data?.report?.markdown_content ? (
          <EmptyState
            icon={FileText}
            title="No report yet"
            description="A report appears here after the synthesizer stage completes successfully."
          />
        ) : (
          <ReportReader report={reportQuery.data.report} run={run} />
        )
      ) : null}

      <EvidenceDrawer
        evidence={evidence}
        onClose={() => setEvidence(null)}
        onCopied={() => toast("Passage copied.", "success")}
      />
      <ConfirmationDialog
        open={confirmExecute}
        title="Execute the research pipeline?"
        description="This starts PDF ingestion, planning, extraction, critique, and report synthesis as one backend job. Duplicate submissions are blocked while it is running."
        confirmLabel="Execute"
        loading={execute.isPending}
        onClose={() => setConfirmExecute(false)}
        onConfirm={() => void onExecute()}
      />
      <ConfirmationDialog
        open={confirmDelete}
        title="Delete this research run?"
        description="This will permanently delete this research run and all associated discovered papers, extracted claims, evidence, and synthesized reports. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteRun.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!run) return;
          try {
            await deleteRun.mutateAsync(run.id);
            toast("Research run deleted successfully.", "success");
            navigate("/");
          } catch (err) {
            toast(err instanceof Error ? err.message : "Failed to delete run.", "error");
          }
        }}
      />
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-fg-muted">{label}</p>
      <p className={`mt-1 break-all text-fg-secondary ${mono ? "font-mono text-xs" : ""}`}>
        {value}
        {copyable ? (
          <button type="button" className="ml-2 text-accent" onClick={onCopy} aria-label="Copy run ID">
            <Copy size={12} className="inline" />
          </button>
        ) : null}
      </p>
    </div>
  );
}

function DiscoverySummary({ result }: { result: PaperDiscoveryResult }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4 text-sm">
      <p className="font-medium text-fg">Latest discovery result</p>
      <p className="mt-2 text-fg-secondary">
        Discovered {result.discoveredCount} · Saved {result.savedCount}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p>
          arXiv: {result.providers.arxiv?.status ?? "not reported"}
          {result.providers.arxiv ? ` · ${result.providers.arxiv.count}` : ""}
        </p>
        <p>
          Semantic Scholar: {result.providers.semanticScholar?.status ?? "not reported"}
          {result.providers.semanticScholar ? ` · ${result.providers.semanticScholar.count}` : ""}
        </p>
        <p>
          OpenAlex: {result.providers.openAlex?.status ?? "not reported"}
          {result.providers.openAlex ? ` · ${result.providers.openAlex.count}` : ""}
        </p>
      </div>
      {result.warnings?.length ? (
        <ul className="mt-3 space-y-1 text-warning">
          {result.warnings.map((warning) => (
            <li key={warning.provider}>
              {warning.provider}: {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LiteratureTab({
  loading,
  error,
  onRetry,
  papers,
  total,
  query,
  setQuery,
  year,
  setYear,
  years,
  onDiscover,
  discovering,
  discovery,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  papers: ResearchPaper[];
  total: number;
  query: string;
  setQuery: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  years: number[];
  onDiscover?: () => void;
  discovering: boolean;
  discovery: ReturnType<typeof useDiscoverPapers>["data"];
}) {
  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Papers unavailable"}
        onRetry={onRetry}
      />
    );
  }
  return (
    <div>
      {discovery ? <DiscoverySummary result={discovery} /> : null}
      {discovering ? (
        <p className="mb-4 text-sm text-info">Searching arXiv, Semantic Scholar, and OpenAlex. Duplicate discovery is disabled until this request finishes.</p>
      ) : null}
      {total === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No papers discovered yet"
          description="Run literature discovery to search academic providers for this research question."
          action={
            onDiscover ? (
              <button
                type="button"
                onClick={onDiscover}
                disabled={discovering}
                className="rounded-lg bg-accent-strong px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Discover papers
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search titles and abstracts (client-side)" className="max-w-md flex-1" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 rounded-lg border border-line bg-surface px-2 text-sm"
              aria-label="Filter by year"
            >
              <option value="">All years</option>
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className="text-xs text-fg-muted">
              Showing {papers.length} of {total}
            </span>
          </div>
          <div className="max-w-3xl">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
