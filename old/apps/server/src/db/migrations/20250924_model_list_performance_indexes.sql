-- Performance indexes for model list query optimization

-- Primary composite index for main filtering and ordering
-- Covers organization_id, soft delete check, and ordering by updated_at
CREATE INDEX IF NOT EXISTS models_org_deleted_updated_idx
  ON models (organization_id, deleted_at, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Composite index for model_tags join operations
-- Optimizes tag filtering in listModels query
CREATE INDEX IF NOT EXISTS model_tags_composite_idx
  ON model_tags (tag_id, model_id);

-- Index for tag lookups by organization and name
-- Supports efficient tag filtering
CREATE INDEX IF NOT EXISTS tags_org_name_idx
  ON tags (organization_id, name);

-- Index for model versions to model relationship
-- Optimizes file count aggregation
CREATE INDEX IF NOT EXISTS model_versions_model_id_idx
  ON model_versions (model_id);

-- Index for model files to version relationship
-- Optimizes file size aggregation
CREATE INDEX IF NOT EXISTS model_files_version_id_idx
  ON model_files (version_id);

-- Optional: GIN index for text search if heavily used
-- Uncomment if search functionality is a primary use case
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS models_search_trgm_idx
--   ON models USING gin(name gin_trgm_ops, description gin_trgm_ops)
--   WHERE organization_id IS NOT NULL AND deleted_at IS NULL;