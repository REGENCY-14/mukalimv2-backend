import { Router } from "express";
import * as authController from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimit";
import { loginSchema } from "../schemas/auth";
import { inviteUserSchema } from "../schemas/user";

const router = Router();

router.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", authRateLimiter, authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/session", requireAuth, authController.session);

router.post("/invite", requireAuth, requireAdmin, validate({ body: inviteUserSchema }), authController.invite);
router.post("/accept-invite", authRateLimiter, authController.acceptInvite);

export default router;
