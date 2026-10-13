import {
  BookOpen,
  FileText,
  LayoutDashboard,
  PanelLeft,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useHealth } from "../../hooks/useResearch";
import { useWorkspace, WORKSPACES } from "../../context/WorkspaceContext";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/runs", label: "Research Runs", icon: Sparkles },
  { to: "/literature", label: "Literature Discovery", icon: BookOpen },
  { to: "/claims", label: "Claims & Evidence", icon: ShieldCheck },
  { to: "/reports", label: "Research Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { workspaceId, setWorkspaceId } = useWorkspace();
  const health = useHealth();
  const online = health.data?.status === "ok" || health.data?.status === "ready";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-sidebar transition-[width,transform] duration-200",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-strong text-sm font-semibold text-white">
            RI
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">Research Intelligence</p>
              <p className="text-[11px] text-fg-muted">Evidence workspace</p>
            </div>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="px-3 pb-4">
            <label className="sr-only" htmlFor="workspace-select">
              Workspace
            </label>
            <select
              id="workspace-select"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-elevated px-2 text-xs text-fg"
            >
              {WORKSPACES.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 px-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-secondary hover:bg-elevated hover:text-fg",
                  collapsed && "justify-center px-2",
                  isActive && "bg-elevated text-fg",
                )
              }
            >
              <item.icon size={16} />
              {!collapsed ? item.label : null}
            </NavLink>
          ))}
        </nav>

        <div className={cn("border-t border-line p-3", collapsed && "px-2")}>
          <button
            type="button"
            onClick={onToggle}
            className="mb-3 hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-fg-muted hover:bg-elevated hover:text-fg md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={15} />
            {!collapsed ? <span className="text-xs">Collapse</span> : null}
          </button>
          <div className={cn("flex items-center gap-2 text-xs", collapsed && "justify-center")}>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                health.isError ? "bg-error" : online ? "bg-success" : "bg-warning",
              )}
            />
            {!collapsed ? (
              <span className="text-fg-muted">
                {health.isError ? "API offline" : online ? "API connected" : "Checking API"}
              </span>
            ) : null}
          </div>
          {!collapsed ? (
            <p className="mt-2 font-mono text-[10px] text-fg-muted">v0.1.0</p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
