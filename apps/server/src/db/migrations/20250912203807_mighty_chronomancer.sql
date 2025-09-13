CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
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
	"organization_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"current_version" text DEFAULT 'v1' NOT NULL,
	"total_versions" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tag_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "tag_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type_id" uuid,
	"color" text,
	"description" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "version_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_files" ADD CONSTRAINT "model_files_version_id_model_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_tags" ADD CONSTRAINT "model_tags_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_tags" ADD CONSTRAINT "model_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_type_id_tag_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."tag_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_version_id_model_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_tags" ADD CONSTRAINT "version_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "models_org_slug_idx" ON "models" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "models_name_idx" ON "models" USING btree ("name");--> statement-breakpoint
CREATE INDEX "models_updated_at_idx" ON "models" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "models_owner_idx" ON "models" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "models_org_idx" ON "models" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "models_deleted_at_idx" ON "models" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_types_name_idx" ON "tag_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_idx" ON "tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "tags_org_idx" ON "tags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tags_type_idx" ON "tags" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "tags_usage_count_idx" ON "tags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "tags_org_type_name_idx" ON "tags" USING btree ("organization_id","type_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "version_tags_version_tag_idx" ON "version_tags" USING btree ("version_id","tag_id");--> statement-breakpoint
CREATE INDEX "version_tags_version_id_idx" ON "version_tags" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "version_tags_tag_id_idx" ON "version_tags" USING btree ("tag_id");