import type {
  ClaimsResponse,
  CreateResearchRunInput,
  ExecuteResult,
  HealthStatus,
  PaperDiscoveryResult,
  PapersResponse,
  ReportResponse,
  ResearchRun,
  ResearchRunList,
} from "../types/domain";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  body?: unknown;

  constructor(message: string, status: number, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractError(payload: unknown, status: number): ApiClientError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const message =
      typeof payload.error.message === "string"
        ? payload.error.message
        : `HTTP ${status}`;
    const code =
      typeof payload.error.code === "string" ? payload.error.code : undefined;
    return new ApiClientError(message, status, code, payload);
  }
  if (isRecord(payload) && typeof payload.message === "string") {
    return new ApiClientError(payload.message, status, undefined, payload);
  }
  return new ApiClientError(`HTTP ${status}`, status, undefined, payload);
}

function unwrapData<T>(payload: unknown, label: string): T {
  if (!isRecord(payload)) {
    throw new ApiClientError(`Malformed ${label} response`, 0);
  }

  const ok =
    payload.success === true ||
    payload.status === "success" ||
    payload.status === "ok";

  if (payload.success === false) {
    throw extractError(payload, 0);
  }

  if (!ok || !("data" in payload)) {
    throw new ApiClientError(
      `Unexpected ${label} response envelope`,
      0,
      undefined,
      payload,
    );
  }

  return payload.data as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiClientError(
      "Unable to reach the research API. Confirm the backend is running.",
      0,
    );
  }

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiClientError(
        "The server returned a non-JSON response.",
        response.status,
        undefined,
        text,
      );
    }
  }

  if (!response.ok) {
    throw extractError(json, response.status);
  }

  return json as T;
}

export const api = {
  async listRuns(
    params: { limit?: number; offset?: number } = {},
    signal?: AbortSignal,
  ): Promise<ResearchRunList> {
    const query = new URLSearchParams({
      limit: String(params.limit ?? 100),
      offset: String(params.offset ?? 0),
    });
    const payload = await request<unknown>(`/research-runs?${query}`, { signal });
    const data = unwrapData<ResearchRunList>(payload, "research run list");
    if (!data || !Array.isArray(data.items)) {
      throw new ApiClientError("Research run list is missing items", 0, undefined, data);
    }
    return data;
  },

  async getRun(id: string, signal?: AbortSignal): Promise<ResearchRun> {
    const payload = await request<unknown>(`/research-runs/${id}`, { signal });
    const data = unwrapData<ResearchRun>(payload, "research run");
    if (!data || typeof data.id !== "string") {
      throw new ApiClientError("Research run payload is invalid", 0, undefined, data);
    }
    return data;
  },

  async createRun(input: CreateResearchRunInput, signal?: AbortSignal): Promise<ResearchRun> {
    const payload = await request<unknown>("/research-runs", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    });
    const data = unwrapData<ResearchRun>(payload, "created research run");
    if (!data || typeof data.id !== "string") {
      throw new ApiClientError("Create run response is missing an id", 0, undefined, data);
    }
    return data;
  },

  async discoverPapers(
    id: string,
    maxPapers?: number,
    signal?: AbortSignal,
  ): Promise<PaperDiscoveryResult> {
    const body: Record<string, number> = {};
    if (typeof maxPapers === "number") body.max_papers = maxPapers;
    const payload = await request<unknown>(`/research-runs/${id}/papers/discover`, {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    });
    return unwrapData<PaperDiscoveryResult>(payload, "paper discovery");
  },

  async getPapers(id: string, signal?: AbortSignal): Promise<PapersResponse> {
    const payload = await request<unknown>(`/research-runs/${id}/papers`, { signal });
    const data = unwrapData<PapersResponse>(payload, "papers");
    return {
      runId: data?.runId ?? id,
      count: data?.count ?? (Array.isArray(data?.papers) ? data.papers.length : 0),
      papers: Array.isArray(data?.papers) ? data.papers : [],
    };
  },

  async executeRun(id: string, signal?: AbortSignal): Promise<ExecuteResult> {
    const payload = await request<unknown>(`/research-runs/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({}),
      signal,
    });
    return unwrapData<ExecuteResult>(payload, "execution");
  },

  async getClaims(id: string, signal?: AbortSignal): Promise<ClaimsResponse> {
    const payload = await request<unknown>(`/research-runs/${id}/claims`, { signal });
    const data = unwrapData<ClaimsResponse>(payload, "claims");
    return {
      runId: data?.runId ?? id,
      claims: Array.isArray(data?.claims) ? data.claims : [],
    };
  },

  async getReport(id: string, signal?: AbortSignal): Promise<ReportResponse> {
    const payload = await request<unknown>(`/research-runs/${id}/report`, { signal });
    const data = unwrapData<ReportResponse>(payload, "report");
    return {
      runId: data?.runId ?? id,
      report: data?.report ?? null,
    };
  },

  async getHealth(signal?: AbortSignal): Promise<HealthStatus> {
    let response: Response;
    try {
      response = await fetch("/health", { signal });
    } catch {
      throw new ApiClientError("Health endpoint is unreachable", 0);
    }
    const json = (await response.json()) as unknown;
    if (!response.ok) {
      throw extractError(json, response.status);
    }
    return unwrapData<HealthStatus>(json, "health");
  },
};
