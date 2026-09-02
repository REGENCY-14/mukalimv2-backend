import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/stats", dashboardController.stats);
router.get("/activity", dashboardController.activity);

export default router;
