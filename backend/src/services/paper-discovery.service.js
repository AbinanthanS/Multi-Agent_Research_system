/*

Both providers run concurrently.
If one provider fails, results from the other can still be saved.
If both fail, the API returns a 502 error.
The merged result list is capped at the run's maxPapers value.
Duplicate DOI results are removed before persistence.
Provider error details and API credentials aren't included in the response.

*/


import { getRun } from "./research-runs.service.js";
import { persistDiscoveredPapers } from "./papers.service.js";
import { searchArxiv } from "../providers/papers/arxiv.js";
import {
  searchSemanticScholar,
} from "../providers/papers/semantic-scholar.js";
import { ApiError } from "../utils/api-error.js";

function paperIdentity(paper) {
  if (paper.doi) {
    return `doi:${paper.doi
      .toLowerCase()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`;
  }

  return `${paper.source}:${paper.source_id}`;
}

// Alternate providers so one provider doesn't fill the whole result list first.
function mergePapers(arxivPapers, semanticScholarPapers, limit) {
  const merged = [];
  const seen = new Set();
  const maxLength = Math.max(
    arxivPapers.length,
    semanticScholarPapers.length,
  );

  for (let i = 0; i < maxLength && merged.length < limit; i += 1) {
    for (const paper of [
      arxivPapers[i],
      semanticScholarPapers[i],
    ]) {
      if (!paper || merged.length >= limit) continue;

      const identity = paperIdentity(paper);

      if (seen.has(identity)) continue;

      seen.add(identity);
      merged.push(paper);
    }
  }

  return merged;
}

export async function discoverPapers(runId) {
  const run = await getRun(runId);
  const filters = run.filters ?? { maxPapers: 20 };
  const limit = filters.maxPapers ?? 20;

  const results = await Promise.allSettled([
    searchArxiv({
      query: run.question,
      filters,
      limit,
    }),
    searchSemanticScholar({
      query: run.question,
      filters,
      limit,
    }),
  ]);

  const [arxivResult, semanticScholarResult] = results;

  const arxivPapers =
    arxivResult.status === "fulfilled"
      ? arxivResult.value
      : [];

  const semanticScholarPapers =
    semanticScholarResult.status === "fulfilled"
      ? semanticScholarResult.value
      : [];

  if (
    arxivResult.status === "rejected" &&
    semanticScholarResult.status === "rejected"
  ) {
    throw new ApiError(
      502,
      "PAPER_DISCOVERY_FAILED",
      "All paper providers failed to return results",
    );
  }

  const papers = mergePapers(
    arxivPapers,
    semanticScholarPapers,
    limit,
  );

  const persisted = await persistDiscoveredPapers({
    runId,
    papers,
    discoverySource: "provider_search",
  });

  const providers = {
    arxiv: {
      status:
        arxivResult.status === "fulfilled"
          ? "succeeded"
          : "failed",
      count: arxivPapers.length,
    },
    semanticScholar: {
      status:
        semanticScholarResult.status === "fulfilled"
          ? "succeeded"
          : "failed",
      count: semanticScholarPapers.length,
    },
  };

  const warnings = [];

  if (arxivResult.status === "rejected") {
    warnings.push({
      provider: "arxiv",
      message: "This provider could not be searched",
    });
  }

  if (semanticScholarResult.status === "rejected") {
    warnings.push({
      provider: "semantic_scholar",
      message: "This provider could not be searched",
    });
  }

  return {
    runId,
    discoveredCount: papers.length,
    savedCount: persisted.count,
    providers,
    warnings,
    papers: persisted.papers,
  };
}
