import { z } from "zod";
import { localizedTextSchema } from "./common";

export const updateAltTextSchema = z.object({
  altText: localizedTextSchema,
});

export const listMediaQuerySchema = z.object({
  category: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type UpdateAltTextInput = z.infer<typeof updateAltTextSchema>;
