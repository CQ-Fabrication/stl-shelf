CREATE TABLE "print_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"printer_name" text NOT NULL,
	"printer_name_normalized" text NOT NULL,
	"file_id" uuid NOT NULL,
	"thumbnail_path" text,
	"slicer_type" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "print_profiles" ADD CONSTRAINT "print_profiles_version_id_model_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."model_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_profiles" ADD CONSTRAINT "print_profiles_file_id_model_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."model_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "print_profiles_version_idx" ON "print_profiles" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "print_profiles_printer_idx" ON "print_profiles" USING btree ("printer_name_normalized");--> statement-breakpoint
CREATE INDEX "print_profiles_file_idx" ON "print_profiles" USING btree ("file_id");