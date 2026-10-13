import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import researchRunsRouter from "./routes/research-runs.routes.js";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { checkDatabaseConnection } from "./config/database.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins =
  env.CORS_ORIGIN === "*"
    ? "*"
    : env.CORS_ORIGIN.split(",").map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === "*" || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
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
  } catch (error) {
    console.error("Database readiness check failed:", error);
    res.status(503).json({
      success: false,
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "The service is not ready",
      },
    });
  }
});

app.use("/api/v1/research-runs", researchRunsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
