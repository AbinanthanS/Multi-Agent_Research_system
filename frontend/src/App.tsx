import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { NewResearchPage } from "./pages/NewResearchPage";
import { ResearchWorkspacePage } from "./pages/ResearchWorkspacePage";
import { LiteraturePage } from "./pages/LiteraturePage";
import { ClaimsPage } from "./pages/ClaimsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RunsPage } from "./pages/RunsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/runs" element={<RunsPage />} />
                <Route path="/research/new" element={<NewResearchPage />} />
                <Route path="/research/:id" element={<ResearchWorkspacePage />} />
                <Route path="/literature" element={<LiteraturePage />} />
                <Route path="/claims" element={<ClaimsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WorkspaceProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
