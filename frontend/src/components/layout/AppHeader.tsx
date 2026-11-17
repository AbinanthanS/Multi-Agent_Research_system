import { Menu, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useResearchRuns } from "../../hooks/useResearch";
import { useWorkspace } from "../../context/WorkspaceContext";
import { Button } from "../ui/button";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line/70 bg-app/80 px-4 backdrop-blur-md md:px-6">
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
          <li className="font-medium text-fg-muted/80">Research Intelligence</li>
          {crumbs.map((crumb) => (
            <li key={crumb} className="flex items-center gap-2">
              <span className="text-fg-muted/40">/</span>
              <span className="truncate text-fg font-medium">{crumb}</span>
            </li>
          ))}
        </ol>
      </nav>
      <div className="relative mx-auto w-full max-w-md">
        <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search research questions…"
          aria-label="Search research runs"
          className="h-9 w-full rounded-lg border border-line/80 bg-elevated/70 pr-12 pl-9 text-sm text-fg placeholder:text-fg-muted focus:border-accent/40 focus:ring-1 focus:ring-accent/30 focus:outline-none transition-colors"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface/80 px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
          ⌘K
        </kbd>
        {open && query.trim() ? (
          <div className="specular-card absolute top-10 z-30 w-full rounded-xl bg-elevated/95 p-1 shadow-2xl backdrop-blur-md">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-fg-muted">No matching runs found.</p>
            ) : (
              matches.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface/80 transition-colors"
                  onMouseDown={() => {
                    navigate(`/research/${run.id}`);
                    setQuery("");
                  }}
                >
                  <span className="line-clamp-1 font-medium">{run.question}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <div className="hidden items-center gap-2 text-xs text-fg-muted lg:flex">
        <span className="rounded-md border border-line/70 bg-surface/50 px-2.5 py-1 font-mono text-[11px] text-fg-secondary">
          {workspaceName}
        </span>
      </div>
      {location.pathname !== "/research/new" && (
        <Button asChild size="sm" className="gap-1.5 shadow-sm">
          <Link to="/research/new">
            <Plus size={15} />
            <span className="hidden sm:inline font-medium">New Research</span>
          </Link>
        </Button>
      )}
    </header>
  );
}
