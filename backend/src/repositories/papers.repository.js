/*
this will handle 2 ops

1) save or reuse a paper without creating duplicate
2) link the paper to a research run without duplicating

*/

import { pool } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";

const PAPER_COLUMNS = `
  id,
  source,
  source_id,
  doi,
  title,
  abstract,
  authors,
  published_year,
  url,
  pdf_url,
  metadata,
  created_at,
  updated_at
`;

export async function findExistingPaper(paper, db = pool) {
  const result = await db.query(
    `
      SELECT ${PAPER_COLUMNS}
      FROM papers
      WHERE (
        $1::text IS NOT NULL
        AND source = $1
        AND source_id = $2
      )
      OR (
        $3::text IS NOT NULL
        AND doi = $3
      )
    `,
    [paper.source, paper.source_id, paper.doi],
  );

  if (result.rows.length > 1) {
    throw new ApiError(
      409,
      "PAPER_IDENTITY_CONFLICT",
      "Paper source ID and DOI match different existing papers",
    );
  }

  return result.rows[0] ?? null;
}

export async function upsertPaper(paper, db = pool) {
  const result = await db.query(
    `
      INSERT INTO papers (
        source,
        source_id,
        doi,
        title,
        abstract,
        authors,
        published_year,
        url,
        pdf_url,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      ON CONFLICT DO NOTHING
      RETURNING ${PAPER_COLUMNS}
    `,
    [
      paper.source,
      paper.source_id,
      paper.doi,
      paper.title,
      paper.abstract,
      JSON.stringify(paper.authors ?? []),
      paper.published_year,
      paper.url,
      paper.pdf_url,
      JSON.stringify(paper.metadata ?? {}),
    ],
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  // A unique constraint prevented the insert.
  // Reuse the paper that already exists.
  const existing = await findExistingPaper(paper, db);

  if (existing) {
    return existing;
  }

  throw new Error(
    "Paper insert conflicted, but the existing paper could not be found",
  );
}

export async function linkPaperToRun(
  {
    runId,
    paperId,
    discoverySource,
  },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO research_run_papers (
        run_id,
        paper_id,
        discovery_source
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (run_id, paper_id) DO NOTHING
      RETURNING run_id, paper_id, discovery_source, added_at
    `,
    [runId, paperId, discoverySource],
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const existing = await db.query(
    `
      SELECT run_id, paper_id, discovery_source, added_at
      FROM research_run_papers
      WHERE run_id = $1 AND paper_id = $2
    `,
    [runId, paperId],
  );

  return existing.rows[0];
}
