-- Add owner_id to models and index
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "owner_id" text;

-- Optional: add foreign key to auth user table
DO $$ BEGIN
  ALTER TABLE "models" ADD CONSTRAINT "models_owner_id_user_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "models_owner_idx" ON "models" ("owner_id");

