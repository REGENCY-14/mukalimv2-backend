import { z } from "zod";
import { localizedTextSchema, partialLocalizedTextSchema } from "./common";

export const createCategorySchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema,
  heroImageAlt: localizedTextSchema.optional(),
  slug: z.string().min(1).max(100).optional(), // auto-derived from name.en server-side if omitted
  iconUrl: z.string().min(1),
  heroImageUrl: z.string().min(1).optional(),
  displayOrder: z.number().int().min(0).default(1),
  active: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: partialLocalizedTextSchema.optional(),
  description: partialLocalizedTextSchema.optional(),
  heroImageAlt: partialLocalizedTextSchema.optional(),
  slug: z.string().min(1).max(100).optional(),
  iconUrl: z.string().min(1).optional(),
  heroImageUrl: z.string().min(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
