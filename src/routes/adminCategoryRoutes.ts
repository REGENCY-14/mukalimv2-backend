import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import { requireAuth } from "../middleware/auth";
import { requireEditor } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../schemas/category";
import { uuidParamSchema } from "../schemas/common";

const router = Router();

router.use(requireAuth);

// Categories list is viewable by all roles, including viewer.
router.get("/", categoryController.listAdmin);

router.post("/", requireEditor, validate({ body: createCategorySchema }), categoryController.create);
router.patch("/:id", requireEditor, validate({ params: uuidParamSchema, body: updateCategorySchema }), categoryController.update);
router.patch("/:id/toggle-active", requireEditor, validate({ params: uuidParamSchema }), categoryController.toggleActive);
router.delete("/:id", requireEditor, validate({ params: uuidParamSchema }), categoryController.remove);

export default router;
