import { discoverPapers } from "../services/paper-discovery.service.js";
import { findPapersByRunId } from "../repositories/research-execution.repository.js";
import { researchRunIdSchema } from "../schemas/research-runs.schema.js";
import { ApiError } from "../utils/api-error.js";

export async function discoverRunPapers(req, res) {
  const result = researchRunIdSchema.safeParse(req.params.id);

  if (!result.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      result.error.issues
        .map(
          (issue) =>
            `${issue.path.join(".") || "request"}: ${issue.message}`,
        )
        .join("; "),
    );
  }

  const data = await discoverPapers(result.data);

  res.status(200).json({
    success: true,
    data,
  });
}

export async function getRunPapers(req, res, next) {
  try {
    const result = researchRunIdSchema.safeParse(req.params.id);
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid research run ID");
    }
    const papers = await findPapersByRunId(result.data);
    res.status(200).json({
      success: true,
      data: {
        runId: result.data,
        count: papers.length,
        papers,
      },
    });
  } catch (error) {
    next(error);
  }
}

