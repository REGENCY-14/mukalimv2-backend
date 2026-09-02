import { index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { contentStatusEnum, localeEnum } from "./enums";
import { categories } from "./categories";
import { users } from "./users";

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Not present in the original admin mock model — required for public
    // article URLs (/[category]/[article]); unique per category.
    slug: text("slug").notNull(),
    // The badge on article cards ("Botanical", "Root") and exactly what the
    // public Filter-by-tag dropdown filters on (FilterBar.tsx).
    tag: text("tag").notNull(),
    featuredImageUrl: text("featured_image_url").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    // The mock only stores an author *name* string — we store the FK and
    // resolve the display name server-side so it survives a user rename.
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    // Set on first transition to status = 'published', never overwritten on
    // subsequent edits — see contentService.setStatus.
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("content_items_category_idx").on(table.categoryId),
    statusPublishedIdx: index("content_items_status_published_idx").on(table.status, table.publishedAt),
    categorySlugUnique: uniqueIndex("content_items_category_slug_unique").on(table.categoryId, table.slug),
  }),
);

export const contentTranslations = pgTable(
  "content_translations",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    title: text("title").notNull().default(""),
    // The card-preview summary (ArticleCard.tsx) — kept per-locale like
    // title/body rather than a single shared column, since it renders
    // straight from the requested locale on the public site.
    excerpt: text("excerpt").notNull().default(""),
    // Stored as markdown/HTML; split into paragraphs on read to match the
    // public template's `body: string[]` shape (see CategoryArticle in the
    // frontend's categories.ts) — see contentService.toParagraphs.
    body: text("body").notNull().default(""),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentId, table.locale] }),
  }),
);

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type ContentTranslation = typeof contentTranslations.$inferSelect;
export type NewContentTranslation = typeof contentTranslations.$inferInsert;
