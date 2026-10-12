import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import {
  findResearchRunById,
  updateResearchRun,
} from "../repositories/research-runs.repository.js";
import {
  findPapersByRunId,
  getClaimsWithEvidence,
  getLatestReport,
  persistClaimsAndEvidence,
  persistPassages,
  persistReport,
} from "../repositories/research-execution.repository.js";
import { ApiError } from "../utils/api-error.js";

export async function executeResearchWorkflow(runId) {
  const run = await findResearchRunById(runId);
  if (!run) {
    throw new ApiError(404, "RUN_NOT_FOUND", `Research run not found: ${runId}`);
  }

  // Fetch candidate papers
  const papers = await findPapersByRunId(runId);
  if (!papers || papers.length === 0) {
    throw new ApiError(
      400,
      "NO_PAPERS_DISCOVERED",
      "Cannot execute research run without discovered papers. Please run paper discovery first.",
    );
  }

  // Update status to running (reset through pending if previous run failed/cancelled)
  let currentRun = run;
  if (currentRun.status === "failed" || currentRun.status === "cancelled") {
    currentRun = await updateResearchRun(runId, { status: "pending" }, currentRun.version);
  }
  if (currentRun.status !== "running") {
    currentRun = await updateResearchRun(runId, { status: "running" }, currentRun.version);
  }

  try {
    // Call Python AI Service (with 5-minute timeout)
    const aiResponse = await fetch(`${env.AI_SERVICE_URL}/api/v1/research/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(300_000),
      body: JSON.stringify({
        run_id: runId,
        question: currentRun.question,
        papers: papers.map((p) => ({
          id: p.id,
          title: p.title,
          abstract: p.abstract,
          authors: Array.isArray(p.authors) ? p.authors : [],
          published_year: p.published_year,
          url: p.url,
          pdf_url: p.pdf_url,
        })),
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI service failed (${aiResponse.status}): ${errText}`);
    }

    const aiData = await aiResponse.json();

    // Persist all generated artifacts in a transaction
    const client = await pool.connect();
    let savedReport = null;

    try {
      await client.query("BEGIN");

      const validSupportTypes = new Set(["supporting", "contradicting", "contextual"]);
      const normalizedEvidence = (aiData.evidence || []).map((e) => ({
        ...e,
        support_type: validSupportTypes.has(e.support_type)
          ? e.support_type
          : e.support_type === "supports"
            ? "supporting"
            : e.support_type === "contextualizes"
              ? "contextual"
              : e.support_type === "refutes"
                ? "contradicting"
                : "supporting",
      }));

      await persistPassages(aiData.passages, client);
      await persistClaimsAndEvidence(
        runId,
        aiData.claims,
        normalizedEvidence,
        client,
      );
      savedReport = await persistReport(runId, aiData.report, client);

      // Transition to completed
      await client.query(
        `
          UPDATE research_runs
          SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [runId],
      );

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    const claims = await getClaimsWithEvidence(runId);

    return {
      runId,
      status: "completed",
      report: savedReport,
      claims,
    };
  } catch (error) {
    // Attempt to mark run as failed
    try {
      await pool.query(
        `
          UPDATE research_runs
          SET
            status = 'failed',
            error_message = $2,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [runId, error.message],
      );
    } catch {
      // Ignore transition failure during error recovery
    }

    throw new ApiError(
      502,
      "RESEARCH_EXECUTION_FAILED",
      `Research workflow execution failed: ${error.message}`,
    );
  }
}

export async function fetchRunReport(runId) {
  const run = await findResearchRunById(runId);
  if (!run) {
    throw new ApiError(404, "RUN_NOT_FOUND", `Research run not found: ${runId}`);
  }
  const report = await getLatestReport(runId);
  return { runId, report };
}

export async function fetchRunClaims(runId) {
  const run = await findResearchRunById(runId);
  if (!run) {
    throw new ApiError(404, "RUN_NOT_FOUND", `Research run not found: ${runId}`);
  }
  const claims = await getClaimsWithEvidence(runId);
  return { runId, claims };
}
