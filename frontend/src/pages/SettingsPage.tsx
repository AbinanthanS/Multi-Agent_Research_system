import { PageHeader } from "../components/ui/PageHeader";
import { useHealth } from "../hooks/useResearch";
import { useWorkspace, WORKSPACES } from "../context/WorkspaceContext";

export function SettingsPage() {
  const health = useHealth();
  const { workspaceId, setWorkspaceId } = useWorkspace();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Workspace context is stored locally. Research records always come from the backend API."
      />
      <section className="mb-6 rounded-xl border border-line bg-elevated p-5">
        <h2 className="text-sm font-medium">Workspace</h2>
        <p className="mt-1 text-sm text-fg-secondary">
          Labels the header and greeting. It does not create a separate server-side dataset.
        </p>
        <select
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          className="mt-3 h-10 w-full rounded-lg border border-line bg-app px-3 text-sm"
        >
          {WORKSPACES.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </section>
      <section className="mb-6 rounded-xl border border-line bg-elevated p-5">
        <h2 className="text-sm font-medium">API connection</h2>
        <dl className="mt-3 space-y-2 font-mono text-xs text-fg-secondary">
          <div className="flex justify-between">
            <dt>Base URL</dt>
            <dd>/api/v1</dd>
          </div>
          <div className="flex justify-between">
            <dt>Health</dt>
            <dd>
              {health.isLoading
                ? "checking"
                : health.isError
                  ? "unreachable"
                  : health.data?.status ?? "unknown"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Service</dt>
            <dd>{health.data?.service ?? "—"}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-xl border border-line bg-elevated p-5">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          Research Intelligence uses a dark scientific workspace as the primary theme. Light mode is not implemented.
        </p>
        <p className="mt-4 font-mono text-xs text-fg-muted">Application version 0.1.0</p>
      </section>
    </div>
  );
}
