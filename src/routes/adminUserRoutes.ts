import { Router } from "express";
import * as userController from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { inviteUserSchema, updateUserSchema } from "../schemas/user";
import { uuidParamSchema } from "../schemas/common";

const router = Router();

// Entirely gated to admin — both viewing the page and every mutation.
router.use(requireAuth, requireAdmin);

router.get("/", userController.list);
router.post("/", validate({ body: inviteUserSchema }), userController.invite);
router.patch("/:id", validate({ params: uuidParamSchema, body: updateUserSchema }), userController.update);
router.delete("/:id", validate({ params: uuidParamSchema }), userController.remove);

export default router;
