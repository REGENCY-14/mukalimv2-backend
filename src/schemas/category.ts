import { z } from "zod";
import { localizedPlainTextSchema, partialLocalizedPlainTextSchema, safeUrlSchema } from "./common";

export const createCategorySchema = z.object({
  name: localizedPlainTextSchema,
  description: localizedPlainTextSchema,
  heroImageAlt: localizedPlainTextSchema.optional(),
  slug: z.string().min(1).max(100).optional(), // auto-derived from name.en server-side if omitted
  iconUrl: safeUrlSchema,
  heroImageUrl: safeUrlSchema.optional(),
  displayOrder: z.number().int().min(0).default(1),
  active: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: partialLocalizedPlainTextSchema.optional(),
  description: partialLocalizedPlainTextSchema.optional(),
  heroImageAlt: partialLocalizedPlainTextSchema.optional(),
  slug: z.string().min(1).max(100).optional(),
  iconUrl: safeUrlSchema.optional(),
  heroImageUrl: safeUrlSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
