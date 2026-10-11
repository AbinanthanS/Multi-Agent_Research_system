import * as service from "../services/research-runs.service.js";
import {
  createResearchRunSchema,
  listResearchRunsSchema,
  researchRunIdSchema,
  updateResearchRunSchema,
} from "../schemas/research-runs.schema.js";
import { ApiError } from "../utils/api-error.js";

function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
        .join("; "),
    );
  }

  return result.data;
}

export async function createResearchRun(req, res) {
  const input = parseOrThrow(createResearchRunSchema, req.body);
  const run = await service.createRun(input);

  res.status(201).json({
    success: true,
    data: run,
  });
}

export async function listResearchRuns(req, res) {
  const pagination = parseOrThrow(listResearchRunsSchema, req.query);
  const result = await service.listRuns(pagination);

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getResearchRun(req, res) {
  const id = parseOrThrow(researchRunIdSchema, req.params.id);
  const run = await service.getRun(id);

  res.status(200).json({
    success: true,
    data: run,
  });
}

export async function patchResearchRun(req, res) {
  const id = parseOrThrow(researchRunIdSchema, req.params.id);
  const input = parseOrThrow(updateResearchRunSchema, req.body);

  const { expectedVersion, ...updates } = input;
  const run = await service.updateRun(id, updates, expectedVersion);

  res.status(200).json({
    success: true,
    data: run,
  });
}
