import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { checkDatabaseConnection } from "./config/database.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);

app.use(express.json({ limit: "1mb" }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "sciresearch-backend",
    },
  });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await checkDatabaseConnection();

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        database: "connected",
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The service is not ready",
      },
    });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
