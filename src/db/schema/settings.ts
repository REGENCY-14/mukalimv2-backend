import { pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { localeEnum } from "./enums";

// Singleton — exactly one row, pinned to id = 1 (see seed.ts / settingsService.ts).
export const settings = pgTable("settings", {
  id: smallint("id").primaryKey().default(1),
  siteName: text("site_name").notNull().default("MUKALIM"),
  defaultLanguage: localeEnum("default_language").notNull().default("en"),
  contactEmail: text("contact_email").notNull(),
  socialInstagram: text("social_instagram").notNull().default(""),
  socialFacebook: text("social_facebook").notNull().default(""),
  socialLinkedin: text("social_linkedin").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
