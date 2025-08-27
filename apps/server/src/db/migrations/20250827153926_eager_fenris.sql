CREATE TABLE "model_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"extension" text NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"storage_bucket" text NOT NULL,
	"file_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "model_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"thumbnail_path" text,
	"print_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"current_version" text DEFAULT 'v1' NOT NULL,
	"total_versions" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"description" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "model_files" ADD CONSTRAINT "model_files_version_id_model_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_tags" ADD CONSTRAINT "model_tags_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_tags" ADD CONSTRAINT "model_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "model_files_version_id_idx" ON "model_files" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_files_storage_key_idx" ON "model_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "model_files_filename_idx" ON "model_files" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "model_files_extension_idx" ON "model_files" USING btree ("extension");--> statement-breakpoint
CREATE UNIQUE INDEX "model_tags_model_tag_idx" ON "model_tags" USING btree ("model_id","tag_id");--> statement-breakpoint
CREATE INDEX "model_tags_model_id_idx" ON "model_tags" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "model_tags_tag_id_idx" ON "model_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_versions_model_version_idx" ON "model_versions" USING btree ("model_id","version");--> statement-breakpoint
CREATE INDEX "model_versions_model_id_idx" ON "model_versions" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "model_versions_version_idx" ON "model_versions" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "models_slug_idx" ON "models" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "models_name_idx" ON "models" USING btree ("name");--> statement-breakpoint
CREATE INDEX "models_updated_at_idx" ON "models" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tags_usage_count_idx" ON "tags" USING btree ("usage_count");