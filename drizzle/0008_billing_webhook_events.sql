CREATE TABLE "billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"customer_id" text,
	"subscription_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "billing_webhook_events_type_idx" ON "billing_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_received_at_idx" ON "billing_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_customer_idx" ON "billing_webhook_events" USING btree ("customer_id");