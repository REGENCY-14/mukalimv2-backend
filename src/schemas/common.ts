import { z } from "zod";
import { sanitizePlainText, sanitizeRichText } from "../utils/sanitize";

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

// Applies `fn` to each present locale value — used by the sanitizing
// variants below. `.partial()` results may omit some keys entirely (never
// present-with-undefined), but this stays defensive either way.
function mapLocales<T extends Partial<Record<string, string>>>(obj: T, fn: (value: string) => string): T {
  const out = { ...obj };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const value = out[key];
    if (typeof value === "string") out[key] = fn(value) as T[keyof T];
  }
  return out;
}

// Sanitizing variants — for any field authored as free text that ends up
// rendered on the public site. "Plain" strips all markup (titles, names,
// alt text, SEO fields — none of these are meant to contain HTML at all);
// "Rich" allows a small safe formatting subset (article body only). See
// src/utils/sanitize.ts.
export const localizedPlainTextSchema = localizedTextSchema.transform((val) => mapLocales(val, sanitizePlainText));
export const partialLocalizedPlainTextSchema = partialLocalizedTextSchema.transform((val) => mapLocales(val, sanitizePlainText));
export const localizedRichTextSchema = localizedTextSchema.transform((val) => mapLocales(val, sanitizeRichText));
export const partialLocalizedRichTextSchema = partialLocalizedTextSchema.transform((val) => mapLocales(val, sanitizeRichText));

// Accepts either a relative path (frontend static assets, e.g.
// "/mukalim/icon-cosmetics.svg" — the seed data's default icons) or an
// absolute http(s) URL (uploaded media, Supabase Storage's public URLs).
// Deliberately NOT z.string().url() — that requires an absolute URL and
// would reject every relative-path default this app already relies on.
// Rejects javascript:/data:/etc. schemes either way.
function safeUrl(base: z.ZodString) {
  return base.refine((val) => val.startsWith("/") || /^https?:\/\//i.test(val), {
    message: "Must be a relative path (starting with '/') or an absolute http/https URL",
  });
}
export const safeUrlSchema = safeUrl(z.string().min(1));

export const localeSchema = z.enum(["fr", "en", "de", "it"]);
export const publicLocaleSchema = z.enum(["en", "fr"]).default("en");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("Must be a valid id"),
});
