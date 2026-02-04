ALTER TABLE "organization" ADD COLUMN "egress_bytes_this_month" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "egress_downloads_this_month" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "egress_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "egress_warning_80_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "egress_warning_100_sent_at" timestamp;