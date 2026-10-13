import { Calendar, Clock3, Ellipsis, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import {
  formatDateTime,
  formatDuration,
  formatRelative,
} from "../../lib/format";
import type { ResearchRun } from "../../types/domain";

export function ResearchRunCard({ run }: { run: ResearchRun }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const duration = formatDuration(run.started_at, run.completed_at);
  const domain = run.filters?.domain;
  const maxPapers = run.filters?.maxPapers;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenu(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <article
      className="group relative cursor-pointer rounded-xl border border-line bg-elevated p-5 transition-colors hover:border-accent/35"
      onClick={() => navigate(`/research/${run.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/research/${run.id}`);
      }}
      role="link"
      tabIndex={0}
      aria-label={run.question}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <StatusBadge status={run.status} />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="rounded-md p-1 text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-fg focus:opacity-100"
            aria-label="Run actions"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
          >
            <Ellipsis size={16} />
          </button>
          {menu ? (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-line bg-app p-1 shadow-xl">
              <button
                type="button"
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-fg-secondary hover:bg-surface"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/research/${run.id}`);
                }}
              >
                Open workspace
              </button>
              <button
                type="button"
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-fg-secondary hover:bg-surface"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/research/${run.id}?tab=literature`);
                }}
              >
                View literature
              </button>
              {run.status === "completed" ? (
                <button
                  type="button"
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-fg-secondary hover:bg-surface"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/research/${run.id}?tab=report`);
                  }}
                >
                  Open report
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <h3 className="line-clamp-3 text-[15px] leading-snug font-medium text-fg">
        {run.question}
      </h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {domain ? (
          <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-secondary">
            {domain}
          </span>
        ) : null}
        {typeof maxPapers === "number" ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-secondary">
            <Layers size={11} />
            {maxPapers} papers
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} />
          {formatDateTime(run.created_at)}
        </span>
        {duration ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 size={11} />
            {duration}
          </span>
        ) : null}
        {formatRelative(run.updated_at) ? (
          <span>Updated {formatRelative(run.updated_at)}</span>
        ) : null}
      </div>
    </article>
  );
}
