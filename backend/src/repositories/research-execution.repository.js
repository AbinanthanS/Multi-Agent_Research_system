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

const cleanStr = (val) => (typeof val === "string" ? val.replace(/\0/g, "") : val);

export async function persistPassages(passages, db = pool) {
  if (!passages || passages.length === 0) return [];

  const BATCH_SIZE = 100;
  const inserted = [];

  for (let i = 0; i < passages.length; i += BATCH_SIZE) {
    const chunk = passages.slice(i, i + BATCH_SIZE);
    const values = [];
    const valuePlaceholders = [];

    chunk.forEach((p, idx) => {
      const base = idx * 6;
      valuePlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
      );
      values.push(
        p.id,
        p.paper_id,
        p.passage_index,
        cleanStr(p.text),
        p.page_number,
        cleanStr(p.section),
      );
    });

    const query = `
      INSERT INTO paper_passages (
        id, paper_id, passage_index, text, page_number, section
      )
      VALUES ${valuePlaceholders.join(", ")}
      ON CONFLICT (id) DO NOTHING
      RETURNING id, paper_id, passage_index, page_number, section
    `;

    const res = await db.query(query, values);
    inserted.push(...res.rows);
  }
  return inserted;
}

export async function persistClaimsAndEvidence(
  runId,
  claims,
  evidenceList,
  db = pool,
) {
  if (claims && claims.length > 0) {
    const claimValues = [];
    const claimPlaceholders = [];
    claims.forEach((c, idx) => {
      const base = idx * 5;
      claimPlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      );
      claimValues.push(
        c.id,
        runId,
        cleanStr(c.claim_text),
        cleanStr(c.claim_type),
        c.confidence,
      );
    });

    await db.query(
      `
        INSERT INTO claims (id, run_id, claim_text, claim_type, confidence)
        VALUES ${claimPlaceholders.join(", ")}
        ON CONFLICT (id) DO NOTHING
      `,
      claimValues,
    );
  }

  if (evidenceList && evidenceList.length > 0) {
    const evValues = [];
    const evPlaceholders = [];
    evidenceList.forEach((e, idx) => {
      const base = idx * 4;
      evPlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`,
      );
      evValues.push(
        e.claim_id,
        e.passage_id,
        cleanStr(e.support_type),
        cleanStr(e.explanation),
      );
    });

    await db.query(
      `
        INSERT INTO claim_evidence (claim_id, passage_id, support_type, explanation)
        VALUES ${evPlaceholders.join(", ")}
        ON CONFLICT (claim_id, passage_id) DO NOTHING
      `,
      evValues,
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
      cleanStr(report.title),
      cleanStr(report.markdown_content),
      cleanStr(JSON.stringify(report.structured_content ?? {})),
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
