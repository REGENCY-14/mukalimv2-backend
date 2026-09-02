import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { localeEnum } from "./enums";
import { users } from "./users";

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  // Wherever the file actually lives — local /uploads path in dev, or an
  // S3-compatible URL once that's swapped in (see src/utils/storage.ts).
  url: text("url").notNull(),
  sizeKb: integer("size_kb").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaTranslations = pgTable(
  "media_translations",
  {
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    altText: text("alt_text").notNull().default(""),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.mediaId, table.locale] }),
  }),
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type MediaTranslation = typeof mediaTranslations.$inferSelect;
export type NewMediaTranslation = typeof mediaTranslations.$inferInsert;
