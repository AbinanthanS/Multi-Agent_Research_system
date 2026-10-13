import { Menu, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useResearchRuns } from "../../hooks/useResearch";
import { useWorkspace } from "../../context/WorkspaceContext";

const LABELS: Record<string, string> = {
  "/": "Overview",
  "/runs": "Research Runs",
  "/research/new": "New Research",
  "/literature": "Literature Discovery",
  "/claims": "Claims & Evidence",
  "/reports": "Research Reports",
  "/settings": "Settings",
};

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceName } = useWorkspace();
  const { data } = useResearchRuns();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const crumbs = useMemo(() => {
    if (location.pathname.startsWith("/research/") && location.pathname !== "/research/new") {
      return ["Research Runs", "Investigation"];
    }
    return [LABELS[location.pathname] ?? "Workspace"];
  }, [location.pathname]);

  const matches = (data?.items ?? [])
    .filter((run) => run.question.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-app/90 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-fg-secondary hover:bg-elevated md:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      <nav aria-label="Breadcrumb" className="hidden min-w-0 text-sm text-fg-muted sm:block">
        <ol className="flex items-center gap-2">
          <li>Research Intelligence</li>
          {crumbs.map((crumb) => (
            <li key={crumb} className="flex items-center gap-2">
              <span>/</span>
              <span className="truncate text-fg">{crumb}</span>
            </li>
          ))}
        </ol>
      </nav>
      <div className="relative mx-auto w-full max-w-md">
        <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search research questions…"
          aria-label="Search research runs"
          className="h-9 w-full rounded-lg border border-line bg-elevated pr-3 pl-9 text-sm placeholder:text-fg-muted"
        />
        {open && query.trim() ? (
          <div className="absolute top-10 z-30 w-full rounded-xl border border-line bg-elevated p-1 shadow-xl">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-fg-muted">No matching runs in this list.</p>
            ) : (
              matches.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface"
                  onMouseDown={() => {
                    navigate(`/research/${run.id}`);
                    setQuery("");
                  }}
                >
                  <span className="line-clamp-1">{run.question}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <div className="hidden items-center gap-2 text-xs text-fg-muted lg:flex">
        <span className="rounded-md border border-line px-2 py-1">{workspaceName}</span>
      </div>
      <Link
        to="/research/new"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-strong px-3 text-sm font-medium text-white hover:bg-accent"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">New Research</span>
      </Link>
    </header>
  );
}
