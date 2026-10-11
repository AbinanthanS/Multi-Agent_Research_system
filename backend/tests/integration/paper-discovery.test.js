import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import app from "../../src/app.js";
import { pool } from "../../src/config/database.js";

test("paper discovery API handles successful and failed providers", async (t) => {
  if (
    process.env.NODE_ENV !== "test" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Integration tests require a dedicated test database",
    );
  }

  const originalFetch = globalThis.fetch;
  const runIds = [];
  const arxivId = `discovery-${randomUUID()}`;
  const semanticId = randomUUID();
  const server = app.listen(0);

  let providerMode = "success";

  const arxivXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>https://arxiv.org/abs/${arxivId}v1</id>
    <title>Scientific Literature Discovery Testing</title>
    <summary>A test abstract for discovery.</summary>
    <published>2025-01-10T00:00:00Z</published>
    <author>
      <name>Test Author</name>
    </author>
    <link rel="alternate"
          type="text/html"
          href="https://arxiv.org/abs/${arxivId}"/>
    <link title="pdf"
          type="application/pdf"
          href="https://arxiv.org/pdf/${arxivId}"/>
    <category term="cs.AI"/>
  </entry>
</feed>`;


  const semanticJson = {
    data: [
      {
        paperId: semanticId,
        title: "Testing Scientific Research Discovery",
        abstract: "A second test abstract.",
        year: 2024,
        authors: [{ name: "Another Test Author" }],
        url: `https://example.com/${semanticId}`,
        externalIds: {},
        openAccessPdf: null,
        publicationDate: "2024-05-01",
        venue: "Test Conference",
        fieldsOfStudy: ["Computer Science"],
        citationCount: 3,
      },
    ],
  };

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const baseUrl =
    `http://127.0.0.1:${address.port}/api/v1/research-runs`;

  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input.url,
    );

    // Keep local API requests on the real fetch implementation.
    if (url.hostname === "127.0.0.1") {
      return originalFetch(input, init);
    }

    if (providerMode === "all-fail") {
      return new Response("Provider unavailable", {
        status: 503,
      });
    }

    if (
      url.hostname === "export.arxiv.org" &&
      providerMode === "partial-failure"
    ) {
      return new Response("Provider unavailable", {
        status: 503,
      });
    }

    if (url.hostname === "export.arxiv.org") {
      return new Response(arxivXml, {
        status: 200,
        headers: {
          "Content-Type": "application/atom+xml",
        },
      });
    }

    if (url.hostname === "api.semanticscholar.org") {
      return new Response(JSON.stringify(semanticJson), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    throw new Error(`Unexpected external request: ${url.hostname}`);
  });

  t.after(async () => {
    try {
      if (runIds.length > 0) {
        await pool.query(
          "DELETE FROM research_runs WHERE id = ANY($1::uuid[])",
          [runIds],
        );
      }

      await pool.query(
        `
          DELETE FROM papers
          WHERE (
            source = 'arxiv'
            AND source_id = $1
          )
          OR (
            source = 'semantic_scholar'
            AND source_id = $2
          )
        `,
        [arxivId, semanticId],
      );
    } finally {
      try {
        await new Promise((resolve, reject) => {
          server.close((error) =>
            error ? reject(error) : resolve(),
          );
        });
      } finally {
        await pool.end();
      }
    }
  });

  // Create a real research run.
  const createResponse = await fetch(`${baseUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question:
        "How can scientific literature discovery be tested?",
      filters: { maxPapers: 10 },
    }),
  });

  assert.equal(createResponse.status, 201);

  const createBody = await createResponse.json();
  const runId = createBody.data.id;
  runIds.push(runId);

  const discoveryUrl =
    `${baseUrl}/${runId}/papers/discover`;

  // 1. Both providers succeed.
  const successResponse = await fetch(discoveryUrl, {
    method: "POST",
  });

  assert.equal(successResponse.status, 200);

  const successBody = await successResponse.json();
  const success = successBody.data;

  assert.equal(success.runId, runId);
  assert.equal(success.discoveredCount, 2);
  assert.equal(success.savedCount, 2);
  assert.equal(success.providers.arxiv.status, "succeeded");
  assert.equal(
    success.providers.semanticScholar.status,
    "succeeded",
  );
  assert.deepEqual(success.warnings, []);
  assert.equal(success.papers.length, 2);

  // 2. One provider fails; successful results are still saved.
  providerMode = "partial-failure";

  const partialResponse = await fetch(discoveryUrl, {
    method: "POST",
  });

  assert.equal(partialResponse.status, 200);

  const partialBody = await partialResponse.json();
  const partial = partialBody.data;

  assert.equal(partial.providers.arxiv.status, "failed");
  assert.equal(
    partial.providers.semanticScholar.status,
    "succeeded",
  );
  assert.equal(partial.warnings.length, 1);
  assert.equal(partial.papers.length, 1);

  // 3. Both providers fail.
  providerMode = "all-fail";

  const failedResponse = await fetch(discoveryUrl, {
    method: "POST",
  });

  assert.equal(failedResponse.status, 502);

  const failedBody = await failedResponse.json();

  assert.equal(
    failedBody.error.code,
    "PAPER_DISCOVERY_FAILED",
  );

  // 4. An invalid research-run ID is rejected.
  const invalidResponse = await fetch(
    `${baseUrl}/not-a-uuid/papers/discover`,
    { method: "POST" },
  );

  assert.equal(invalidResponse.status, 400);
});
