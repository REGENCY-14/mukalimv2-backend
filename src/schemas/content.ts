import { z } from "zod";
import { localizedTextSchema, partialLocalizedTextSchema } from "./common";

export const createContentSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).max(150).optional(), // auto-derived from title.en if omitted
  tag: z.string().min(1),
  title: localizedTextSchema,
  excerpt: localizedTextSchema,
  featuredImage: z.string().min(1),
  body: localizedTextSchema,
  seoTitle: localizedTextSchema,
  seoDescription: localizedTextSchema,
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateContentSchema = z.object({
  categoryId: z.string().uuid().optional(),
  slug: z.string().min(1).max(150).optional(),
  tag: z.string().min(1).optional(),
  title: partialLocalizedTextSchema.optional(),
  excerpt: partialLocalizedTextSchema.optional(),
  featuredImage: z.string().min(1).optional(),
  body: partialLocalizedTextSchema.optional(),
  seoTitle: partialLocalizedTextSchema.optional(),
  seoDescription: partialLocalizedTextSchema.optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const listContentQuerySchema = z.object({
  category: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]).optional(),
  language: z.enum(["fr", "en", "de", "it"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
