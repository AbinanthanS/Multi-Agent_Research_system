import { pool } from "../config/database.js";

export async function createResearchRun({ question, filters }) {
  const { rows } = await pool.query(
    `INSERT INTO research_runs (question, filters)
     VALUES ($1, $2)
     RETURNING id, question, status, filters, started_at,
               completed_at, error_message, created_at,
               updated_at, version`,
    [question, JSON.stringify(filters)],
  );

  return rows[0];
}

export async function findResearchRuns({ limit, offset }) {
  const { rows } = await pool.query(
    `SELECT id, question, status, filters, started_at,
            completed_at, error_message, created_at,
            updated_at, version
     FROM research_runs
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return rows;
}

export async function countResearchRuns() {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM research_runs",
  );

  return rows[0].total;
}

export async function findResearchRunById(id) {
  const { rows } = await pool.query(
    `SELECT id, question, status, filters, started_at,
            completed_at, error_message, created_at,
            updated_at, version
     FROM research_runs
     WHERE id = $1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function updateResearchRun(id, updates, expectedVersion) {
  const fields = [];
  const values = [];
  let index = 1;
  let statusParameter;

  for (const [key, value] of Object.entries(updates)) {
    const column = {
      question: "question",
      filters: "filters",
      status: "status",
    }[key];

    if (!column) continue;

    fields.push(`${column} = $${index}`);
    values.push(
      key === "filters" ? JSON.stringify(value) : value,
    );

    if (key === "status") {
      statusParameter = index;
    }

    index += 1;
  }

  if (statusParameter !== undefined) {
    fields.push(
      `started_at = CASE
        WHEN $${statusParameter} = 'running'
          AND started_at IS NULL
        THEN now()
        ELSE started_at
      END`,
    );

    fields.push(
      `completed_at = CASE
        WHEN $${statusParameter} IN ('completed', 'failed', 'cancelled')
        THEN now()
        WHEN $${statusParameter} IN ('pending', 'running')
        THEN NULL
        ELSE completed_at
      END`,
    );
  }

  fields.push("version = version + 1");
  fields.push("updated_at = now()");

  values.push(id);
  const idParameter = index++;

  values.push(expectedVersion);
  const versionParameter = index;

  const { rows } = await pool.query(
    `UPDATE research_runs
     SET ${fields.join(", ")}
     WHERE id = $${idParameter}
       AND version = $${versionParameter}
     RETURNING id, question, status, filters, started_at,
               completed_at, error_message, created_at,
               updated_at, version`,
    values,
  );

  return rows[0] ?? null;
}
