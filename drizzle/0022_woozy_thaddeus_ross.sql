CREATE TABLE "egress_daily_rollups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"usage_date" date NOT NULL,
	"delivery_kind" text NOT NULL,
	"delivery_path" text NOT NULL,
	"requests_started" bigint DEFAULT 0 NOT NULL,
	"requests_completed" bigint DEFAULT 0 NOT NULL,
	"requests_aborted" bigint DEFAULT 0 NOT NULL,
	"requests_failed" bigint DEFAULT 0 NOT NULL,
	"bytes_requested" bigint DEFAULT 0 NOT NULL,
	"bytes_served" bigint DEFAULT 0 NOT NULL,
	"bytes_aborted" bigint DEFAULT 0 NOT NULL,
	"range_requests" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egress_daily_rollups_dedup_idx" UNIQUE NULLS NOT DISTINCT("organization_id","usage_date","delivery_kind","delivery_path")
);
--> statement-breakpoint
CREATE TABLE "metering_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "storage_hourly_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"snapshot_hour" timestamp with time zone NOT NULL,
	"logical_bytes" bigint DEFAULT 0 NOT NULL,
	"billable_bytes" bigint DEFAULT 0 NOT NULL,
	"object_count" bigint DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"reconciled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_hourly_snapshots_dedup_idx" UNIQUE NULLS NOT DISTINCT("organization_id","snapshot_hour","source")
);
--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"organization_id" text,
	"object_kind" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"billable_bytes" bigint NOT NULL,
	"model_id" uuid,
	"version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "storage_objects_storage_key_idx" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE INDEX "egress_daily_rollups_org_date_idx" ON "egress_daily_rollups" USING btree ("organization_id","usage_date");--> statement-breakpoint
CREATE INDEX "metering_runs_kind_started_idx" ON "metering_runs" USING btree ("job_kind","started_at");--> statement-breakpoint
CREATE INDEX "storage_hourly_snapshots_org_hour_idx" ON "storage_hourly_snapshots" USING btree ("organization_id","snapshot_hour");--> statement-breakpoint
CREATE INDEX "storage_objects_org_idx" ON "storage_objects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "storage_objects_org_deleted_idx" ON "storage_objects" USING btree ("organization_id","deleted_at");