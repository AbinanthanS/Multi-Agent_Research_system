/**
 * api.js — centralised HTTP client for the ResearchOS backend.
 * All calls use the Vite dev proxy (`/api → localhost:5000`).
 */

const BASE = '/api/v1';

function normalizeRun(r) {
  if (!r || typeof r !== 'object') return r;
  return {
    ...r,
    topic: r.topic || r.question || 'Untitled Research',
    question: r.question || r.topic || 'Untitled Research',
    max_papers: r.max_papers || r.filters?.maxPapers || 20,
    description: r.description || (r.filters?.domain ? `Domain: ${r.filters.domain}` : ''),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const err = new Error(data?.message || data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Research Runs ────────────────────────────────────────────────────────

export const api = {
  /** List all research runs (newest first) */
  listRuns: async () => {
    const res = await request('/research-runs');
    const items = res?.data?.items ?? res?.items ?? res?.runs ?? res?.data ?? (Array.isArray(res) ? res : []);
    return (Array.isArray(items) ? items : []).map(normalizeRun);
  },

  /** Get a single run by id */
  getRun: async (id) => {
    const res = await request(`/research-runs/${id}`);
    const run = res?.data?.run ?? res?.data ?? res?.run ?? res;
    return normalizeRun(run);
  },

  /** Create a new research run */
  createRun: async (body) => {
    const payload = {
      question: (body.topic || body.question || '').trim(),
      filters: {
        maxPapers: Number(body.max_papers || 20),
        ...(body.domain ? { domain: body.domain.trim() } : {}),
      },
    };
    const res = await request('/research-runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const run = res?.data?.run ?? res?.data ?? res?.run ?? res;
    return normalizeRun(run);
  },

  /** Update run status / metadata */
  patchRun: (id, body) =>
    request(`/research-runs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  /** Trigger paper discovery (Semantic Scholar + ArXiv) */
  discoverPapers: (id) =>
    request(`/research-runs/${id}/papers/discover`, { method: 'POST' }),

  /** Fetch all discovered papers for a run */
  getPapers: async (id) => {
    const res = await request(`/research-runs/${id}/papers`);
    const papers = res?.data?.papers ?? res?.papers ?? res?.data ?? [];
    return Array.isArray(papers) ? papers : [];
  },

  /** Trigger the AI pipeline execution */
  executeRun: (id) =>
    request(`/research-runs/${id}/execute`, { method: 'POST' }),

  /** Fetch the synthesised markdown report */
  getReport: async (id) => {
    const res = await request(`/research-runs/${id}/report`);
    const raw = res?.data?.report ?? res?.report ?? res?.data ?? res;
    const content = raw?.markdown_content || raw?.content || '';
    return { ...raw, content };
  },

  /** Fetch all extracted claims + evidence */
  getClaims: async (id) => {
    const res = await request(`/research-runs/${id}/claims`);
    const claims = res?.data?.claims ?? res?.claims ?? res?.data ?? (Array.isArray(res) ? res : []);
    return Array.isArray(claims) ? claims : [];
  },
};
