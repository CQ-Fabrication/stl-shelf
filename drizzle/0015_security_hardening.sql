ALTER TABLE "organization"
ADD COLUMN IF NOT EXISTS "billing_last_webhook_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_polar_customer_uidx"
ON "organization" USING btree ("polar_customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_subscription_uidx"
ON "organization" USING btree ("subscription_id");
