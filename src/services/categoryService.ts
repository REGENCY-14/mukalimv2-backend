import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, categoryTranslations, contentItems } from "../db/schema";
import { emptyLocalizedText, type LocalizedText, type PublicLocale } from "../types/localized";
import { slugify } from "../utils/slugify";
import { AppError } from "../utils/errors";
import { countOf } from "../utils/rows";
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas/category";
import type { Actor } from "./activityService";
import * as activityService from "./activityService";

function toLocalizedText(rows: { locale: string; value: string }[]): LocalizedText {
  const out = emptyLocalizedText();
  for (const row of rows) {
    if (row.locale in out) out[row.locale as keyof LocalizedText] = row.value;
  }
  return out;
}

function localize(text: LocalizedText, locale: PublicLocale): string {
  return text[locale] || text.en || "";
}

async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  let candidate = desired || "category";
  let suffix = 1;
  // Keep the same auto-suffix behavior slugify()-adjacent code in the
  // frontend expects when a name collides — try "-2", "-3", ...
  for (;;) {
    const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, candidate)).limit(1);
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${desired}-${suffix}`;
  }
}

async function attachTranslationsAndCount(rows: (typeof categories.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [translations, counts] = await Promise.all([
    db
      .select({ categoryId: categoryTranslations.categoryId, locale: categoryTranslations.locale, name: categoryTranslations.name, description: categoryTranslations.description, heroImageAlt: categoryTranslations.heroImageAlt })
      .from(categoryTranslations)
      .where(inArray(categoryTranslations.categoryId, ids)),
    db
      .select({ categoryId: contentItems.categoryId, count: sql<number>`count(*)::int` })
      .from(contentItems)
      .where(inArray(contentItems.categoryId, ids))
      .groupBy(contentItems.categoryId),
  ]);

  const byCategory = new Map<string, typeof translations>();
  for (const t of translations) {
    const list = byCategory.get(t.categoryId) ?? [];
    list.push(t);
    byCategory.set(t.categoryId, list);
  }
  const countByCategory = new Map(counts.map((c) => [c.categoryId, c.count]));

  return rows.map((row) => {
    const rowTranslations = byCategory.get(row.id) ?? [];
    return {
      id: row.id,
      slug: row.slug,
      iconUrl: row.iconUrl,
      heroImageUrl: row.heroImageUrl,
      displayOrder: row.displayOrder,
      active: row.active,
      name: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.name }))),
      description: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.description }))),
      heroImageAlt: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.heroImageAlt }))),
      contentCount: countByCategory.get(row.id) ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

// ---- Admin ----

export async function listAdmin() {
  const rows = await db.select().from(categories).orderBy(asc(categories.displayOrder));
  return attachTranslationsAndCount(rows);
}

export async function getAdmin(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) throw AppError.notFound("Category not found.");
  const [full] = await attachTranslationsAndCount([row]);
  if (!full) throw AppError.notFound("Category not found.");
  return full;
}

export async function create(input: CreateCategoryInput, actor: Actor) {
  const desiredSlug = slugify(input.slug || input.name.en || input.name.fr || "category");
  const slug = await ensureUniqueSlug(desiredSlug);

  const [row] = await db
    .insert(categories)
    .values({
      slug,
      iconUrl: input.iconUrl,
      heroImageUrl: input.heroImageUrl ?? "/mukalim/cosmetics-hero.jpg",
      displayOrder: input.displayOrder,
      active: input.active,
    })
    .returning();
  if (!row) throw new AppError(500, "INTERNAL_ERROR", "Failed to create category.");

  const locales: (keyof LocalizedText)[] = ["fr", "en", "de", "it"];
  await db.insert(categoryTranslations).values(
    locales.map((locale) => ({
      categoryId: row.id,
      locale,
      name: input.name[locale] ?? "",
      description: input.description[locale] ?? "",
      heroImageAlt: input.heroImageAlt?.[locale] ?? "",
    })),
  );

  await activityService.log(actor, "created the", `'${input.name.en || slug}' category`);
  return getAdmin(row.id);
}

export async function update(id: string, input: UpdateCategoryInput, actor: Actor) {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Category not found.");

  const patch: Partial<typeof categories.$inferInsert> = { updatedAt: new Date() };
  if (input.slug !== undefined) patch.slug = await ensureUniqueSlug(slugify(input.slug), id);
  if (input.iconUrl !== undefined) patch.iconUrl = input.iconUrl;
  if (input.heroImageUrl !== undefined) patch.heroImageUrl = input.heroImageUrl;
  if (input.displayOrder !== undefined) patch.displayOrder = input.displayOrder;
  if (input.active !== undefined) patch.active = input.active;

  if (Object.keys(patch).length > 1) {
    await db.update(categories).set(patch).where(eq(categories.id, id));
  }

  if (input.name || input.description || input.heroImageAlt) {
    const locales: (keyof LocalizedText)[] = ["fr", "en", "de", "it"];
    for (const locale of locales) {
      const fields: Record<string, string> = {};
      if (input.name?.[locale] !== undefined) fields.name = input.name[locale] as string;
      if (input.description?.[locale] !== undefined) fields.description = input.description[locale] as string;
      if (input.heroImageAlt?.[locale] !== undefined) fields.heroImageAlt = input.heroImageAlt[locale] as string;
      if (Object.keys(fields).length === 0) continue;

      await db
        .insert(categoryTranslations)
        .values({ categoryId: id, locale, name: "", description: "", heroImageAlt: "", ...fields })
        .onConflictDoUpdate({ target: [categoryTranslations.categoryId, categoryTranslations.locale], set: fields });
    }
  }

  await activityService.log(actor, "updated", `'${input.name?.en || existing.slug}' category`);
  return getAdmin(id);
}

export async function toggleActive(id: string, actor: Actor) {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Category not found.");

  const active = !existing.active;
  await db.update(categories).set({ active, updatedAt: new Date() }).where(eq(categories.id, id));
  await activityService.log(actor, `set to ${active ? "active" : "inactive"} the`, `'${existing.slug}' category`);
  return getAdmin(id);
}

export async function remove(id: string, actor: Actor) {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Category not found.");

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(contentItems).where(eq(contentItems.categoryId, id));
  const count = countOf(countRows);
  if (count > 0) {
    throw AppError.conflict(
      `Cannot delete '${existing.slug}' — ${count} content item(s) still reference it. Reassign or delete them first.`,
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
  await activityService.log(actor, "removed the", `'${existing.slug}' category`);
}

// ---- Public ----

export async function listPublic(locale: PublicLocale) {
  const rows = await db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.displayOrder));
  const full = await attachTranslationsAndCount(rows);

  return full.map((c) => ({
    slug: c.slug,
    navLabel: localize(c.name, locale),
    title: localize(c.name, locale),
    description: localize(c.description, locale),
    heroImage: c.heroImageUrl,
    heroImageAlt: localize(c.heroImageAlt, locale),
    iconUrl: c.iconUrl,
  }));
}

export async function getPublic(slug: string, locale: PublicLocale) {
  const [row] = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.active, true))).limit(1);
  if (!row) throw AppError.notFound("Category not found.");
  const [full] = await attachTranslationsAndCount([row]);
  if (!full) throw AppError.notFound("Category not found.");

  return {
    slug: full.slug,
    navLabel: localize(full.name, locale),
    title: localize(full.name, locale),
    description: localize(full.description, locale),
    heroImage: full.heroImageUrl,
    heroImageAlt: localize(full.heroImageAlt, locale),
    iconUrl: full.iconUrl,
  };
}

/** Internal helper for contentService — resolves a category row by id without the public/active filter. */
export async function requireCategoryRow(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) throw AppError.badRequest("categoryId does not reference an existing category.");
  return row;
}
