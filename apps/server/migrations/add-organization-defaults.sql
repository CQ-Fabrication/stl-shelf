-- Migration: Add database-level defaults for custom organization columns
-- Run this against the production Neon database
--
-- NOTE: This migration is OPTIONAL if you use db:push to create a fresh database.
-- Drizzle's .default() creates database-level defaults when using db:push.
-- This file exists as documentation and for manual fixes if needed.
--
-- The Better Auth organization plugin now has additionalFields config in auth.ts
-- that makes it aware of our custom fields, so values are set properly via hooks.

-- Add defaults for subscription fields (safety net)
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
