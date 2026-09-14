import { z } from "zod";
import { localizedPlainTextSchema, localizedRichTextSchema, partialLocalizedPlainTextSchema, partialLocalizedRichTextSchema, safeUrlSchema } from "./common";
import { sanitizePlainText } from "../utils/sanitize";

export const createContentSchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().min(1).max(150).optional(), // auto-derived from title.en if omitted
  tag: z.string().min(1).transform(sanitizePlainText),
  title: localizedPlainTextSchema,
  excerpt: localizedPlainTextSchema,
  featuredImage: safeUrlSchema,
  body: localizedRichTextSchema,
  seoTitle: localizedPlainTextSchema,
  seoDescription: localizedPlainTextSchema,
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateContentSchema = z.object({
  categoryId: z.string().uuid().optional(),
  slug: z.string().min(1).max(150).optional(),
  tag: z.string().min(1).transform(sanitizePlainText).optional(),
  title: partialLocalizedPlainTextSchema.optional(),
  excerpt: partialLocalizedPlainTextSchema.optional(),
  featuredImage: safeUrlSchema.optional(),
  body: partialLocalizedRichTextSchema.optional(),
  seoTitle: partialLocalizedPlainTextSchema.optional(),
  seoDescription: partialLocalizedPlainTextSchema.optional(),
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
