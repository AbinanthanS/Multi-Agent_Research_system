import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../lib/query-keys";
import type { CreateResearchRunInput, ResearchRunStatus } from "../types/domain";

const TERMINAL: ResearchRunStatus[] = ["completed", "failed", "cancelled"];

export function useResearchRuns() {
  return useQuery({
    queryKey: queryKeys.runs({ limit: 100, offset: 0 }),
    queryFn: ({ signal }) => api.listRuns({ limit: 100, offset: 0 }, signal),
  });
}

export function useResearchRun(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.run(id ?? ""),
    queryFn: ({ signal }) => api.getRun(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running") return 4000;
      if (status === "pending") return 8000;
      return false;
    },
  });
}

export function usePapers(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.papers(id ?? ""),
    queryFn: ({ signal }) => api.getPapers(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useClaims(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.claims(id ?? ""),
    queryFn: ({ signal }) => api.getClaims(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useReport(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.report(id ?? ""),
    queryFn: ({ signal }) => api.getReport(id!, signal),
    enabled: Boolean(id) && enabled,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => api.getHealth(signal),
    refetchInterval: 30000,
    retry: 1,
  });
}

export function useCreateRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResearchRunInput) => api.createRun(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["research-runs"] });
    },
  });
}

export function useDiscoverPapers(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (maxPapers?: number) => api.discoverPapers(id, maxPapers),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.papers(id) });
      void client.invalidateQueries({ queryKey: queryKeys.run(id) });
    },
  });
}

export function useExecuteRun(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.executeRun(id),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: queryKeys.run(id) });
      void client.invalidateQueries({ queryKey: queryKeys.claims(id) });
      void client.invalidateQueries({ queryKey: queryKeys.report(id) });
      void client.invalidateQueries({ queryKey: ["research-runs"] });
      if (result.report) {
        client.setQueryData(queryKeys.report(id), {
          runId: id,
          report: result.report,
        });
      }
      if (result.claims) {
        client.setQueryData(queryKeys.claims(id), {
          runId: id,
          claims: result.claims,
        });
      }
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: queryKeys.run(id) });
    },
  });
}

export function isTerminalStatus(status?: ResearchRunStatus) {
  return Boolean(status && TERMINAL.includes(status));
}
