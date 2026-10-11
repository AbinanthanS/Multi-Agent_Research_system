import { env } from "../../config/env.js";
import { fetchProviderResponse } from "./http.js";

const API_URL =
  "https://api.semanticscholar.org/graph/v1/paper/search";

const FIELDS = [
  "title",
  "abstract",
  "year",
  "authors",
  "url",
  "externalIds",
  "openAccessPdf",
  "publicationDate",
  "venue",
  "fieldsOfStudy",
  "citationCount",
];

function buildYearFilter(filters = {}) {
  const { yearFrom, yearTo } = filters;

  if (yearFrom !== undefined && yearTo !== undefined) {
    return `${yearFrom}-${yearTo}`;
  }

  if (yearFrom !== undefined) return `${yearFrom}-`;
  if (yearTo !== undefined) return `-${yearTo}`;

  return undefined;
}

function normalizePaper(paper) {
  const year = Number(paper.year);

  return {
    source: "semantic_scholar",
    source_id: paper.paperId,
    doi: paper.externalIds?.DOI ?? null,
    title: paper.title.trim(),
    abstract: paper.abstract ?? null,
    authors: (paper.authors ?? [])
      .map((author) => author.name)
      .filter(Boolean),
    published_year:
      Number.isInteger(year) && year >= 1900 && year <= 2100
        ? year
        : null,
    url: paper.url ?? null,
    pdf_url: paper.openAccessPdf?.url ?? null,
    metadata: {
      publicationDate: paper.publicationDate ?? null,
      venue: paper.venue ?? null,
      fieldsOfStudy: paper.fieldsOfStudy ?? [],
      citationCount: paper.citationCount ?? null,
    },
  };
}

export async function searchSemanticScholar({
  query,
  filters = {},
  limit = filters.maxPapers ?? 20,
}) {
  const params = new URLSearchParams({
    query: filters.domain
      ? `${query} ${filters.domain}`
      : query,
    limit: String(Math.min(limit, 100)),
    fields: FIELDS.join(","),
  });

  const year = buildYearFilter(filters);

  if (year) {
    params.set("year", year);
  }

  const headers = {
    Accept: "application/json",
  };

  if (env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetchProviderResponse(
    `${API_URL}?${params.toString()}`,
    {
      provider: "Semantic Scholar",
      headers,
    },
  );

  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Semantic Scholar returned invalid JSON", {
      cause: error,
    });
  }

  if (!Array.isArray(payload.data)) {
    throw new Error("Semantic Scholar returned an unexpected response");
  }

  return payload.data
    .filter(
      (paper) =>
        typeof paper.paperId === "string" &&
        typeof paper.title === "string" &&
        paper.title.trim().length > 0,
    )
    .map(normalizePaper);
}
