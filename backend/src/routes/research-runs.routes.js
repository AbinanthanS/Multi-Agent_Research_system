import { Router } from "express";
import {
  createResearchRun,
  getResearchRun,
  listResearchRuns,
  patchResearchRun,
} from "../controllers/research-runs.controller.js";

import {
  discoverRunPapers,
  getRunPapers,
} from "../controllers/paper-discovery.controller.js";
import {
  executeRun,
  getRunClaims,
  getRunReport,
} from "../controllers/research-execution.controller.js";

const router = Router();

router.post("/", createResearchRun);
router.get("/", listResearchRuns);
router.get("/:id", getResearchRun);
router.patch("/:id", patchResearchRun);
router.post("/:id/papers/discover", discoverRunPapers);
router.get("/:id/papers", getRunPapers);
router.post("/:id/execute", executeRun);
router.get("/:id/report", getRunReport);
router.get("/:id/claims", getRunClaims);

export default router;
