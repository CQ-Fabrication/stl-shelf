-- Migration: Add database-level defaults for verification table timestamps
-- This was applied manually to fix magic link verification failures
-- Drizzle's .$defaultFn() only creates JS-level defaults, not database-level defaults
-- Better Auth needs database-level defaults for these columns

ALTER TABLE verification
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
