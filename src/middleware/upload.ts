import multer from "multer";
import { AppError } from "../utils/errors";

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;

// SVG deliberately excluded: it's an XML/text format that can carry
// <script>/event-handler content (verified live: an uploaded SVG with an
// embedded <script> was accepted and stored as-is). Supabase Storage's own
// response headers (Content-Disposition: attachment, a sandboxing CSP,
// nosniff) happen to neutralize it today, but that's a third party's
// behavior we don't control, not something this app enforces itself, so
// the raster-only allowlist is the actual fix, not a reliance on it.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Files are held in memory just long enough to stream to Supabase Storage
// (see ../utils/storage.ts), nothing touches local disk, which doesn't
// persist across Render restarts/redeploys on the Free plan.
// Image types only, 10MB max per file, matches the constraints already
// enforced client-side in MediaUploadZone.tsx (which should be updated to
// drop image/svg+xml from its own accept list to match).
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, "VALIDATION_ERROR", `Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
}).array("files", 20);
