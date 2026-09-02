import { boolean, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { localeEnum } from "./enums";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Auto-derived from the English name client-side (slugify() in
  // CategoryFormPanel.tsx) but editable — uniqueness is still enforced here.
  slug: text("slug").notNull(),
  iconUrl: text("icon_url").notNull().default("/mukalim/icon-cosmetics.svg"),
  // Background image behind the category page's hero banner (CategoryHero.tsx)
  // — distinct from the small nav/grid icon above.
  heroImageUrl: text("hero_image_url").notNull().default("/mukalim/cosmetics-hero.jpg"),
  displayOrder: integer("display_order").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugUnique: uniqueIndex("categories_slug_unique").on(table.slug),
}));

export const categoryTranslations = pgTable(
  "category_translations",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    // Shown on the category hero (CategoryHero.tsx)
    name: text("name").notNull().default(""),
    description: text("description").notNull().default(""),
    heroImageAlt: text("hero_image_alt").notNull().default(""),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.categoryId, table.locale] }),
  }),
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryTranslation = typeof categoryTranslations.$inferSelect;
export type NewCategoryTranslation = typeof categoryTranslations.$inferInsert;
