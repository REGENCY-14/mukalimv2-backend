import fs from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, contentItems, media, mediaTranslations } from "../db/schema";
import { emptyLocalizedText, type LocalizedText } from "../types/localized";
import { parsePageParams, buildMeta } from "../utils/pagination";
import { AppError } from "../utils/errors";
import { UPLOAD_DIR } from "../middleware/upload";
import type { UpdateAltTextInput } from "../schemas/media";
import type { Actor } from "./activityService";
import * as activityService from "./activityService";

const LOCALES: (keyof LocalizedText)[] = ["fr", "en", "de", "it"];

function toLocalizedText(rows: { locale: string; value: string }[]): LocalizedText {
  const out = emptyLocalizedText();
  for (const row of rows) if (row.locale in out) out[row.locale as keyof LocalizedText] = row.value;
  return out;
}

/**
 * "usedIn" is computed on read rather than hand-maintained (the mock's
 * `usedIn: string[]` was just seeded label strings with no real
 * referential link — see media_usage in the schema doc). Two EXISTS-style
 * lookups against categories/content_items instead of a join table.
 */
async function attachUsage(rows: (typeof media.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const urls = rows.map((r) => r.url);
  const ids = rows.map((r) => r.id);

  const [translations, categoryUses, contentUses] = await Promise.all([
    db.select().from(mediaTranslations).where(sql`${mediaTranslations.mediaId} = ANY(${ids})`),
    db
      .select({ url: categories.iconUrl, name: categories.slug, categoryId: categories.id, kind: sql<string>`'icon'` })
      .from(categories)
      .where(sql`${categories.iconUrl} = ANY(${urls}) OR ${categories.heroImageUrl} = ANY(${urls})`),
    db
      .select({ url: contentItems.featuredImageUrl, slug: contentItems.slug, categoryId: contentItems.categoryId })
      .from(contentItems)
      .where(sql`${contentItems.featuredImageUrl} = ANY(${urls})`),
  ]);

  const byMedia = new Map<string, typeof translations>();
  for (const t of translations) {
    const list = byMedia.get(t.mediaId) ?? [];
    list.push(t);
    byMedia.set(t.mediaId, list);
  }

  return rows.map((row) => {
    const usedIn: string[] = [];
    const usedInCategoryIds = new Set<string>();
    for (const c of categoryUses) {
      if (c.url === row.url) {
        usedIn.push(`${c.name} category`);
        usedInCategoryIds.add(c.categoryId);
      }
    }
    for (const c of contentUses) {
      if (c.url === row.url) {
        usedIn.push(`'${c.slug}' article`);
        usedInCategoryIds.add(c.categoryId);
      }
    }

    const rowTranslations = byMedia.get(row.id) ?? [];
    return {
      id: row.id,
      filename: row.filename,
      url: row.url,
      sizeKb: row.sizeKb,
      width: row.width,
      height: row.height,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt,
      altText: toLocalizedText(rowTranslations.map((t) => ({ locale: t.locale, value: t.altText }))),
      usedIn,
      _usedInCategoryIds: usedInCategoryIds,
    };
  });
}

export async function list(query: Record<string, unknown>) {
  const { page, limit } = parsePageParams(query, 30);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (typeof query.search === "string" && query.search) conditions.push(ilike(media.filename, `%${query.search}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db.select().from(media).where(where).orderBy(desc(media.uploadedAt));
  let withUsage = await attachUsage(rows);

  if (typeof query.category === "string" && query.category) {
    withUsage = withUsage.filter((m) => m._usedInCategoryIds.has(query.category as string));
  }

  const total = withUsage.length;
  const paged = withUsage.slice(offset, offset + limit).map(({ _usedInCategoryIds, ...rest }) => rest);

  return { data: paged, meta: buildMeta(total, { page, limit }) };
}

export interface UploadedFile {
  filename: string;
  storedFilename: string;
  sizeKb: number;
  width: number;
  height: number;
}

export async function create(files: UploadedFile[], actor: Actor) {
  const created: (typeof media.$inferSelect)[] = [];
  for (const file of files) {
    const [row] = await db
      .insert(media)
      .values({
        filename: file.filename,
        url: `/uploads/${file.storedFilename}`,
        sizeKb: file.sizeKb,
        width: file.width,
        height: file.height,
        uploadedBy: actor.id,
      })
      .returning();
    if (!row) throw new AppError(500, "INTERNAL_ERROR", "Failed to save uploaded file.");

    await db.insert(mediaTranslations).values(LOCALES.map((locale) => ({ mediaId: row.id, locale, altText: "" })));
    await activityService.log(actor, "uploaded", `'${file.filename}'`);
    created.push(row);
  }

  const withUsage = await attachUsage(created);
  return withUsage.map(({ _usedInCategoryIds, ...rest }) => rest);
}

export async function updateAltText(id: string, input: UpdateAltTextInput, actor: Actor) {
  const [existing] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Media item not found.");

  for (const locale of LOCALES) {
    const value = input.altText[locale] ?? "";
    await db
      .insert(mediaTranslations)
      .values({ mediaId: id, locale, altText: value })
      .onConflictDoUpdate({ target: [mediaTranslations.mediaId, mediaTranslations.locale], set: { altText: value } });
  }

  await activityService.log(actor, "updated alt text for", `'${existing.filename}'`);
  const [withUsage] = await attachUsage([existing]);
  if (!withUsage) throw AppError.notFound("Media item not found.");
  const { _usedInCategoryIds, ...rest } = withUsage;
  return rest;
}

export async function remove(id: string, actor: Actor) {
  const [existing] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Media item not found.");

  await db.delete(media).where(eq(media.id, id));

  // Best-effort local-disk cleanup — a no-op once storage is swapped to S3.
  if (existing.url.startsWith("/uploads/")) {
    const filePath = path.join(UPLOAD_DIR, path.basename(existing.url));
    await fs.unlink(filePath).catch(() => undefined);
  }

  await activityService.log(actor, "removed", `'${existing.filename}'`);
}
