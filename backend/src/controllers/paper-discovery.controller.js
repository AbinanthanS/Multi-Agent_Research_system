import { discoverPapers } from "../services/paper-discovery.service.js";
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
