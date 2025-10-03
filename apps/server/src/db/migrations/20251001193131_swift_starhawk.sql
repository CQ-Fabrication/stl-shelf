-- Step 1: Add owner_id as nullable first
ALTER TABLE "organization" ADD COLUMN "owner_id" text;--> statement-breakpoint

-- Step 2: Populate owner_id with the first member who has 'owner' role, or the first member
UPDATE "organization" o
SET "owner_id" = (
  SELECT m."user_id"
  FROM "member" m
  WHERE m."organization_id" = o."id"
  AND m."role" = 'owner'
  LIMIT 1
);--> statement-breakpoint

-- Step 3: If still null (no owner role), use first member
UPDATE "organization" o
SET "owner_id" = (
  SELECT m."user_id"
  FROM "member" m
  WHERE m."organization_id" = o."id"
  LIMIT 1
)
WHERE "owner_id" IS NULL;--> statement-breakpoint

-- Step 4: Make owner_id NOT NULL now that it's populated
ALTER TABLE "organization" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint

-- Step 5: Add other billing columns
ALTER TABLE "organization" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "subscription_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "storage_limit" integer DEFAULT 104857600 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "model_count_limit" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "member_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_storage" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_model_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_member_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

-- Step 6: Add foreign key constraint
ALTER TABLE "organization" ADD CONSTRAINT "organization_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 7: Add unique constraint for polar_customer_id
ALTER TABLE "organization" ADD CONSTRAINT "organization_polar_customer_id_unique" UNIQUE("polar_customer_id");
