CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(80) NOT NULL,
	"body" varchar(500),
	"cta_url" varchar(500),
	"cta_label" varchar(30),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_announcement_reads" (
	"user_id" text NOT NULL,
	"announcement_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_announcement_reads_user_id_announcement_id_pk" PRIMARY KEY("user_id","announcement_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "grace_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_is_deleted_idx" ON "announcements" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "announcements_active_idx" ON "announcements" USING btree ("is_deleted","created_at");--> statement-breakpoint
CREATE INDEX "user_announcement_reads_user_idx" ON "user_announcement_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_announcement_reads_announcement_idx" ON "user_announcement_reads" USING btree ("announcement_id");