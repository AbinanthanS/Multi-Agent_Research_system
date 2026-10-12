import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

const connectionString =
  env.NODE_ENV === "test"
    ? env.TEST_DATABASE_URL
    : env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: env.NODE_ENV === "test" ? 3 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: env.NODE_ENV === "test" ? 20_000 : 10_000,
  application_name: "sciresearch-backend",
});

pool.on("error", (error) => {
  console.error("Unexpected error from an idle PostgreSQL client:", error);
});

export async function checkDatabaseConnection() {
  await pool.query("SELECT 1");
}