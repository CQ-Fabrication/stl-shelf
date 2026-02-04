ALTER TABLE "organization" ADD COLUMN "subscription_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_cancel_at_period_end" boolean DEFAULT false;