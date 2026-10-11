import { pool } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";
import {
  upsertPaper,
  linkPaperToRun,
} from "../repositories/papers.repository.js";

const ALLOWED_SOURCES = new Set([
  "arxiv",
  "semantic_scholar",
]);

function validatePaper(paper) {
  if (
    !paper ||
    !ALLOWED_SOURCES.has(paper.source) ||
    typeof paper.title !== "string" ||
    !paper.title.trim()
  ) {
    throw new ApiError(
      400,
      "INVALID_PAPER_DATA",
      "Invalid paper data",
    );
  }

  if (
    paper.source_id != null &&
    typeof paper.source_id !== "string"
  ) {
    throw new ApiError(
      400,
      "INVALID_PAPER_SOURCE_ID",
      "Paper source ID must be a string",
    );
  }

  if (
    paper.doi != null &&
    typeof paper.doi !== "string"
  ) {
    throw new ApiError(
      400,
      "INVALID_PAPER_DOI",
      "Paper DOI must be a string",
    );
  }
}

export async function persistDiscoveredPapers({
  runId,
  papers,
  discoverySource,
}) {
  if (!Array.isArray(papers)) {
    throw new ApiError(
      400,
      "INVALID_PAPERS",
      "Papers must be an array",
    );
  }

  if (typeof runId !== "string" || !runId.trim()) {
    throw new ApiError(
      400,
      "RESEARCH_RUN_ID_REQUIRED",
      "A research run ID is required",
    );
  }

  for (const paper of papers) {
    validatePaper(paper);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const runResult = await client.query(
      "SELECT id FROM research_runs WHERE id = $1",
      [runId],
    );

    if (runResult.rowCount === 0) {
      throw new ApiError(
        404,
        "RESEARCH_RUN_NOT_FOUND",
        "Research run not found",
      );
    }

    const savedPapers = [];

    for (const paper of papers) {
      const savedPaper = await upsertPaper(paper, client);

      await linkPaperToRun(
        {
          runId,
          paperId: savedPaper.id,
          discoverySource:
            discoverySource ?? paper.source,
        },
        client,
      );

      savedPapers.push(savedPaper);
    }

    await client.query("COMMIT");

    return {
      runId,
      count: savedPapers.length,
      papers: savedPapers,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
