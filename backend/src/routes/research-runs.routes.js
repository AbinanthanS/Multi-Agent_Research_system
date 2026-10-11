import { Router } from "express";
import {
  createResearchRun,
  getResearchRun,
  listResearchRuns,
  patchResearchRun,
} from "../controllers/research-runs.controller.js";

import {
  discoverRunPapers,
} from "../controllers/paper-discovery.controller.js";

const router = Router();

router.post("/", createResearchRun);
router.get("/", listResearchRuns);
router.get("/:id", getResearchRun);
router.patch("/:id", patchResearchRun);
router.post("/:id/papers/discover", discoverRunPapers);

export default router;
