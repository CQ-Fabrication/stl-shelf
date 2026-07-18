ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_type_id_tag_types_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "tags_type_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tags_org_type_name_idx";--> statement-breakpoint
ALTER TABLE "tags" DROP COLUMN IF EXISTS "type_id";--> statement-breakpoint
DROP TABLE IF EXISTS "tag_types" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "version_tags" CASCADE;
