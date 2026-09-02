import { pgEnum } from "drizzle-orm/pg-core";

// Matches `AdminRole` in the frontend's src/lib/admin/types.ts
export const roleEnum = pgEnum("role", ["admin", "editor", "viewer"]);

// Matches `AdminUser["status"]` in types.ts — a freshly-invited user starts "invited"
export const userStatusEnum = pgEnum("user_status", ["active", "invited", "disabled"]);

// Matches `LANGUAGES` in types.ts — the admin dashboard authors in all four;
// the public site currently only exposes en/fr via its own Locale type.
export const localeEnum = pgEnum("locale", ["fr", "en", "de", "it"]);

// Matches `ContentStatus` in types.ts
export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);
