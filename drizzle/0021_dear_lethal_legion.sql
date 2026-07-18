CREATE TABLE "organization_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"polar_subscription_id" text NOT NULL,
	"product_id" text NOT NULL,
	"addon_slug" text NOT NULL,
	"kind" text NOT NULL,
	"grant_bytes" bigint,
	"grant_seats" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_addons_polar_subscription_id_unique" UNIQUE("polar_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "organization_addons" ADD CONSTRAINT "organization_addons_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_addons_org_idx" ON "organization_addons" USING btree ("organization_id");