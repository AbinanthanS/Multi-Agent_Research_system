import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/database.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `SciResearch API listening on http://localhost:${env.PORT}`,
  );
});

// Configure 5-minute timeout for heavy AI execution pipelines
server.timeout = 300_000;
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully.`);

  server.close(async (serverError) => {
    let exitCode = serverError ? 1 : 0;

    if (serverError) {
      console.error("Error closing HTTP server:", serverError);
    }

    try {
      await pool.end();
      console.log("PostgreSQL connection pool closed.");
    } catch (databaseError) {
      console.error(
        "Error closing PostgreSQL connection pool:",
        databaseError,
      );
      exitCode = 1;
    }

    process.exitCode = exitCode;
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));