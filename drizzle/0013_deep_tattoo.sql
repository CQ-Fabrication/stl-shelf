CREATE TABLE "account_deletion_run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" text,
	"user_email" text,
	"status" text NOT NULL,
	"deleted_organizations" integer DEFAULT 0 NOT NULL,
	"deleted_bytes" bigint DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_deletion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"total_users" integer DEFAULT 0 NOT NULL,
	"deleted_users" integer DEFAULT 0 NOT NULL,
	"deleted_organizations" integer DEFAULT 0 NOT NULL,
	"deleted_bytes" bigint DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "account_deletion_run_items" ADD CONSTRAINT "account_deletion_run_items_run_id_account_deletion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."account_deletion_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_run_items_run_idx" ON "account_deletion_run_items" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "account_deletion_run_items_status_idx" ON "account_deletion_run_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_deletion_runs_status_idx" ON "account_deletion_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "account_deletion_runs_started_idx" ON "account_deletion_runs" USING btree ("started_at");