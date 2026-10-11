import { XMLParser, XMLValidator } from "fast-xml-parser";
import { fetchProviderResponse } from "./http.js";

const API_URL = "https://export.arxiv.org/api/query";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractArxivId(id) {
  const match = id.match(/\/abs\/(.+)$/);

  if (!match) return id;

  return match[1].replace(/v\d+$/, "");
}

function normalizeEntry(entry) {
  const id = String(entry.id ?? "");
  const links = asArray(entry.link);

  const pdfLink = links.find(
    (link) =>
      link["@_title"] === "pdf" ||
      link["@_type"] === "application/pdf",
  );

  const abstractLink = links.find(
    (link) => link["@_rel"] === "alternate",
  );

  const publishedDate = String(entry.published ?? "");
  const yearMatch = publishedDate.match(/^(\d{4})-/);

  const authors = asArray(entry.author)
    .map((author) => author?.name)
    .filter((name) => typeof name === "string" && name.length > 0);

  const categories = asArray(entry.category)
    .map((category) => category["@_term"])
    .filter(Boolean);

  const doi = entry["arxiv:doi"] ?? null;

  return {
    source: "arxiv",
    source_id: extractArxivId(id),
    doi,
    title: String(entry.title ?? "").replace(/\s+/g, " ").trim(),
    abstract: String(entry.summary ?? "").trim() || null,
    authors,
    published_year: yearMatch ? Number(yearMatch[1]) : null,
    url: abstractLink?.["@_href"] ?? id,
    pdf_url: pdfLink?.["@_href"] ?? null,
    metadata: {
      categories,
      published: entry.published ?? null,
      updated: entry.updated ?? null,
    },
  };
}

export async function searchArxiv({
  query,
  filters = {},
  limit = filters.maxPapers ?? 20,
}) {
  const searchTerms = filters.domain
    ? `${query} ${filters.domain}`
    : query;

  const params = new URLSearchParams({
    search_query: `all:${searchTerms}`,
    start: "0",
    max_results: String(Math.min(limit * 3, 100)),
    sortBy: "relevance",
    sortOrder: "descending",
  });

  const response = await fetchProviderResponse(
    `${API_URL}?${params.toString()}`,
    {
      provider: "arXiv",
      headers: { Accept: "application/atom+xml, application/xml" },
    },
  );

  const xml = await response.text();

  if (XMLValidator.validate(xml) !== true) {
    throw new Error("arXiv returned invalid XML");
  }

  let payload;

  try {
    payload = parser.parse(xml);
  } catch (error) {
    throw new Error("Could not parse arXiv response", {
      cause: error,
    });
  }

  const entries = asArray(payload.feed?.entry);

  return entries
    .map(normalizeEntry)
    .filter(
      (paper) =>
        paper.source_id &&
        paper.title.length > 0 &&
        (filters.yearFrom === undefined ||
          (paper.published_year !== null &&
            paper.published_year >= filters.yearFrom)) &&
        (filters.yearTo === undefined ||
          (paper.published_year !== null &&
            paper.published_year <= filters.yearTo)),
    )
    .slice(0, limit);
}
