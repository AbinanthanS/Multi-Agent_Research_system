import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDateTime, formatDuration, formatRelative } from "../../lib/format";
import type { ResearchRun } from "../../types/domain";

export function ResearchRunTable({ runs }: { runs: ResearchRun[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-surface text-[11px] uppercase tracking-[0.08em] text-fg-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Question</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Scope</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-surface/60"
              onClick={() => navigate(`/research/${run.id}`)}
            >
              <td className="max-w-md px-4 py-3">
                <p className="line-clamp-2 font-medium text-fg">{run.question}</p>
                {run.filters?.domain ? (
                  <p className="mt-1 text-xs text-fg-muted">{run.filters.domain}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={run.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-fg-secondary">
                {typeof run.filters?.maxPapers === "number"
                  ? `${run.filters.maxPapers} papers`
                  : "—"}
                {formatDuration(run.started_at, run.completed_at)
                  ? ` · ${formatDuration(run.started_at, run.completed_at)}`
                  : ""}
              </td>
              <td className="px-4 py-3 text-xs text-fg-secondary">
                {formatDateTime(run.created_at)}
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">
                {formatRelative(run.updated_at) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
