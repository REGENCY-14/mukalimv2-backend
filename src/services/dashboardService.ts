import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, contentItems, media } from "../db/schema";
import { countOf } from "../utils/rows";

export async function getStats() {
  const [totalCategoriesRows, totalContentItemsRows, draftsPendingRows, totalMediaFilesRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(categories),
    db.select({ count: sql<number>`count(*)::int` }).from(contentItems),
    db.select({ count: sql<number>`count(*)::int` }).from(contentItems).where(eq(contentItems.status, "draft")),
    db.select({ count: sql<number>`count(*)::int` }).from(media),
  ]);

  return {
    totalCategories: countOf(totalCategoriesRows),
    totalContentItems: countOf(totalContentItemsRows),
    draftsPending: countOf(draftsPendingRows),
    totalMediaFiles: countOf(totalMediaFilesRows),
  };
}
