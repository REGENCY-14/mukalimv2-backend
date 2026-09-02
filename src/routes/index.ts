import { Router } from "express";
import authRoutes from "./authRoutes";
import publicRoutes from "./publicRoutes";
import adminCategoryRoutes from "./adminCategoryRoutes";
import adminContentRoutes from "./adminContentRoutes";
import adminMediaRoutes from "./adminMediaRoutes";
import adminUserRoutes from "./adminUserRoutes";
import adminDashboardRoutes from "./adminDashboardRoutes";
import adminSettingsRoutes from "./adminSettingsRoutes";

const router = Router();

router.use("/auth", authRoutes);

// Public site — unauthenticated, published content only.
router.use("/", publicRoutes);

// Admin dashboard — every route requires a session (enforced inside each router).
router.use("/admin/categories", adminCategoryRoutes);
router.use("/admin/content", adminContentRoutes);
router.use("/admin/media", adminMediaRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/settings", adminSettingsRoutes);

export default router;
