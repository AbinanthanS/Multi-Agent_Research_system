import assert from "node:assert/strict";
import test from "node:test";

import { searchArxiv } from "../../src/providers/papers/arxiv.js";
import {
  searchSemanticScholar,
} from "../../src/providers/papers/semantic-scholar.js";

test("Semantic Scholar results are normalized", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const requestUrl = new URL(String(url));

    assert.equal(
      requestUrl.hostname,
      "api.semanticscholar.org",
    );
    assert.equal(options.headers.Accept, "application/json");

    return new Response(
      JSON.stringify({
        data: [
          {
            paperId: "paper-123",
            title: "  Example Research Paper  ",
            abstract: "An example abstract.",
            year: 2024,
            authors: [{ name: "Ada Lovelace" }],
            url: "https://example.org/paper",
            externalIds: { DOI: "10.1234/example" },
            openAccessPdf: { url: "https://example.org/paper.pdf" },
            citationCount: 12,
            fieldsOfStudy: ["Computer Science"],
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });

  const papers = await searchSemanticScholar({
    query: "scientific literature retrieval",
    filters: { maxPapers: 5 },
  });

  assert.equal(papers.length, 1);
  assert.equal(papers[0].source, "semantic_scholar");
  assert.equal(papers[0].source_id, "paper-123");
  assert.equal(papers[0].title, "Example Research Paper");
  assert.equal(papers[0].published_year, 2024);
  assert.deepEqual(papers[0].authors, ["Ada Lovelace"]);
  assert.equal(papers[0].doi, "10.1234/example");
  assert.equal(
    papers[0].pdf_url,
    "https://example.org/paper.pdf",
  );
});

test("arXiv results are normalized and filtered by year", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    const requestUrl = new URL(String(url));

    assert.equal(
      requestUrl.hostname,
      "export.arxiv.org",
    );

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom"
            xmlns:arxiv="http://arxiv.org/schemas/atom">
        <entry>
          <id>https://arxiv.org/abs/2401.12345v2</id>
          <title>Example arXiv Paper</title>
          <summary>Research abstract.</summary>
          <published>2024-01-15T10:00:00Z</published>
          <updated>2024-02-01T10:00:00Z</updated>
          <author><name>Ada Lovelace</name></author>
          <link rel="alternate" type="text/html"
                href="https://arxiv.org/abs/2401.12345v2"/>
          <link title="pdf" rel="related"
                type="application/pdf"
                href="https://arxiv.org/pdf/2401.12345v2"/>
          <arxiv:doi>10.1234/arxiv-example</arxiv:doi>
          <category term="cs.AI"/>
        </entry>
        <entry>
          <id>https://arxiv.org/abs/1801.00001v1</id>
          <title>Older Paper</title>
          <summary>Older abstract.</summary>
          <published>2018-01-01T10:00:00Z</published>
          <author><name>Grace Hopper</name></author>
        </entry>
      </feed>`,
      {
        status: 200,
        headers: { "Content-Type": "application/atom+xml" },
      },
    );
  });

  const papers = await searchArxiv({
    query: "scientific literature retrieval",
    filters: {
      maxPapers: 5,
      yearFrom: 2020,
      yearTo: 2025,
    },
  });

  assert.equal(papers.length, 1);
  assert.equal(papers[0].source, "arxiv");
  assert.equal(papers[0].source_id, "2401.12345");
  assert.equal(papers[0].published_year, 2024);
  assert.deepEqual(papers[0].authors, ["Ada Lovelace"]);
  assert.deepEqual(papers[0].metadata.categories, ["cs.AI"]);
  assert.equal(
    papers[0].pdf_url,
    "https://arxiv.org/pdf/2401.12345v2",
  );
});

test("provider HTTP failures are surfaced", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 503 }),
  );

  await assert.rejects(
    searchArxiv({
      query: "scientific literature retrieval",
      filters: { maxPapers: 5 },
    }),
    /arXiv returned HTTP 503/,
  );
});
