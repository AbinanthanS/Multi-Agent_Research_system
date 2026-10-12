import {
  executeResearchWorkflow,
  fetchRunClaims,
  fetchRunReport,
} from "../services/research-execution.service.js";

export async function executeRun(req, res, next) {
  try {
    const { id } = req.params;
    const result = await executeResearchWorkflow(id);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRunReport(req, res, next) {
  try {
    const { id } = req.params;
    const result = await fetchRunReport(id);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRunClaims(req, res, next) {
  try {
    const { id } = req.params;
    const result = await fetchRunClaims(id);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
