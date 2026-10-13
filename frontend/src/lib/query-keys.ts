export const queryKeys = {
  health: ["health"] as const,
  runs: (params?: { limit?: number; offset?: number }) =>
    ["research-runs", params ?? {}] as const,
  run: (id: string) => ["research-runs", id] as const,
  papers: (id: string) => ["research-runs", id, "papers"] as const,
  claims: (id: string) => ["research-runs", id, "claims"] as const,
  report: (id: string) => ["research-runs", id, "report"] as const,
};
