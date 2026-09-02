import { z } from "zod";

// Reused everywhere a LocalizedText field is authored — matches
// `LocalizedText` in the frontend (`{ fr, en, de, it }`, empty = untranslated).
export const localizedTextSchema = z.object({
  fr: z.string(),
  en: z.string(),
  de: z.string(),
  it: z.string(),
});

// Partial version for PATCH bodies that only touch a subset of locales.
export const partialLocalizedTextSchema = localizedTextSchema.partial();

export const localeSchema = z.enum(["fr", "en", "de", "it"]);
export const publicLocaleSchema = z.enum(["en", "fr"]).default("en");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("Must be a valid id"),
});
