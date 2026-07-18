CREATE TABLE "billing_order" (
	"polar_order_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"tax_amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"product_id" text,
	"subscription_id" text,
	"billing_reason" text NOT NULL,
	"tier" text,
	"revenue_state" text DEFAULT 'pending' NOT NULL,
	"revenue_tracked_at" timestamp with time zone,
	"refunded_amount_minor" integer DEFAULT 0 NOT NULL,
	"refund_tracked_amount_minor" integer DEFAULT 0 NOT NULL,
	"refund_analytics_state" text DEFAULT 'not_applicable' NOT NULL,
	"refund_tracked_at" timestamp with time zone,
	"paid_at" timestamp with time zone NOT NULL,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "billing_order_organization_id_idx" ON "billing_order" USING btree ("organization_id");