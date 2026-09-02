# mukalimv2-backend

Backend API for the [MUKALIM](https://mukalim-v2.vercel.app) public site and admin
dashboard. Node.js + Express + TypeScript, PostgreSQL via Drizzle ORM, JWT
sessions in httpOnly cookies. Built to be a drop-in replacement for the
frontend's mock data layer — see [`docs/`](../Mukalim-v2/docs) in the
frontend repo (`API_ENDPOINTS.md`, `DATABASE_SCHEMA.md`) for the source
scope this implements.

## Stack

- **Runtime**: Node.js ≥ 18.18
- **Framework**: Express
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (`drizzle-kit` for migrations)
- **Validation**: Zod, on every request body/query
- **Auth**: JWT access + refresh tokens, delivered as httpOnly cookies;
  passwords hashed with bcrypt

## Project layout

```
src/
  db/schema/     Drizzle table definitions (source of truth for the schema)
  db/            db client, migrate script, seed script
  routes/        Express routers — one per resource
  controllers/   thin request/response glue
  services/      business logic + queries (the layer routes/controllers call into)
  middleware/    auth, RBAC, validation, error handling, uploads, rate limiting
  schemas/       Zod request schemas
  types/         shared TS types (LocalizedText, AuthUser, ...)
  utils/         jwt, password hashing, slugify, pagination, cookies
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   | Var | Purpose |
   |---|---|
   | `DATABASE_URL` | Postgres connection string |
   | `PORT` | API port (default `4000`) |
   | `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32-char random secrets |
   | `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | token lifetimes |
   | `COOKIE_DOMAIN` / `COOKIE_SECURE` | cookie flags — set `COOKIE_SECURE=true` in production (HTTPS) |
   | `UPLOAD_DIR` / `MAX_UPLOAD_SIZE_MB` | local media storage (dev) |
   | `SEED_DEMO_PASSWORD` | password set on every seeded demo user |

3. **Create the database** (any local Postgres works)

   ```sql
   CREATE DATABASE mukalim;
   ```

4. **Run migrations**

   ```bash
   npm run db:generate   # generates SQL from src/db/schema/* into ./drizzle
   npm run db:migrate    # applies it
   ```

5. **Seed demo data** (matches the frontend's mock data — same categories,
   sample content, and 5 users across all three roles)

   ```bash
   npm run db:seed
   ```

   Every seeded user shares the password in `SEED_DEMO_PASSWORD`
   (`Password123!` by default):

   | Email | Role | Status |
   |---|---|---|
   | amara@mukalim.com | admin | active |
   | jordan@mukalim.com | editor | active |
   | priya@mukalim.com | editor | invited |
   | sam@mukalim.com | viewer | active |
   | chidi@mukalim.com | viewer | disabled |

6. **Run it**

   ```bash
   npm run dev     # tsx watch, http://localhost:4000
   npm run build && npm start   # production build
   ```

## Auth notes

- Sessions are two JWTs (access ~15m, refresh ~30d) set as httpOnly,
  `SameSite=Lax` cookies — `POST /api/auth/login` sets both,
  `POST /api/auth/refresh` rotates them, `POST /api/auth/logout` clears them.
- Refresh tokens are **stateless** (verified by signature + expiry only,
  no server-side revocation list) — logout only clears the cookie
  client-side. Add a `token_version` column + check before shipping this to
  production if you need "log out everywhere" or forced revocation.
- The invite flow (`POST /api/admin/users`, aliased at `POST /api/auth/invite`)
  creates a `status: "invited"` user and returns a one-time `inviteToken`
  directly in the response — there's no email provider wired up in this
  scaffold. `POST /api/auth/accept-invite` exchanges that token + a chosen
  password to activate the account. Wire the token into a real invite email
  before shipping.
- The frontend's "preview as" role switcher (`Topbar.tsx`) is a dev-only UI
  affordance with no server counterpart here by design — see the note in
  `docs/API_ENDPOINTS.md`.

## Role-based access control

Mirrors `src/lib/admin/permissions.ts` in the frontend:

| Role | Read | Create/edit/delete content, categories, media | Manage users |
|---|---|---|---|
| `viewer` | ✅ | ❌ (403) | ❌ (403) |
| `editor` | ✅ | ✅ | ❌ (403) |
| `admin` | ✅ | ✅ | ✅ |

Enforced server-side in `src/middleware/rbac.ts` (`requireEditor`,
`requireAdmin`), applied per-route — not just hidden in the UI.

## Endpoints

Base path `/api`. Full request/response shapes are in the frontend repo's
`docs/API_ENDPOINTS.md`; short list below.

**Auth**
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` ·
`GET /auth/session` · `POST /auth/invite` (admin) · `POST /auth/accept-invite`

**Public** (no auth, published content / active categories only)
`GET /categories` · `GET /categories/:slug` ·
`GET /categories/:slug/articles` · `GET /categories/:slug/articles/:articleSlug`

**Admin — Categories** (`canEdit` for writes)
`GET /admin/categories` · `POST /admin/categories` ·
`PATCH /admin/categories/:id` · `PATCH /admin/categories/:id/toggle-active` ·
`DELETE /admin/categories/:id` *(blocked with 409 while content still
references the category)*

**Admin — Content** (`canEdit` for writes)
`GET /admin/content` · `GET /admin/content/:id` · `POST /admin/content` ·
`PATCH /admin/content/:id` · `DELETE /admin/content/:id`

**Admin — Media** (`canEdit` for writes)
`GET /admin/media` · `POST /admin/media` (multipart, field `files`, image
types only, 10MB/file max) · `PATCH /admin/media/:id/alt-text` ·
`DELETE /admin/media/:id`

**Admin — Users** (admin only, every route)
`GET /admin/users` · `POST /admin/users` · `PATCH /admin/users/:id` ·
`DELETE /admin/users/:id` *(blocked deleting yourself or the last admin)*

**Admin — Dashboard**
`GET /admin/dashboard/stats` · `GET /admin/dashboard/activity`

**Admin — Settings** (singleton, `canEdit` for writes)
`GET /admin/settings` · `PATCH /admin/settings`

## Errors

Every error response is `{ "error": { "code": "...", "message": "...", "details"?: ... } }`
with the matching HTTP status (`400`/`401`/`403`/`404`/`409`/`500`). Zod
validation failures and Postgres unique-constraint violations are normalized
to this shape automatically (`src/middleware/errorHandler.ts`).

## File storage

Uploads land on local disk under `UPLOAD_DIR` (served at `/uploads/*`) in
dev. `src/services/mediaService.ts` only ever deals in a `url` string, so
swapping in S3-compatible storage later means replacing
`src/middleware/upload.ts`'s disk storage + `mediaService.remove`'s
`fs.unlink` — nothing else in the codebase assumes local disk.

## Known gaps vs. a full production build

- No refresh-token revocation list (see Auth notes above).
- No transactional email (invite tokens are returned directly, not emailed).
- `category_id`/`content_id` deletes are hard deletes, no soft-delete/trash.
- CORS/cookie config assumes the API and frontend are on different origins
  behind HTTPS in production — double-check `COOKIE_SECURE`, `COOKIE_DOMAIN`,
  and `CORS_ORIGINS` before deploying.
