ALTER TABLE "models" DROP CONSTRAINT "models_slug_unique";--> statement-breakpoint
DROP INDEX "models_slug_idx";--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "organization_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "models_org_slug_idx" ON "models" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "models_org_idx" ON "models" USING btree ("organization_id");