ALTER TABLE "model_file_events" ADD COLUMN "model_name" text;--> statement-breakpoint
ALTER TABLE "model_file_events" ADD COLUMN "version_label" text;--> statement-breakpoint
CREATE INDEX "model_file_events_org_created_idx" ON "model_file_events" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);