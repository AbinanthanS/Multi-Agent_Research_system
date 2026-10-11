import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import app from "../../src/app.js";
import { pool } from "../../src/config/database.js";
import { persistDiscoveredPapers } from "../../src/services/papers.service.js";
import {
  findExistingPaper,
  upsertPaper,
} from "../../src/repositories/papers.repository.js";

test("paper persistence deduplicates records and rolls back failures", async (t) => {
  if (
    process.env.NODE_ENV !== "test" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Integration tests require a dedicated test database",
    );
  }

  const runIds = [];
  const sourceIds = [];
  const dois = [];
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(async () => {
    try {
      if (runIds.length > 0) {
        await pool.query(
          "DELETE FROM research_runs WHERE id = ANY($1::uuid[])",
          [runIds],
        );
      }

      if (sourceIds.length > 0 || dois.length > 0) {
        await pool.query(
          `
            DELETE FROM papers
            WHERE (
              source = 'arxiv'
              AND source_id = ANY($1::text[])
            )
            OR doi = ANY($2::text[])
            OR (
              source = 'semantic_scholar'
              AND source_id = ANY($3::text[])
            )
          `,
          [
            sourceIds.filter((id) => id.startsWith("arxiv-")),
            dois,
            sourceIds.filter((id) => id.startsWith("semantic-")),
          ],
        );
      }
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

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const baseUrl =
    `http://127.0.0.1:${address.port}/api/v1/research-runs`;

  async function createRun() {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "How can scientific literature reviews be improved?",
      }),
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    runIds.push(body.data.id);

    return body.data.id;
  }

  function makePaper(sourceId, overrides = {}) {
    return {
      source: "arxiv",
      source_id: sourceId,
      doi: null,
      title: "A test paper about scientific research",
      abstract: "Test abstract",
      authors: [{ name: "Test Author" }],
      published_year: 2024,
      url: "https://example.com/paper",
      pdf_url: null,
      metadata: {},
      ...overrides,
    };
  }

  // 1. Save a paper and link it to a research run.
  const runId = await createRun();
  const sourceId = `arxiv-${randomUUID()}`;
  sourceIds.push(sourceId);

  const paper = makePaper(sourceId);

  const first = await persistDiscoveredPapers({
    runId,
    papers: [paper],
  });

  assert.equal(first.count, 1);
  assert.equal(first.papers.length, 1);
  assert.ok(first.papers[0].id);

  const paperId = first.papers[0].id;

  // 2. Discover the same paper again.
  // It should reuse the existing database record.
  const second = await persistDiscoveredPapers({
    runId,
    papers: [paper],
    discoverySource: "manual",
  });

  assert.equal(second.count, 1);
  assert.equal(second.papers[0].id, paperId);

  const paperCount = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM papers
      WHERE source = $1 AND source_id = $2
    `,
    [paper.source, paper.source_id],
  );

  assert.equal(paperCount.rows[0].count, 1);

  // 3. The same paper must not create a duplicate run-paper link.
  const linkCount = await pool.query(
    `
      SELECT COUNT(*)::int AS count
      FROM research_run_papers
      WHERE run_id = $1 AND paper_id = $2
    `,
    [runId, paperId],
  );

  assert.equal(linkCount.rows[0].count, 1);

  // The original link metadata should remain unchanged.
  const link = await pool.query(
    `
      SELECT discovery_source
      FROM research_run_papers
      WHERE run_id = $1 AND paper_id = $2
    `,
    [runId, paperId],
  );

  assert.equal(link.rows[0].discovery_source, "arxiv");

  // 4. Invalid paper input should fail before writing to the database.
  await assert.rejects(
    persistDiscoveredPapers({
      runId,
      papers: [{ source: "unknown", title: "Invalid source" }],
    }),
    (error) =>
      error.statusCode === 400 &&
      error.code === "INVALID_PAPER_DATA",
  );

  await assert.rejects(
    persistDiscoveredPapers({
      runId,
      papers: {},
    }),
    (error) =>
      error.statusCode === 400 &&
      error.code === "INVALID_PAPERS",
  );

  // 5. A missing research run should return a 404 error.
  await assert.rejects(
    persistDiscoveredPapers({
      runId: randomUUID(),
      papers: [makePaper(`arxiv-${randomUUID()}`)],
    }),
    (error) =>
      error.statusCode === 404 &&
      error.code === "RESEARCH_RUN_NOT_FOUND",
  );

  // 6. Force an error after the first paper has been inserted.
  // The circular metadata fails during JSON serialization.
  // The transaction must roll back the earlier insert and link.
  const rollbackSourceId = `arxiv-${randomUUID()}`;
  sourceIds.push(rollbackSourceId);

  const circularMetadata = {};
  circularMetadata.self = circularMetadata;

  await assert.rejects(
    persistDiscoveredPapers({
      runId,
      papers: [
        makePaper(rollbackSourceId),
        makePaper(`arxiv-${randomUUID()}`, {
          metadata: circularMetadata,
        }),
      ],
    }),
    /circular/i,
  );

  const rolledBackPaper = await pool.query(
    `
      SELECT id
      FROM papers
      WHERE source = 'arxiv' AND source_id = $1
    `,
    [rollbackSourceId],
  );

  assert.equal(rolledBackPaper.rowCount, 0);

  const rolledBackLink = await pool.query(
    `
      SELECT rp.paper_id
      FROM research_run_papers rp
      JOIN papers p ON p.id = rp.paper_id
      WHERE rp.run_id = $1
        AND p.source = 'arxiv'
        AND p.source_id = $2
    `,
    [runId, rollbackSourceId],
  );

  assert.equal(rolledBackLink.rowCount, 0);

  // 7. A source ID and DOI that match different records
  // must not silently resolve to either record.
  const collisionSourceId = `arxiv-${randomUUID()}`;
  const otherSourceId = `semantic-${randomUUID()}`;
  const collisionDoi = `10.5555/${randomUUID()}`;

  sourceIds.push(collisionSourceId, otherSourceId);
  dois.push(collisionDoi);

  await upsertPaper(
    makePaper(collisionSourceId),
    pool,
  );

  await upsertPaper(
    makePaper(otherSourceId, {
      source: "semantic_scholar",
      doi: collisionDoi,
    }),
    pool,
  );

  await assert.rejects(
    findExistingPaper(
      makePaper(collisionSourceId, {
        doi: collisionDoi,
      }),
      pool,
    ),
    (error) =>
      error.statusCode === 409 &&
      error.code === "PAPER_IDENTITY_CONFLICT",
  );
});
