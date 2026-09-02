// Mirrors `LocalizedText` in the frontend's src/lib/admin/types.ts — every
// translatable field is authored/edited across all four locales via tabs.
export const LOCALES = ["fr", "en", "de", "it"] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<Locale, string>;

export function emptyLocalizedText(): LocalizedText {
  return { fr: "", en: "", de: "", it: "" };
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Public site locales — a strict subset of the admin's four. See the
// "Locale mismatch" reconciliation note in docs/DATABASE_SCHEMA.md.
export const PUBLIC_LOCALES = ["en", "fr"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];

export function isPublicLocale(value: unknown): value is PublicLocale {
  return value === "en" || value === "fr";
}
