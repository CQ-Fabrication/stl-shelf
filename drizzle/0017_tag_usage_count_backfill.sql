-- Backfill tags.usage_count, which drifted upward because updateModelTags
-- deleted model_tags links without decrementing and re-incremented surviving
-- tags on every save, and model soft-delete never decremented at all.
-- Source of truth: model_tags links to non-deleted models.
UPDATE "tags" SET "usage_count" = (
	SELECT count(*)
	FROM "model_tags" "mt"
	JOIN "models" "m" ON "m"."id" = "mt"."model_id"
	WHERE "mt"."tag_id" = "tags"."id" AND "m"."deleted_at" IS NULL
);
