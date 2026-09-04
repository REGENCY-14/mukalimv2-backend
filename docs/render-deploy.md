# Deploying to Render

The repo is deployable via Render's standard "Web Service" flow with no
special setup — `npm ci && npm run build` / `npm start` are auto-detected
from `package.json`. `render.yaml` is provided for a reproducible,
git-reviewable version of the same config if you'd rather deploy via a
[Blueprint](https://render.com/docs/blueprint-spec) instead of the manual
wizard; either path works.

## What was fixed in the repo for this

- **Cross-domain cookies** ([src/utils/cookies.ts](../src/utils/cookies.ts)):
  auth cookies now use `SameSite=None` in production (frontend on Vercel,
  backend on Render — different domains, so the cookie is cross-site from
  the browser's point of view) and stay `SameSite=Lax` in local dev.
  `Secure` was already forced on whenever `NODE_ENV=production`, which is
  required for `SameSite=None` to be honored at all — verified that pairing
  holds.
- **CORS** ([src/app.ts](../src/app.ts)): already read `CORS_ORIGINS` from
  env (comma-separated, trimmed) with `credentials: true` — no change
  needed, just confirmed.
- **`PORT`** ([src/server.ts](../src/server.ts)): already read from
  `process.env.PORT` — no change needed, just confirmed. Also fixed a
  cosmetic log line that always claimed `http://localhost:<port>`, which is
  wrong once this runs on Render.
- **Build/start scripts** ([package.json](../package.json)): already
  correct — `build` runs `tsc`, `start` runs the compiled
  `dist/server.js` (not `tsx`/`ts-node`) — no change needed.

## ⚠️ Not fixed — flagging for you

**Media uploads won't survive a deploy.** [`upload.ts`](../src/middleware/upload.ts)
writes files to local disk (`multer.diskStorage`). Render's standard web
service filesystem is ephemeral — every deploy, restart, or scale event
gets a fresh disk, so anything in `uploads/` is gone. Options, in rough
order of effort: attach a [Render Persistent
Disk](https://render.com/docs/disks) (works, but doesn't survive across
multiple instances if you ever scale horizontally), or wire up real object
storage (S3/R2/Supabase Storage — `mediaService.ts`'s own comments already
flag this as a pre-production TODO). Not touched here since it's a real
architecture decision, not a config fix.

## Environment variable checklist (Render dashboard → Environment)

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Supabase pooler connection string | Use the **session-mode** pooler (port `5432`), not transaction-mode (`6543`) — this app's persistent connection pool and the migration runner need session state. See the comment in `.env` for the exact reasoning. |
| `JWT_ACCESS_SECRET` | a long random secret | **Generate a new one for production** — don't reuse the value from your local `.env`. |
| `JWT_REFRESH_SECRET` | a long random secret | Same — new value, don't reuse local. |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Optional, this is the code's default. |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Optional, this is the code's default. |
| `CORS_ORIGINS` | your Vercel frontend's exact URL(s), comma-separated | e.g. `https://mukalim-v2.vercel.app` — add a preview-deployment domain too if you need CORS to work on Vercel previews, not just production. |
| `COOKIE_SECURE` | `true` | Belt-and-suspenders — `NODE_ENV=production` already forces this, but set it explicitly. |
| `COOKIE_DOMAIN` | **leave unset** | Do not set this to `localhost` or anything else in production. Frontend (`*.vercel.app`) and backend (`*.onrender.com`) are unrelated domains, not subdomains of a shared parent — an explicit `domain` here will make the browser reject the cookie entirely. Leaving it unset scopes the cookie to the backend's own host, which is what you want. |
| `UPLOAD_DIR` | `uploads` | Only matters if you attach a persistent disk; see the flag above. |
| `MAX_UPLOAD_SIZE_MB` | `10` | Optional, this is the code's default. |
| `SEED_DEMO_PASSWORD` | only if you plan to run `db:seed` against production | Skip this entirely if you're not seeding demo data in production (you almost certainly shouldn't). |

**Do not set `PORT`** — Render assigns it dynamically and injects it as an
env var; the app already reads `process.env.PORT`. Setting it yourself
will conflict with Render's own assignment.

## Manual steps in the Render dashboard (I can't do these — you'll need to)

1. **Create the Web Service**: New → Web Service → connect the
   `REGENCY-14/mukalimv2-backend` GitHub repo. If you use `render.yaml`,
   pick "New → Blueprint" instead and point it at this repo.
2. **Runtime**: Node. Build command `npm ci && npm run build`, start
   command `npm start` (auto-filled if using the Blueprint).
3. **Environment variables**: enter every row from the checklist above
   under Settings → Environment.
4. **Health check path**: set to `/health` (Settings → Health Check Path) —
   the app already exposes this route and it's declared in `render.yaml` if
   you use the Blueprint.
5. **Region**: pick one close to your Supabase project (`eu-north-1`) to
   minimize latency — Frankfurt is closest among Render's regions.
6. **First deploy**: trigger it, then check the deploy logs for `MUKALIM
   API listening on port ...` and confirm `GET https://<your-service>.onrender.com/health`
   returns `{"status":"ok"}`.
7. **Run the first production migration — deliberately, once** (see below).
8. **Update the frontend's API base URL** on Vercel to point at the new
   Render service URL, and redeploy the frontend so it actually calls the
   new backend.
9. **Re-test login from the deployed frontend**, not just via curl — this
   is the real test of the `SameSite=None` cookie fix, since only a genuine
   cross-origin browser request exercises it.

## Running `db:migrate` against production

**I did not run this — it needs to be you, deliberately, once**, since it's
a real schema change against a real database with no dry-run.

Two ways to do it, your call:

- **One-time manual run** (recommended for the first deploy, so you can
  watch it happen): from your machine, temporarily set `DATABASE_URL` to
  the production connection string and run `npm run db:migrate` locally,
  or run it from Render's dashboard Shell tab on the deployed service
  (Settings → Shell) so it runs from the exact deployed environment.
- **Render Pre-Deploy Command**: Render supports a "Pre-Deploy Command"
  (Settings → Pre-Deploy Command, or `preDeployCommand` in `render.yaml` —
  present but commented out in this repo's `render.yaml`) that runs after
  every successful build, before traffic switches to the new deploy.
  `npm run db:migrate` is safe to enable this way long-term (drizzle's
  migrator skips already-applied migrations), but I'd still do the very
  first production migration manually so you can watch it succeed before
  making it an unattended step in every future deploy.
