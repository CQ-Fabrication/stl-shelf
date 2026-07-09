CREATE TABLE "model_file_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"file_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"extension" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"actor_id" text NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "model_file_events_org_idx" ON "model_file_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "model_file_events_file_idx" ON "model_file_events" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "model_file_events_storage_key_idx" ON "model_file_events" USING btree ("storage_key");--> statement-breakpoint
-- The statements below re-state DDL already applied by the hand-written
-- 0015_security_hardening.sql, which never updated the drizzle snapshot.
-- Including them here (idempotently) heals the snapshot so db:generate stops
-- re-emitting them; they are no-ops on environments where 0015 ran.
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "billing_last_webhook_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_polar_customer_uidx" ON "organization" USING btree ("polar_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_subscription_uidx" ON "organization" USING btree ("subscription_id");