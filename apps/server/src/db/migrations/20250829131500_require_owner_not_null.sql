-- Enforce NOT NULL on owner_id for models

-- This will fail if any existing models have NULL owner_id.
-- Backfill or delete orphan rows before applying if needed.
ALTER TABLE "models" ALTER COLUMN "owner_id" SET NOT NULL;

