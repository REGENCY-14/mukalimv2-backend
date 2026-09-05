# Deploying to Render

The repo is deployable via Render's standard "Web Service" flow. `render.yaml`
is provided for a reproducible, git-reviewable version of the same config if
you'd rather deploy via a [Blueprint](https://render.com/docs/blueprint-spec)
instead of the manual wizard; either path works.

## ⚠️ Build Command must be `npm ci --include=dev && npm run build`

**Not** the `npm install` Render auto-fills, and **not** plain `npm ci` either
— both silently break the build. Full story, since it took several rounds to
actually pin down:

1. Render's default auto-filled Build Command was `npm install` with no
   `npm run build` step at all, so `dist/` was never created and the Start
   Command (`node dist/server.js`) failed with `Cannot find module`.
2. Switching to `npm ci && npm run build` seemed right, but still failed —
   with confusing, inconsistent-looking TypeScript config errors that didn't
   reproduce locally no matter what `tsconfig.json` changes were tried.
3. **Actual root cause**: `NODE_ENV=production` is set as an env var on the
   service (correctly, per the checklist below) — but Render applies
   dashboard env vars during the *build* phase too, not just at runtime. A
   plain `npm ci` (or `npm install`) reads `NODE_ENV=production` and treats
   it as a signal to skip **devDependencies** — which includes `typescript`
   itself. Confirmed directly: `NODE_ENV=production npm ci` installs ~139
   packages here; a normal full install is ~174. Without `typescript` in
   `node_modules`, `npm run build`'s `tsc` command falls through PATH to
   whatever *other* `tsc` happens to exist in Render's build image (unrelated
   version, different defaults) — which is what produced the misleading,
   inconsistent config errors in step 2.
4. Fix: `npm ci --include=dev` forces devDependencies to install regardless
   of `NODE_ENV`. Confirmed: `NODE_ENV=production npm ci --include=dev`
   installs the full ~174 packages, `typescript` present, real build runs.

If you set up the service before this was documented, check **Settings →
Build & Deploy → Build Command** and update it by hand — `render.yaml` alone
won't fix an already-created service; Render doesn't re-read Blueprint
changes for services created via the manual wizard.

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

## Media uploads — now on Supabase Storage, not local disk

Originally flagged as a real problem here (Render's standard web service
filesystem is ephemeral — uploads written to local disk didn't survive a
redeploy or a free-tier instance spin-down) and confirmed live: an uploaded
file was fetchable immediately, then gone after the instance restarted.

Fixed by moving uploads to a Supabase Storage bucket (`media`, public —
[`drizzle/0003_create_media_storage_bucket.sql`](../drizzle/0003_create_media_storage_bucket.sql))
instead of local disk. `src/middleware/upload.ts` now holds files in memory
just long enough to hand them to `src/utils/storage.ts`, which uploads them
via the Supabase service-role client and returns a public URL — no code
path touches the filesystem anymore. Requires `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` (see the checklist below).

Verified against the live bucket: uploaded a test file, confirmed it's
fetchable at its public URL, deleted it via the API, confirmed the
`storage.objects` row is gone. One thing that looks odd but isn't a bug:
right after a delete, the public URL can still return the old file's `200`
for up to an hour — that's Cloudflare's edge CDN in front of Supabase
Storage serving a cached copy (`Cache-Control: public, max-age=3600`), not
the object actually still existing. The DB row and the underlying storage
object are both gone immediately; only the CDN's cached response lags.

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
| `SUPABASE_URL` | your Supabase project URL, e.g. `https://bitomyqwngxdpbyrutrj.supabase.co` | Same project as `DATABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** secret key | Dashboard → Project Settings → API. Bypasses RLS entirely — handle like `DATABASE_URL`/JWT secrets, never expose to a client. |
| `MAX_UPLOAD_SIZE_MB` | `10` | Optional, this is the code's default. |
| `SEED_DEMO_PASSWORD` | only if you plan to run `db:seed` against production | Skip this entirely if you're not seeding demo data in production (you almost certainly shouldn't). |

**Do not set `PORT`** — Render assigns it dynamically and injects it as an
env var; the app already reads `process.env.PORT`. Setting it yourself
will conflict with Render's own assignment.

## Manual steps in the Render dashboard (I can't do these — you'll need to)

1. **Create the Web Service**: New → Web Service → connect the
   `REGENCY-14/mukalimv2-backend` GitHub repo. If you use `render.yaml`,
   pick "New → Blueprint" instead and point it at this repo.
2. **Runtime**: Node. Build command `npm ci --include=dev && npm run build`
   (not Render's auto-filled `npm install` — see the warning above for why
   `--include=dev` specifically matters), start command `npm start`
   (auto-filled if using the Blueprint).
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
