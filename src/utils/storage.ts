import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const MEDIA_BUCKET = "media";
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${MEDIA_BUCKET}/`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set — copy .env.example and fill them in.");
}

// Service-role client: bypasses storage RLS entirely, same trust level as
// this app's own "postgres" Postgres connection (see drizzle/0001_enable_rls.sql).
// Never expose this key to a client — it's server-only, same handling as
// DATABASE_URL/JWT secrets.
const bucket = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
}).storage.from(MEDIA_BUCKET);

function uniqueStoredName(originalName: string): string {
  const ext = path.extname(originalName);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

/** Uploads a file's in-memory buffer and returns its public URL. */
export async function uploadFile(originalName: string, buffer: Buffer, contentType: string): Promise<string> {
  const storedName = uniqueStoredName(originalName);
  const { error } = await bucket.upload(storedName, buffer, { contentType, upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(storedName).data.publicUrl;
}

/** True if this URL points at a file this app manages in the media bucket
 * (as opposed to a seed-data URL pointing at the frontend's static assets). */
export function isManagedUrl(url: string): boolean {
  return url.includes(PUBLIC_URL_MARKER);
}

/** Best-effort delete — safe to call on any URL; no-ops on ones this app
 * doesn't manage (see isManagedUrl) or that are already gone. */
export async function deleteFile(url: string): Promise<void> {
  if (!isManagedUrl(url)) return;
  const storedName = url.slice(url.indexOf(PUBLIC_URL_MARKER) + PUBLIC_URL_MARKER.length);
  await bucket.remove([storedName]).catch(() => undefined);
}
