import { Router } from "express";
import * as contentController from "../controllers/contentController";
import { requireAuth } from "../middleware/auth";
import { requireEditor } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { createContentSchema, updateContentSchema, listContentQuerySchema } from "../schemas/content";
import { uuidParamSchema } from "../schemas/common";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listContentQuerySchema }), contentController.listAdmin);
router.get("/:id", validate({ params: uuidParamSchema }), contentController.getAdmin);
router.post("/", requireEditor, validate({ body: createContentSchema }), contentController.create);
router.patch("/:id", requireEditor, validate({ params: uuidParamSchema, body: updateContentSchema }), contentController.update);
router.delete("/:id", requireEditor, validate({ params: uuidParamSchema }), contentController.remove);

export default router;
