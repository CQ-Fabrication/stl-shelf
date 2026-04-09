-- Patched for drizzle-kit:
-- 1) COMMIT ends the migrator transaction before CONCURRENTLY (drizzle#860).
-- 2) CREATE EXTENSION runs again after COMMIT so pg_trgm is applied outside the opening txn.
-- 3) Schema-qualify gin_trgm_ops (e.g. drizzle.gin_trgm_ops): the migrator session often does
--    not use search_path that lists the extension schema first, so unqualified gin_trgm_ops
--    fails even when pg_trgm is installed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_org_active_updated_idx" ON "models" USING btree ("organization_id","updated_at" DESC,"id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_name_trgm_idx" ON "models" USING gin ("name" public.gin_trgm_ops) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_description_trgm_idx" ON "models" USING gin ((coalesce("description", '')) public.gin_trgm_ops) WHERE "deleted_at" IS NULL;
