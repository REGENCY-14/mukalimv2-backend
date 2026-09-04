import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, contentItems, contentTranslations, users } from "../db/schema";
import { emptyLocalizedText, type LocalizedText, type PublicLocale } from "../types/localized";
import { slugify } from "../utils/slugify";
import { parsePageParams, buildMeta } from "../utils/pagination";
import { AppError } from "../utils/errors";
import { countOf } from "../utils/rows";
import type { CreateContentInput, UpdateContentInput } from "../schemas/content";
import * as categoryService from "./categoryService";
import * as activityService from "./activityService";
import type { Actor } from "./activityService";

const LOCALES: (keyof LocalizedText)[] = ["fr", "en", "de", "it"];

function toLocalizedText(rows: { locale: string; value: string }[]): LocalizedText {
  const out = emptyLocalizedText();
  for (const row of rows) if (row.locale in out) out[row.locale as keyof LocalizedText] = row.value;
  return out;
}

function localize(text: LocalizedText, locale: PublicLocale): string {
  return text[locale] || text.en || "";
}

/** The public article template renders body as an array of paragraphs
 * (`CategoryArticle.body: string[]`); we store markup and split on blank
 * lines rather than persisting an array directly. */
function toParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

async function ensureUniqueSlug(categoryId: string, desired: string, excludeId?: string): Promise<string> {
  let candidate = desired || "article";
  let suffix = 1;
  for (;;) {
    const [existing] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(and(eq(contentItems.categoryId, categoryId), eq(contentItems.slug, candidate)))
      .limit(1);
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${desired}-${suffix}`;
  }
}

async function attachAdminFields(rows: (typeof contentItems.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.authorId).filter((id): id is string => Boolean(id)))];

  const [translations, authors] = await Promise.all([
    db.select().from(contentTranslations).where(inArray(contentTranslations.contentId, ids)),
    authorIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds))
      : Promise.resolve([]),
  ]);

  const byContent = new Map<string, typeof translations>();
  for (const t of translations) {
    const list = byContent.get(t.contentId) ?? [];
    list.push(t);
    byContent.set(t.contentId, list);
  }
  const authorNameById = new Map(authors.map((a) => [a.id, a.name]));

  return rows.map((row) => {
    const rowTranslations = byContent.get(row.id) ?? [];
    return {
      id: row.id,
      categoryId: row.categoryId,
      slug: row.slug,
      tag: row.tag,
      featuredImage: row.featuredImageUrl,
      status: row.status,
      authorId: row.authorId,
      author: row.authorId ? authorNameById.get(row.authorId) ?? "Unknown" : "Unknown",
      publishedAt: row.publishedAt,
      title: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.title }))),
      excerpt: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.excerpt }))),
      body: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.body }))),
      seoTitle: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.seoTitle }))),
      seoDescription: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.seoDescription }))),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

// ---- Admin ----

export async function listAdmin(query: Record<string, unknown>) {
  const { page, limit } = parsePageParams(query, 20);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (typeof query.category === "string") conditions.push(eq(contentItems.categoryId, query.category));
  if (typeof query.status === "string") conditions.push(eq(contentItems.status, query.status as "draft" | "published"));
  const where = conditions.length ? and(...conditions) : undefined;

  let rows = await db
    .select()
    .from(contentItems)
    .where(where)
    .orderBy(desc(contentItems.updatedAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(contentItems).where(where);
  const count = countOf(countRows);

  let data = await attachAdminFields(rows);

  // "language" filters to items with a non-empty translation in that
  // language — mirrors item.title[languageFilter].trim() in content/page.tsx.
  // Applied post-fetch since it depends on the joined translation text.
  if (typeof query.language === "string") {
    const lang = query.language as keyof LocalizedText;
    data = data.filter((item) => item.title[lang]?.trim());
  }

  return { data, meta: buildMeta(Number(count), { page, limit }) };
}

export async function getAdmin(id: string) {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  if (!row) throw AppError.notFound("Content item not found.");
  const [full] = await attachAdminFields([row]);
  if (!full) throw AppError.notFound("Content item not found.");
  return full;
}

export async function create(input: CreateContentInput, actor: Actor) {
  await categoryService.requireCategoryRow(input.categoryId);

  const desiredSlug = slugify(input.slug || input.title.en || input.title.fr || "article");
  const slug = await ensureUniqueSlug(input.categoryId, desiredSlug);
  const publishedAt = input.status === "published" ? new Date() : null;

  const [row] = await db
    .insert(contentItems)
    .values({
      categoryId: input.categoryId,
      slug,
      tag: input.tag,
      featuredImageUrl: input.featuredImage,
      status: input.status,
      authorId: actor.id,
      publishedAt,
    })
    .returning();
  if (!row) throw new AppError(500, "INTERNAL_ERROR", "Failed to create content item.");

  await db.insert(contentTranslations).values(
    LOCALES.map((locale) => ({
      contentId: row.id,
      locale,
      title: input.title[locale] ?? "",
      excerpt: input.excerpt[locale] ?? "",
      body: input.body[locale] ?? "",
      seoTitle: input.seoTitle[locale] ?? "",
      seoDescription: input.seoDescription[locale] ?? "",
    })),
  );

  await activityService.log(actor, "created the", `'${input.title.en || slug}'`);
  return getAdmin(row.id);
}

export async function update(id: string, input: UpdateContentInput, actor: Actor) {
  const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Content item not found.");

  if (input.categoryId) await categoryService.requireCategoryRow(input.categoryId);

  const patch: Partial<typeof contentItems.$inferInsert> = { updatedAt: new Date() };
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.tag !== undefined) patch.tag = input.tag;
  if (input.featuredImage !== undefined) patch.featuredImageUrl = input.featuredImage;
  if (input.slug !== undefined) {
    patch.slug = await ensureUniqueSlug(input.categoryId ?? existing.categoryId, slugify(input.slug), id);
  }

  // Set published_at server-side only the first time status transitions to
  // 'published' — never overwrite it on subsequent edits (see schema doc).
  let activityAction = "updated";
  if (input.status !== undefined && input.status !== existing.status) {
    patch.status = input.status;
    if (input.status === "published" && !existing.publishedAt) patch.publishedAt = new Date();
    activityAction = input.status === "draft" ? "set to draft" : "published";
  }

  await db.update(contentItems).set(patch).where(eq(contentItems.id, id));

  if (input.title || input.excerpt || input.body || input.seoTitle || input.seoDescription) {
    for (const locale of LOCALES) {
      const fields: Record<string, string> = {};
      if (input.title?.[locale] !== undefined) fields.title = input.title[locale] as string;
      if (input.excerpt?.[locale] !== undefined) fields.excerpt = input.excerpt[locale] as string;
      if (input.body?.[locale] !== undefined) fields.body = input.body[locale] as string;
      if (input.seoTitle?.[locale] !== undefined) fields.seoTitle = input.seoTitle[locale] as string;
      if (input.seoDescription?.[locale] !== undefined) fields.seoDescription = input.seoDescription[locale] as string;
      if (Object.keys(fields).length === 0) continue;

      await db
        .insert(contentTranslations)
        .values({ contentId: id, locale, title: "", excerpt: "", body: "", seoTitle: "", seoDescription: "", ...fields })
        .onConflictDoUpdate({ target: [contentTranslations.contentId, contentTranslations.locale], set: fields });
    }
  }

  await activityService.log(actor, activityAction, `'${input.title?.en || existing.slug}'`);
  return getAdmin(id);
}

export async function remove(id: string, actor: Actor) {
  const [existing] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Content item not found.");

  await db.delete(contentItems).where(eq(contentItems.id, id));
  await activityService.log(actor, "removed the", `'${existing.slug}'`);
}

// ---- Public ----

async function requirePublicCategory(slug: string) {
  const [row] = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.active, true))).limit(1);
  if (!row) throw AppError.notFound("Category not found.");
  return row;
}

export async function listPublicArticles(categorySlug: string, query: Record<string, unknown>) {
  const category = await requirePublicCategory(categorySlug);
  const locale = (typeof query.locale === "string" ? query.locale : "en") as PublicLocale;
  const { page, limit } = parsePageParams(query, 12);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: contentItems.id,
      slug: contentItems.slug,
      tag: contentItems.tag,
      featuredImageUrl: contentItems.featuredImageUrl,
      publishedAt: contentItems.publishedAt,
      title: contentTranslations.title,
      excerpt: contentTranslations.excerpt,
    })
    .from(contentItems)
    .innerJoin(contentTranslations, and(eq(contentTranslations.contentId, contentItems.id), eq(contentTranslations.locale, locale)))
    .where(and(eq(contentItems.categoryId, category.id), eq(contentItems.status, "published")));

  let filtered = rows;
  if (typeof query.tag === "string" && query.tag) filtered = filtered.filter((r) => r.tag === query.tag);

  const availableLetters = [...new Set(filtered.map((r) => (r.title[0] || "").toUpperCase()).filter(Boolean))].sort();

  if (typeof query.letter === "string" && query.letter) {
    const letter = query.letter.toUpperCase();
    filtered = filtered.filter((r) => (r.title[0] || "").toUpperCase() === letter);
  }

  const sort = (typeof query.sort === "string" ? query.sort : "newest") as "newest" | "oldest" | "a-z" | "z-a";
  filtered = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0);
      case "a-z":
        return a.title.localeCompare(b.title);
      case "z-a":
        return b.title.localeCompare(a.title);
      case "newest":
      default:
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    }
  });

  const total = filtered.length;
  const page_ = filtered.slice(offset, offset + limit);
  const availableTags = [...new Set(rows.map((r) => r.tag))].sort();

  return {
    data: page_.map((r) => ({
      slug: r.slug,
      title: r.title,
      tag: r.tag,
      excerpt: r.excerpt,
      image: r.featuredImageUrl,
      imageAlt: r.title,
      publishedAt: r.publishedAt,
    })),
    meta: { ...buildMeta(total, { page, limit }), availableTags, availableLetters },
  };
}

export async function getPublicArticle(categorySlug: string, articleSlug: string, locale: PublicLocale) {
  const category = await requirePublicCategory(categorySlug);

  const [row] = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.categoryId, category.id), eq(contentItems.slug, articleSlug), eq(contentItems.status, "published")))
    .limit(1);
  if (!row) throw AppError.notFound("Article not found.");

  const translations = await db
    .select()
    .from(contentTranslations)
    .where(and(eq(contentTranslations.contentId, row.id), eq(contentTranslations.locale, locale)));
  const t = translations[0];

  const related = await db
    .select({
      slug: contentItems.slug,
      title: contentTranslations.title,
      excerpt: contentTranslations.excerpt,
      image: contentItems.featuredImageUrl,
      tag: contentItems.tag,
      publishedAt: contentItems.publishedAt,
    })
    .from(contentItems)
    .innerJoin(contentTranslations, and(eq(contentTranslations.contentId, contentItems.id), eq(contentTranslations.locale, locale)))
    .where(and(eq(contentItems.categoryId, category.id), eq(contentItems.status, "published"), ne(contentItems.id, row.id)))
    .orderBy(desc(contentItems.publishedAt))
    .limit(4);

  return {
    slug: row.slug,
    tag: row.tag,
    title: t?.title ?? "",
    excerpt: t?.excerpt ?? "",
    body: toParagraphs(t?.body ?? ""),
    seoTitle: t?.seoTitle ?? "",
    seoDescription: t?.seoDescription ?? "",
    image: row.featuredImageUrl,
    imageAlt: t?.title ?? "",
    publishedAt: row.publishedAt,
    relatedArticles: related,
  };
}

export { toParagraphs };
