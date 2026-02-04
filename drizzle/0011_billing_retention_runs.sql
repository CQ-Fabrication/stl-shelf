CREATE TABLE "billing_retention_run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"status" text NOT NULL,
	"deleted_models" integer DEFAULT 0 NOT NULL,
	"deleted_bytes" bigint DEFAULT 0 NOT NULL,
	"retention_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_retention_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"total_organizations" integer DEFAULT 0 NOT NULL,
	"cleaned_organizations" integer DEFAULT 0 NOT NULL,
	"deleted_models" integer DEFAULT 0 NOT NULL,
	"deleted_bytes" bigint DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "billing_retention_run_items" ADD CONSTRAINT "billing_retention_run_items_run_id_billing_retention_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."billing_retention_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_retention_run_items" ADD CONSTRAINT "billing_retention_run_items_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_retention_run_items_run_idx" ON "billing_retention_run_items" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "billing_retention_run_items_org_idx" ON "billing_retention_run_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_retention_run_items_status_idx" ON "billing_retention_run_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_retention_runs_status_idx" ON "billing_retention_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_retention_runs_started_idx" ON "billing_retention_runs" USING btree ("started_at");