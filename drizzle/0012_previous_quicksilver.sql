ALTER TABLE "organization" ADD COLUMN "account_deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "account_deletion_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "account_deletion_canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "account_deletion_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_notice_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_deletion_final_notice_sent_at" timestamp with time zone;