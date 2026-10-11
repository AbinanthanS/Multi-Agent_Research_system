import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

function normalizeConnectionString(urlString) {
  if (!urlString) return urlString;
  try {
    const parsed = new URL(urlString);
    if (
      parsed.searchParams.get("sslmode") === "require" &&
      !parsed.searchParams.has("uselibpqcompat")
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    // Fall back to original connection string if parsing fails
  }
  return urlString;
}

const rawConnectionString =
  env.NODE_ENV === "test"
    ? env.TEST_DATABASE_URL
    : env.DATABASE_URL;

const connectionString = normalizeConnectionString(rawConnectionString);

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