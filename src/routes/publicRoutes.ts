import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import * as contentController from "../controllers/contentController";
import { validate } from "../middleware/validate";
import { listArticlesQuerySchema, localeQuerySchema } from "../schemas/publicContent";

const router = Router();

// Every route here must only ever surface published content in active
// categories — enforced in the service layer, not just by these routes.
router.get("/categories", validate({ query: localeQuerySchema }), categoryController.listPublic);
router.get("/categories/:slug", validate({ query: localeQuerySchema }), categoryController.getPublic);
router.get("/categories/:slug/articles", validate({ query: listArticlesQuerySchema }), contentController.listPublicArticles);
router.get("/categories/:slug/articles/:articleSlug", validate({ query: localeQuerySchema }), contentController.getPublicArticle);

export default router;
