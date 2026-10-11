import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PORT: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .default(5000),

    CORS_ORIGIN: z
      .string()
      .url()
      .default("http://localhost:5173"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required"),

    MIGRATIONS_DATABASE_URL: z
      .string()
      .min(1)
      .optional(),

    TEST_DATABASE_URL: z
      .string()
      .min(1)
      .optional(),
  })
  .superRefine((config, ctx) => {
    if (
      config.NODE_ENV === "test" &&
      !config.TEST_DATABASE_URL
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["TEST_DATABASE_URL"],
        message:
          "TEST_DATABASE_URL is required when NODE_ENV=test",
      });
    }
  });

export const env = envSchema.parse(process.env);