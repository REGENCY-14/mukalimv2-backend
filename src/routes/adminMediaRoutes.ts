import { Router } from "express";
import * as mediaController from "../controllers/mediaController";
import { requireAuth } from "../middleware/auth";
import { requireEditor } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { updateAltTextSchema, listMediaQuerySchema } from "../schemas/media";
import { uuidParamSchema } from "../schemas/common";
import { uploadMedia } from "../middleware/upload";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: listMediaQuerySchema }), mediaController.list);
router.post("/", requireEditor, uploadMedia, mediaController.create);
router.patch("/:id/alt-text", requireEditor, validate({ params: uuidParamSchema, body: updateAltTextSchema }), mediaController.updateAltText);
router.delete("/:id", requireEditor, validate({ params: uuidParamSchema }), mediaController.remove);

export default router;
