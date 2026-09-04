-- Enable Row Level Security on every table. No policies are added: the app
-- connects as the table owner ("postgres"), which bypasses RLS by default,
-- so this is transparent to the app. It closes the exposure Supabase's
-- advisor flags — these tables would otherwise be fully readable/writable
-- by the anon/authenticated roles if this project's PostgREST API or
-- client-side Supabase keys are ever used against them.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
