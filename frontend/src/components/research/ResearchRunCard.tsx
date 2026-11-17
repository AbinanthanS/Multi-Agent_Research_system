import { Calendar, Clock3, Ellipsis, Layers, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../ui/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDeleteRun } from "../../hooks/useResearch";
import { useToast } from "../../hooks/useToast";
import {
  formatDateTime,
  formatDuration,
  formatRelative,
} from "../../lib/format";
import type { ResearchRun } from "../../types/domain";

export function ResearchRunCard({ run }: { run: ResearchRun }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteRun = useDeleteRun();
  const duration = formatDuration(run.started_at, run.completed_at);
  const domain = run.filters?.domain;
  const maxPapers = run.filters?.maxPapers;

  return (
    <article
      className="group specular-card relative cursor-pointer rounded-xl bg-elevated/80 p-5.5 backdrop-blur-sm"
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
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1 text-fg-muted opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-fg focus:opacity-100 transition-opacity"
                aria-label="Run actions"
              >
                <Ellipsis size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/research/${run.id}`)}>
                Open workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/research/${run.id}?tab=literature`)}
              >
                View literature
              </DropdownMenuItem>
              {run.status === "completed" ? (
                <DropdownMenuItem
                  onClick={() => navigate(`/research/${run.id}?tab=report`)}
                >
                  Open report
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={deleteRun.isPending}
                className="text-error focus:bg-error/10 focus:text-error"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this research run?"
                    )
                  ) {
                    deleteRun.mutate(run.id, {
                      onSuccess: () =>
                        toast("Research run deleted.", "success"),
                      onError: (err) =>
                        toast(
                          err instanceof Error ? err.message : "Delete failed.",
                          "error"
                        ),
                    });
                  }
                }}
              >
                <Trash2 size={13} className="mr-1" />
                Delete run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
