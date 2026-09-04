# Smoke test report — local dev against Supabase

Date: 2026-09-04
Environment: Supabase project `bitomyqwngxdpbyrutrj` (`eu-north-1`, Postgres 17.4), local `npm run dev` on `http://localhost:4000`.

## Setup verified

| Step | Result |
|---|---|
| Supabase connection | ✅ Reachable, project restored from paused state |
| `.env` from `.env.example` | ✅ `DATABASE_URL` (Supavisor session pooler — direct connection host is IPv6-only and unreachable from this network), `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` generated |
| `npm run db:migrate` | ✅ 9 tables created, matching `src/db/schema/` |
| `npm run db:seed` | ✅ 5 categories, 15 content items, 23 media, 5 users (1 admin / 2 editor / 2 viewer), 7 activity log entries — verified via direct SQL, not console output |

## API smoke tests

| Test | Endpoint | Expected | Result |
|---|---|---|---|
| Admin login | `POST /api/auth/login` | 200 + valid access/refresh cookies | ✅ |
| Editor login | `POST /api/auth/login` | 200 + valid access/refresh cookies | ✅ |
| Viewer login | `POST /api/auth/login` | 200 + valid access/refresh cookies | ✅ |
| Viewer mutation blocked | `POST /api/admin/categories` as viewer | 403 | ✅ |
| Editor blocked from users | `GET /api/admin/users` as editor | 403 | ✅ |
| Admin full access | `GET /api/admin/users` as admin | 200 | ✅ |
| Editor content/category/media mutation | `POST /api/admin/categories`, `POST /api/admin/content` as editor | 200/201 | ✅ |
| Category delete blocked | `DELETE /api/admin/categories/:id` on a category with linked content | 409 with clear message | ✅ |
| Content CRUD cycle | create → read → update (all 4 locales: fr/en/de/it, incl. non-ASCII) → delete → 404 on re-fetch | all steps succeed | ✅ |

Re-run in full after the DB password rotation (see below) with identical results.

## Bugs found and fixed during testing

1. **Malformed array literal in ID-array filters** (`categoryService.ts`, `contentService.ts`, `mediaService.ts`): `sql\`${col} = ANY(${array})\`` didn't bind JS arrays correctly, breaking every admin list/get for categories, content, and media. Fixed by switching to drizzle-orm's `inArray()` helper. See [`0001` — PR #1](https://github.com/REGENCY-14/mukalimv2-backend/pull/1).
2. **RLS disabled on all 9 tables** (Supabase advisor finding): enabled RLS with no policies — the app connects as the table owner (`postgres`), which Postgres exempts from RLS by default, so this was transparent to the app while closing the exposure to the `anon`/`authenticated` roles. See [`drizzle/0001_enable_rls.sql` — PR #2](https://github.com/REGENCY-14/mukalimv2-backend/pull/2).

## Known discrepancies (not bugs, just noted)

- Seed produces **23** media items; an earlier expectation assumed 22. The seed script's own `mediaSeeds` array has 23 entries — this is simply what's in [`src/db/seed.ts`](../src/db/seed.ts), not a defect.
- Repo's JWT env vars are `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, not `JWT_SECRET`.
- Admin/editor/category/user/content routes live under `/api/admin/...`, not bare `/categories` or `/users`.

## Post-rotation re-verification

The Supabase database password was rotated. `.env`'s `DATABASE_URL` was updated, the dev server restarted, and the full smoke test suite above was re-run against the new credentials with identical results.
