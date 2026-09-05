-- Creates the Supabase Storage bucket used for uploaded media
-- (src/utils/storage.ts). Public so uploaded files are servable via
-- Supabase's public object URL with no auth header — the same trust level
-- as the local /uploads static route this replaces. The backend writes to
-- it using the service-role key, which bypasses storage RLS entirely (same
-- trust level as this app's own "postgres" Postgres connection), so no
-- storage.objects policies are needed here for the app's own reads/writes.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
