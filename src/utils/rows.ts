// Small helpers to keep `noUncheckedIndexedAccess` happy around Drizzle
// results without sprinkling non-null assertions everywhere.

/** Safely reads a `count(*)`-shaped aggregate row, defaulting to 0. */
export function countOf(rows: { count: number }[]): number {
  return rows[0]?.count ?? 0;
}

/** First row of a result set, or undefined — just a typed alias for rows[0]. */
export function firstOrUndefined<T>(rows: T[]): T | undefined {
  return rows[0];
}
