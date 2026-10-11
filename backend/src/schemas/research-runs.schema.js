import { z } from "zod";

const filtersSchema = z
  .object({
    yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
    domain: z.string().trim().min(1).max(100).optional(),
    maxPapers: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict() //disallows any un expected extra fields in the input object
  .superRefine((filters, ctx) => {
    if (
      filters.yearFrom !== undefined &&
      filters.yearTo !== undefined &&
      filters.yearFrom > filters.yearTo
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["yearTo"],
        message: "yearTo must be greater than or equal to yearFrom",
      });
    }
  });

export const createResearchRunSchema = z
  .object({
    question: z.string().trim().min(10).max(2000),
    filters: filtersSchema.optional(),
  })
  .strict();

export const listResearchRunsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const researchRunIdSchema = z.string().uuid();


export const updateResearchRunSchema = z
  .object({
    expectedVersion: z.coerce.number().int().min(1),
    question: z.string().trim().min(10).max(2000).optional(),
    filters: filtersSchema.optional(),
    status: z
      .enum(["pending", "running", "completed", "failed", "cancelled"])
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      ["question", "filters", "status"].some(
        (field) => data[field] !== undefined,
      ),
    {
      message: "At least one field to update must be provided",
    },
  );
