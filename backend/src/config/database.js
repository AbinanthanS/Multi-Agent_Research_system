import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "sciresearch-backend",
});

pool.on("error", (error) => {
  console.error("Unexpected error from an idle PostgreSQL client:", error);
});

export async function checkDatabaseConnection() {
  await pool.query("SELECT 1");
}
