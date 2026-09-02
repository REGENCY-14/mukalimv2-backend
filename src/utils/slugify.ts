// Mirrors slugify() in the frontend's CategoryFormPanel.tsx — kept in sync
// so a slug auto-derived client-side and one re-derived/validated
// server-side agree.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
