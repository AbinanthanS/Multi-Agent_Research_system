import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `SciResearch API listening on http://localhost:${env.PORT}`,
  );
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close((error) => {
    if (error) {
      console.error("Error during shutdown:", error);
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
