-- Migration: Add database-level defaults for custom organization columns
-- Run this against the production Neon database
-- Drizzle's .default() only creates JS-level defaults, not database-level defaults
-- Better Auth needs database-level defaults for custom columns it doesn't know about

-- Add defaults for subscription fields
ALTER TABLE organization ALTER COLUMN subscription_tier SET DEFAULT 'free';
ALTER TABLE organization ALTER COLUMN subscription_status SET DEFAULT 'active';

-- Add defaults for resource limits
ALTER TABLE organization ALTER COLUMN storage_limit SET DEFAULT 104857600; -- 100MB in bytes
ALTER TABLE organization ALTER COLUMN model_count_limit SET DEFAULT 20;
ALTER TABLE organization ALTER COLUMN member_limit SET DEFAULT 1;

-- Add defaults for usage tracking
ALTER TABLE organization ALTER COLUMN current_storage SET DEFAULT 0;
ALTER TABLE organization ALTER COLUMN current_model_count SET DEFAULT 0;
ALTER TABLE organization ALTER COLUMN current_member_count SET DEFAULT 1;

-- Note: owner_id is now set via Better Auth's beforeCreateOrganization hook in auth.ts
