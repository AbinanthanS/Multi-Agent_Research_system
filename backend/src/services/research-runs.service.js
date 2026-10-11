import * as repository from "../repositories/research-runs.repository.js";
import { ApiError } from "../utils/api-error.js";

const allowedTransitions = {
  pending: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["pending"],
  cancelled: ["pending"],
};

export async function createRun(input) {
  return repository.createResearchRun({
    question: input.question,
    filters: input.filters ?? { maxPapers: 20 },
  });
}

export async function listRuns(pagination) {
  const [items, total] = await Promise.all([
    repository.findResearchRuns(pagination),
    repository.countResearchRuns(),
  ]);

  return {
    items,
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      total,
      hasMore: pagination.offset + items.length < total,
    },
  };
}

export async function getRun(id) {
  const run = await repository.findResearchRunById(id);

  if (!run) {
    throw new ApiError(
      404,
      "RESEARCH_RUN_NOT_FOUND",
      "Research run not found",
    );
  }

  return run;
}


export async function updateRun(id, updates, expectedVersion) {
  const current = await repository.findResearchRunById(id);

  if (!current) {
    throw new ApiError(
      404,
      "RESEARCH_RUN_NOT_FOUND",
      "Research run not found",
    );
  }

  if (current.version !== expectedVersion) {
    throw new ApiError(
      409,
      "VERSION_CONFLICT",
      "This research run has changed. Fetch the latest version and retry.",
    );
  }

  if (
    updates.status &&
    updates.status !== current.status &&
    !allowedTransitions[current.status].includes(updates.status)
  ) {
    throw new ApiError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot transition a research run from ${current.status} to ${updates.status}`,
    );
  }

  
  let updated;

  try {
    updated = await repository.updateResearchRun(
      id,
      updates,
      expectedVersion,
    );
  } catch (error) {
    if (error.code === "23514" && updates.status !== undefined) {
      throw new ApiError(
        409,
        "INVALID_STATUS_TRANSITION",
        "The requested status transition is not allowed.",
      );
    }

    throw error;
  }


  if (!updated) {
    // Another request may have updated the row after our initial read.
    const latest = await repository.findResearchRunById(id);

    if (!latest) {
      throw new ApiError(
        404,
        "RESEARCH_RUN_NOT_FOUND",
        "Research run not found",
      );
    }

    throw new ApiError(
      409,
      "VERSION_CONFLICT",
      "This research run has changed. Fetch the latest version and retry.",
    );
  }

  return updated;
}
