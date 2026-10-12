import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import app from "../../src/app.js";
import { pool } from "../../src/config/database.js";

test("research execution API orchestrates AI workflow and persists artifacts", async (t) => {
  if (
    process.env.NODE_ENV !== "test" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Integration tests require a dedicated test database",
    );
  }

  const originalFetch = globalThis.fetch;
  const runId = randomUUID();
  const paperId = randomUUID();
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    // Clean up test records
    await pool.query("DELETE FROM claim_evidence WHERE claim_id IN (SELECT id FROM claims WHERE run_id = $1)", [runId]);
    await pool.query("DELETE FROM claims WHERE run_id = $1", [runId]);
    await pool.query("DELETE FROM reports WHERE run_id = $1", [runId]);
    await pool.query("DELETE FROM paper_passages WHERE paper_id = $1", [paperId]);
    await pool.query("DELETE FROM research_run_papers WHERE run_id = $1", [runId]);
    await pool.query("DELETE FROM papers WHERE id = $1", [paperId]);
    await pool.query("DELETE FROM research_runs WHERE id = $1", [runId]);
  });

  // 1. Seed a test run
  await pool.query(
    `
      INSERT INTO research_runs (id, question, status, version)
      VALUES ($1, $2, 'pending', 1)
    `,
    [runId, "How do transformer attention mechanisms scale with sequence length?"],
  );

  // 2. Seed a test paper linked to the run
  await pool.query(
    `
      INSERT INTO papers (id, source, source_id, title, abstract, authors, published_year)
      VALUES ($1, 'arxiv', $2, 'Attention Is All You Need', 'Self-attention scales quadratically.', '["Vaswani"]'::json, 2017)
    `,
    [paperId, `exec-test-${randomUUID()}`],
  );

  await pool.query(
    `
      INSERT INTO research_run_papers (run_id, paper_id, discovery_source)
      VALUES ($1, $2, 'arxiv')
    `,
    [runId, paperId],
  );

  // 3. Mock AI Service response
  const mockClaimId = randomUUID();
  const mockPassageId = randomUUID();

  globalThis.fetch = async (url, options) => {
    if (String(url).includes("/api/v1/research/execute")) {
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          run_id: runId,
          passages: [
            {
              id: mockPassageId,
              paper_id: paperId,
              passage_index: 0,
              text: "Self-attention enables massive parallelism.",
              page_number: 1,
              section: "Abstract",
            },
          ],
          claims: [
            {
              id: mockClaimId,
              claim_text: "Self-attention eliminates sequential recurrence.",
              claim_type: "finding",
              confidence: 0.95,
            },
          ],
          evidence: [
            {
              claim_id: mockClaimId,
              passage_id: mockPassageId,
              support_type: "supporting",
              explanation: "Abstract confirms elimination of recurrence.",
            },
          ],
          report: {
            title: "Transformer Attention Scaling Synthesis",
            markdown_content: "# Transformer Attention Scaling Synthesis\n\nExecutive summary...",
            structured_content: { total_papers_analyzed: 1 },
          },
        }),
      };
    }
    return originalFetch(url, options);
  };

  // 4. Trigger execution endpoint
  const execRes = await fetch(`${baseUrl}/api/v1/research-runs/${runId}/execute`, {
    method: "POST",
  });

  assert.equal(execRes.status, 200);
  const execBody = await execRes.json();
  assert.equal(execBody.status, "success");
  assert.equal(execBody.data.status, "completed");
  assert.equal(execBody.data.report.title, "Transformer Attention Scaling Synthesis");
  assert.equal(execBody.data.claims.length, 1);

  // 5. Query Report endpoint
  const reportRes = await fetch(`${baseUrl}/api/v1/research-runs/${runId}/report`);
  assert.equal(reportRes.status, 200);
  const reportBody = await reportRes.json();
  assert.equal(reportBody.data.report.title, "Transformer Attention Scaling Synthesis");

  // 6. Query Claims endpoint
  const claimsRes = await fetch(`${baseUrl}/api/v1/research-runs/${runId}/claims`);
  assert.equal(claimsRes.status, 200);
  const claimsBody = await claimsRes.json();
  assert.equal(claimsBody.data.claims.length, 1);
  assert.equal(claimsBody.data.claims[0].claim_text, "Self-attention eliminates sequential recurrence.");
  assert.equal(claimsBody.data.claims[0].evidence.length, 1);
});
