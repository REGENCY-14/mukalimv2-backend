-- Public read policies for the anon/authenticated roles (Supabase's
-- PostgREST + client-SDK access path). The app's own backend connects as
-- the table owner ("postgres", which has BYPASSRLS) and is unaffected by
-- any of this — these policies only matter if this project's anon/service
-- keys are ever used directly against Supabase's REST API.
--
-- anon/authenticated already hold blanket table-level GRANTs (Supabase's
-- schema-wide default for `public`), so RLS policies are the only thing
-- gating row visibility here. Only SELECT is granted below; with no
-- INSERT/UPDATE/DELETE policy defined, those remain fully denied to both
-- roles by Postgres's RLS default-deny — no explicit "deny" policy needed.
--
-- categories / content_items expose only what's actually public:
--   - categories:      active = true
--   - content_items:   status = 'published'
-- The *_translations tables have no visibility flag of their own, so their
-- policies join back to the parent row's flag.
--
-- media has no status/active column at all — it's just an asset record.
-- Rather than exposing all media metadata unconditionally, visibility
-- mirrors mediaService.attachUsage()'s own "usedIn" computation: a media
-- row is public if its URL is the icon/hero image of an active category or
-- the featured image of a published content item.
--
-- users, activity_log, and settings intentionally get no policies at all —
-- nothing should ever read those directly via anon/authenticated.

drop policy if exists "Public can view active categories" on "categories";--> statement-breakpoint
create policy "Public can view active categories"
  on "categories"
  for select
  to anon, authenticated
  using ("active" = true);--> statement-breakpoint

drop policy if exists "Public can view translations of active categories" on "category_translations";--> statement-breakpoint
create policy "Public can view translations of active categories"
  on "category_translations"
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from "categories" c
      where c."id" = "category_translations"."category_id"
        and c."active" = true
    )
  );--> statement-breakpoint

drop policy if exists "Public can view published content" on "content_items";--> statement-breakpoint
create policy "Public can view published content"
  on "content_items"
  for select
  to anon, authenticated
  using ("status" = 'published');--> statement-breakpoint

drop policy if exists "Public can view translations of published content" on "content_translations";--> statement-breakpoint
create policy "Public can view translations of published content"
  on "content_translations"
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from "content_items" ci
      where ci."id" = "content_translations"."content_id"
        and ci."status" = 'published'
    )
  );--> statement-breakpoint

drop policy if exists "Public can view media used in public content" on "media";--> statement-breakpoint
create policy "Public can view media used in public content"
  on "media"
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from "categories" c
      where c."active" = true
        and (c."icon_url" = "media"."url" or c."hero_image_url" = "media"."url")
    )
    or exists (
      select 1 from "content_items" ci
      where ci."status" = 'published'
        and ci."featured_image_url" = "media"."url"
    )
  );--> statement-breakpoint

drop policy if exists "Public can view media translations used in public content" on "media_translations";--> statement-breakpoint
create policy "Public can view media translations used in public content"
  on "media_translations"
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from "media" m
      where m."id" = "media_translations"."media_id"
        and (
          exists (
            select 1 from "categories" c
            where c."active" = true
              and (c."icon_url" = m."url" or c."hero_image_url" = m."url")
          )
          or exists (
            select 1 from "content_items" ci
            where ci."status" = 'published'
              and ci."featured_image_url" = m."url"
          )
        )
    )
  );
