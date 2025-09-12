CREATE TABLE "tag_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "tag_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "version_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "type_id" uuid;--> statement-breakpoint
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_version_id_model_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_types_name_idx" ON "tag_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "version_tags_version_tag_idx" ON "version_tags" USING btree ("version_id","tag_id");--> statement-breakpoint
CREATE INDEX "version_tags_version_id_idx" ON "version_tags" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "version_tags_tag_id_idx" ON "version_tags" USING btree ("tag_id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_type_id_tag_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."tag_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tags_type_idx" ON "tags" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "tags_type_name_idx" ON "tags" USING btree ("type_id","name");--> statement-breakpoint
-- Insert default tag types
INSERT INTO "tag_types" ("name", "description") VALUES 
  ('category', 'Model categorization tags (fantasy, dragon, 28mm)'),
  ('attribute', 'Version-specific attributes (supports-added, hollowed, resin-ready)');