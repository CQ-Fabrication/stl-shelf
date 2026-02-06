CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_org_active_updated_idx" ON "models" USING btree ("organization_id","updated_at" DESC,"id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_name_trgm_idx" ON "models" USING gin ("name" gin_trgm_ops) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "models_description_trgm_idx" ON "models" USING gin ((coalesce("description", '')) gin_trgm_ops) WHERE "deleted_at" IS NULL;
