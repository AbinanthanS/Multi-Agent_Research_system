import { pool } from "../config/database.js";

export async function findPapersByRunId(runId, db = pool) {
  const result = await db.query(
    `
      SELECT
        p.id,
        p.title,
        p.abstract,
        p.authors,
        p.published_year,
        p.url,
        p.pdf_url
      FROM papers p
      INNER JOIN research_run_papers rrp ON rrp.paper_id = p.id
      WHERE rrp.run_id = $1
      ORDER BY rrp.added_at ASC
    `,
    [runId],
  );

  return result.rows;
}

export async function persistPassages(passages, db = pool) {
  if (!passages || passages.length === 0) return [];

  const inserted = [];
  for (const p of passages) {
    const res = await db.query(
      `
        INSERT INTO paper_passages (
          id, paper_id, passage_index, text, page_number, section
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, paper_id, passage_index, page_number, section
      `,
      [p.id, p.paper_id, p.passage_index, p.text, p.page_number, p.section],
    );
    if (res.rows[0]) inserted.push(res.rows[0]);
  }
  return inserted;
}

export async function persistClaimsAndEvidence(
  runId,
  claims,
  evidenceList,
  db = pool,
) {
  for (const c of claims) {
    await db.query(
      `
        INSERT INTO claims (
          id, run_id, claim_text, claim_type, confidence
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `,
      [c.id, runId, c.claim_text, c.claim_type, c.confidence],
    );
  }

  for (const e of evidenceList) {
    await db.query(
      `
        INSERT INTO claim_evidence (
          claim_id, passage_id, support_type, explanation
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (claim_id, passage_id) DO NOTHING
      `,
      [e.claim_id, e.passage_id, e.support_type, e.explanation],
    );
  }
}

export async function persistReport(runId, report, db = pool) {
  // Determine report version
  const verRes = await db.query(
    `SELECT COALESCE(MAX(version), 0) + 1 AS next_ver FROM reports WHERE run_id = $1`,
    [runId],
  );
  const version = verRes.rows[0]?.next_ver ?? 1;

  const result = await db.query(
    `
      INSERT INTO reports (
        run_id, version, title, markdown_content, structured_content
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, run_id, version, title, markdown_content, structured_content, created_at
    `,
    [
      runId,
      version,
      report.title,
      report.markdown_content,
      JSON.stringify(report.structured_content ?? {}),
    ],
  );

  return result.rows[0];
}

export async function getLatestReport(runId, db = pool) {
  const result = await db.query(
    `
      SELECT id, run_id, version, title, markdown_content, structured_content, created_at
      FROM reports
      WHERE run_id = $1
      ORDER BY version DESC
      LIMIT 1
    `,
    [runId],
  );

  return result.rows[0] ?? null;
}

export async function getClaimsWithEvidence(runId, db = pool) {
  const result = await db.query(
    `
      SELECT
        c.id,
        c.claim_text,
        c.claim_type,
        c.confidence,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'passage_id', ce.passage_id,
              'support_type', ce.support_type,
              'explanation', ce.explanation,
              'passage_text', pp.text,
              'page_number', pp.page_number,
              'section', pp.section
            )
          ) FILTER (WHERE ce.passage_id IS NOT NULL),
          '[]'::json
        ) AS evidence
      FROM claims c
      LEFT JOIN claim_evidence ce ON ce.claim_id = c.id
      LEFT JOIN paper_passages pp ON pp.id = ce.passage_id
      WHERE c.run_id = $1
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `,
    [runId],
  );

  return result.rows;
}
