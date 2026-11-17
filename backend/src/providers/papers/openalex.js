import { fetchProviderResponse } from "./http.js";

const API_URL = "https://api.openalex.org/works";

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  const words = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0) {
        words[position] = word;
      }
    }
  }

  const abstract = words.filter(Boolean).join(" ").trim();
  return abstract.length > 0 ? abstract : null;
}

function extractOpenAlexId(id) {
  const value = String(id ?? "");
  const match = value.match(/W\d+$/i);
  return match ? match[0] : value;
}

function normalizeDoi(doi) {
  if (!doi) return null;
  return String(doi)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .trim() || null;
}

function normalizeWork(work) {
  const location = work.primary_location ?? {};
  const year = Number(work.publication_year);

  return {
    source: "openalex",
    source_id: extractOpenAlexId(work.id),
    doi: normalizeDoi(work.doi),
    title: String(work.display_name ?? work.title ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: (work.authorships ?? [])
      .map((authorship) => authorship?.author?.display_name)
      .filter((name) => typeof name === "string" && name.length > 0),
    published_year:
      Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null,
    url:
      location.landing_page_url ??
      (typeof work.id === "string" ? work.id : null),
    pdf_url:
      location.pdf_url ?? work.open_access?.oa_url ?? null,
    metadata: {
      citedByCount: work.cited_by_count ?? null,
      type: work.type ?? null,
      publicationDate: work.publication_date ?? null,
    },
  };
}

export async function searchOpenAlex({
  query,
  filters = {},
  limit = filters.maxPapers ?? 20,
}) {
  const search = [query, filters.domain]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const params = new URLSearchParams({
    search,
    "per-page": String(Math.min(limit, 50)),
  });

  if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
    const from = filters.yearFrom ?? 1900;
    const to = filters.yearTo ?? 2100;
    params.set("filter", `publication_year:${from}-${to}`);
  }

  const response = await fetchProviderResponse(`${API_URL}?${params}`, {
    provider: "OpenAlex",
    headers: { Accept: "application/json" },
  });

  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("OpenAlex returned invalid JSON", { cause: error });
  }

  if (!Array.isArray(payload.results)) {
    throw new Error("OpenAlex returned an unexpected response");
  }

  return payload.results
    .map(normalizeWork)
    .filter((paper) => paper.source_id && paper.title.length > 0)
    .slice(0, limit);
}
