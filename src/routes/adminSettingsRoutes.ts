import { Router } from "express";
import * as settingsController from "../controllers/settingsController";
import { requireAuth } from "../middleware/auth";
import { requireEditor } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { updateSettingsSchema } from "../schemas/settings";

const router = Router();

router.use(requireAuth);

// Viewable by all roles — the frontend wraps the form in
// <fieldset disabled={!canEdit}> so viewer sees it read-only.
router.get("/", settingsController.get);
router.patch("/", requireEditor, validate({ body: updateSettingsSchema }), settingsController.update);

export default router;
