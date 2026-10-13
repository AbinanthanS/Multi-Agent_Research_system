import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "ri.workspace";

export const WORKSPACES = [
  { id: "primary-lab", name: "Primary Lab" },
  { id: "methods", name: "Methods Review" },
] as const;

interface WorkspaceContextValue {
  workspaceId: string;
  workspaceName: string;
  setWorkspaceId: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredWorkspace() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? WORKSPACES[0].id;
  } catch {
    return WORKSPACES[0].id;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState(readStoredWorkspace);

  const setWorkspaceId = (id: string) => {
    setWorkspaceIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore quota */
    }
  };

  const workspaceName =
    WORKSPACES.find((item) => item.id === workspaceId)?.name ?? "Primary Lab";

  const value = useMemo(
    () => ({ workspaceId, workspaceName, setWorkspaceId }),
    [workspaceId, workspaceName],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
