-- High-volume load-test seed for endless scroll/search/tag/isolation checks.
-- Scenario: two separate 3D print farms, each with 1,000 models and realistic tags.
-- Uses a single shared 3MF source payload pattern; storage keys stay unique per model.

WITH seed_users AS (
  INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
  VALUES
    (
      'usr_alpha_farm_owner',
      'Giulia Rinaldi',
      'giulia.rinaldi+alpha-farm@stlshelf.local',
      true,
      NOW() - INTERVAL '120 days',
      NOW() - INTERVAL '1 day'
    ),
    (
      'usr_helios_farm_owner',
      'Marco Bellini',
      'marco.bellini+helios-farm@stlshelf.local',
      true,
      NOW() - INTERVAL '95 days',
      NOW() - INTERVAL '1 day'
        ),
    (
      'usr_alpha_shift_lead',
      'Elena Conti',
      'elena.conti+alpha-team@stlshelf.local',
      true,
      NOW() - INTERVAL '110 days',
      NOW() - INTERVAL '1 day'
    ),
    (
      'usr_alpha_quality_tech',
      'Davide Gori',
      'davide.gori+alpha-team@stlshelf.local',
      true,
      NOW() - INTERVAL '105 days',
      NOW() - INTERVAL '1 day'
    ),
    (
      'usr_alpha_ops_planner',
      'Sara Moretti',
      'sara.moretti+alpha-team@stlshelf.local',
      true,
      NOW() - INTERVAL '100 days',
      NOW() - INTERVAL '1 day'
    )
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "email_verified" = EXCLUDED."email_verified",
    "updated_at" = NOW()
  RETURNING "id"
),
seed_latest_terms AS (
  SELECT "version"
  FROM "legal_documents"
  WHERE "type" = 'terms_and_conditions'
  ORDER BY "published_at" DESC
  LIMIT 1
),
seed_accounts AS (
  INSERT INTO "account" (
    "id",
    "account_id",
    "provider_id",
    "user_id",
    "password",
    "created_at",
    "updated_at"
  )
  SELECT
    format('acc_%s', su."id"),
    su."id",
    'credential',
    su."id",
    '4f85a7d65d619edcea5cf5d3529e3256:3e5f9b4e18314e9d3662c5e22aa9466f0225bd3950af420fc80f9ec7f138230e8216bad5efd311edf721067bb475b855ce34e10979ef59138978dd3a0e2ddcb0',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  FROM seed_users su
  ON CONFLICT ("id") DO UPDATE
  SET
    "account_id" = EXCLUDED."account_id",
    "provider_id" = EXCLUDED."provider_id",
    "user_id" = EXCLUDED."user_id",
    "password" = EXCLUDED."password",
    "updated_at" = NOW()
  RETURNING "id"
),
seed_consents AS (
  INSERT INTO "user_consents" (
    "id",
    "user_id",
    "terms_privacy_accepted",
    "terms_privacy_version",
    "terms_privacy_accepted_at",
    "marketing_accepted",
    "marketing_updated_at",
    "created_at",
    "updated_at"
  )
  SELECT
    format('consent_%s', su."id"),
    su."id",
    true,
    ltd."version",
    NOW() - INTERVAL '1 day',
    false,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  FROM seed_users su
  CROSS JOIN seed_latest_terms ltd
  ON CONFLICT ("user_id") DO UPDATE
  SET
    "terms_privacy_accepted" = EXCLUDED."terms_privacy_accepted",
    "terms_privacy_version" = EXCLUDED."terms_privacy_version",
    "terms_privacy_accepted_at" = EXCLUDED."terms_privacy_accepted_at",
    "marketing_accepted" = EXCLUDED."marketing_accepted",
    "marketing_updated_at" = EXCLUDED."marketing_updated_at",
    "updated_at" = NOW()
  RETURNING "id"
),
seed_consent_audit AS (
  INSERT INTO "consent_audit" (
    "id",
    "user_id",
    "consent_type",
    "action",
    "document_version",
    "ip_address",
    "user_agent",
    "fingerprint",
    "created_at"
  )
  SELECT
    format('audit_terms_%s', su."id"),
    su."id",
    'terms_and_privacy'::consent_type,
    'accepted'::consent_action,
    ltd."version",
    'seed',
    'seed',
    NULL,
    NOW() - INTERVAL '1 day'
  FROM seed_users su
  CROSS JOIN seed_latest_terms ltd
  UNION ALL
  SELECT
    format('audit_marketing_%s', su."id"),
    su."id",
    'marketing'::consent_type,
    'rejected'::consent_action,
    ltd."version",
    'seed',
    'seed',
    NULL,
    NOW() - INTERVAL '1 day'
  FROM seed_users su
  CROSS JOIN seed_latest_terms ltd
  ON CONFLICT ("id") DO UPDATE
  SET
    "action" = EXCLUDED."action",
    "document_version" = EXCLUDED."document_version",
    "ip_address" = EXCLUDED."ip_address",
    "user_agent" = EXCLUDED."user_agent",
    "fingerprint" = EXCLUDED."fingerprint",
    "created_at" = EXCLUDED."created_at"
  RETURNING "id"
),
seed_orgs AS (
  INSERT INTO "organization" (
    "id",
    "name",
    "slug",
    "created_at",
    "owner_id",
    "subscription_tier",
    "subscription_status",
    "storage_limit",
    "model_count_limit",
    "member_limit",
    "current_storage",
    "current_model_count",
    "current_member_count"
  )
  VALUES
    (
      'org_alpha_layerworks',
      'Alpha Layerworks',
      'alpha-layerworks',
      NOW() - INTERVAL '120 days',
      'usr_alpha_farm_owner',
      'pro',
      'active',
      214748364800,
      -1,
      5,
      0,
      0,
      4
    ),
    (
      'org_helios_printforge',
      'Helios Printforge',
      'helios-printforge',
      NOW() - INTERVAL '95 days',
      'usr_helios_farm_owner',
      'pro',
      'active',
      214748364800,
      -1,
      5,
      0,
      0,
      1
    )
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "slug" = EXCLUDED."slug",
    "owner_id" = EXCLUDED."owner_id",
    "subscription_tier" = EXCLUDED."subscription_tier",
    "subscription_status" = EXCLUDED."subscription_status",
    "storage_limit" = EXCLUDED."storage_limit",
    "model_count_limit" = EXCLUDED."model_count_limit",
    "member_limit" = EXCLUDED."member_limit"
  RETURNING "id"
),
seed_members AS (
  INSERT INTO "member" ("id", "organization_id", "user_id", "role", "created_at")
  VALUES
    ('mbr_alpha_owner', 'org_alpha_layerworks', 'usr_alpha_farm_owner', 'owner', NOW() - INTERVAL '120 days'),
    ('mbr_alpha_shift_lead', 'org_alpha_layerworks', 'usr_alpha_shift_lead', 'admin', NOW() - INTERVAL '110 days'),
    ('mbr_alpha_quality_tech', 'org_alpha_layerworks', 'usr_alpha_quality_tech', 'member', NOW() - INTERVAL '105 days'),
    ('mbr_alpha_ops_planner', 'org_alpha_layerworks', 'usr_alpha_ops_planner', 'member', NOW() - INTERVAL '100 days'),
    ('mbr_helios_owner', 'org_helios_printforge', 'usr_helios_farm_owner', 'owner', NOW() - INTERVAL '95 days')
  ON CONFLICT ("organization_id", "user_id") DO UPDATE
  SET
    "role" = EXCLUDED."role",
    "created_at" = EXCLUDED."created_at"
  RETURNING "id"
),
seed_tags AS (
  INSERT INTO "tags" ("id", "organization_id", "name", "color", "description", "usage_count", "created_at", "updated_at")
  VALUES
    -- Alpha Layerworks tags
    ('6f95d111-6fdb-4e3a-98f9-000000000101', 'org_alpha_layerworks', 'client-parts', '#2563EB', 'Commissioned customer prints', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000102', 'org_alpha_layerworks', 'prototype', '#0EA5E9', 'Rapid prototype queue', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000103', 'org_alpha_layerworks', 'functional', '#22C55E', 'Functional end-use parts', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000104', 'org_alpha_layerworks', 'jigs-fixtures', '#14B8A6', 'Workshop jigs and fixtures', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000105', 'org_alpha_layerworks', 'petg', '#84CC16', 'Printed mainly in PETG', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000106', 'org_alpha_layerworks', 'asa', '#65A30D', 'UV-resistant ASA parts', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000107', 'org_alpha_layerworks', 'batch-large', '#F59E0B', 'Large production batches', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000108', 'org_alpha_layerworks', 'rush-order', '#F97316', 'Urgent 24h turnaround', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000109', 'org_alpha_layerworks', 'validated', '#10B981', 'Dimensionally validated', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000110', 'org_alpha_layerworks', 'support-heavy', '#EF4444', 'Needs dense supports', 0, NOW(), NOW()),
    -- Helios Printforge tags
    ('6f95d111-6fdb-4e3a-98f9-000000000201', 'org_helios_printforge', 'fleet-maintenance', '#3B82F6', 'Printer fleet maintenance parts', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000202', 'org_helios_printforge', 'ecommerce', '#0284C7', 'Ecommerce product catalog', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000203', 'org_helios_printforge', 'enclosure-kit', '#16A34A', 'Electronics enclosure family', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000204', 'org_helios_printforge', 'multicolor', '#0891B2', 'Multi-color prepared models', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000205', 'org_helios_printforge', 'pla-plus', '#65A30D', 'PLA+ optimized profile', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000206', 'org_helios_printforge', 'pa-cf', '#4D7C0F', 'Carbon fiber nylon parts', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000207', 'org_helios_printforge', 'reprint-approved', '#F59E0B', 'Approved for fast reprint', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000208', 'org_helios_printforge', 'overnight', '#EA580C', 'Overnight production queue', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000209', 'org_helios_printforge', 'metrology-pass', '#059669', 'Passed metrology checks', 0, NOW(), NOW()),
    ('6f95d111-6fdb-4e3a-98f9-000000000210', 'org_helios_printforge', 'bridge-critical', '#DC2626', 'Bridge quality is critical', 0, NOW(), NOW())
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "color" = EXCLUDED."color",
    "description" = EXCLUDED."description",
    "updated_at" = NOW()
  RETURNING "id"
),
alpha_models AS (
  INSERT INTO "models" ("organization_id", "owner_id", "slug", "name", "description", "current_version", "total_versions", "created_at", "updated_at")
  SELECT
    'org_alpha_layerworks',
    'usr_alpha_farm_owner',
    format('alpha-%s', lpad(gs::text, 4, '0')),
    format('Alpha Bracket Series %s', lpad(gs::text, 4, '0')),
    format('Alpha Layerworks production model %s for client fixtures and machine-side replacement parts.', lpad(gs::text, 4, '0')),
    'v1',
    1,
    NOW() - ((1000 - gs) * INTERVAL '2 hours'),
    NOW() - ((1000 - gs) * INTERVAL '2 hours')
  FROM generate_series(1, 1000) AS gs
  ON CONFLICT ("organization_id", "slug") DO NOTHING
  RETURNING "id", "slug"
),
helios_models AS (
  INSERT INTO "models" ("organization_id", "owner_id", "slug", "name", "description", "current_version", "total_versions", "created_at", "updated_at")
  SELECT
    'org_helios_printforge',
    'usr_helios_farm_owner',
    format('helios-%s', lpad(gs::text, 4, '0')),
    format('Helios Housing Family %s', lpad(gs::text, 4, '0')),
    format('Helios Printforge catalog model %s for ecommerce kits and printer fleet upgrades.', lpad(gs::text, 4, '0')),
    'v1',
    1,
    NOW() - ((1000 - gs) * INTERVAL '90 minutes'),
    NOW() - ((1000 - gs) * INTERVAL '90 minutes')
  FROM generate_series(1, 1000) AS gs
  ON CONFLICT ("organization_id", "slug") DO NOTHING
  RETURNING "id", "slug"
),
all_models AS (
  SELECT * FROM alpha_models
  UNION ALL
  SELECT * FROM helios_models
),
seed_versions AS (
  INSERT INTO "model_versions" ("model_id", "version", "name", "description", "created_at", "updated_at")
  SELECT
    m."id",
    'v1',
    'Initial production-ready release',
    format('Baseline validated release for %s.', m."slug"),
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day'
  FROM all_models m
  ON CONFLICT ("model_id", "version") DO NOTHING
  RETURNING "id", "model_id"
),
seed_files AS (
  INSERT INTO "model_files" (
    "version_id",
    "filename",
    "original_name",
    "size",
    "mime_type",
    "extension",
    "storage_key",
    "storage_url",
    "storage_bucket",
    "file_metadata",
    "created_at",
    "updated_at"
  )
  SELECT
    v."id",
    'benchmark-load.3mf',
    'benchmark-load.3mf',
    15728640,
    'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    '3mf',
    format('seed/%s/%s/benchmark-load.3mf', mdl."organization_id", mdl."slug"),
    format('seed://%s/%s/benchmark-load.3mf', mdl."organization_id", mdl."slug"),
    'seed-bucket',
    jsonb_build_object(
      'processed', true,
      'processedAt', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'boundingBox', jsonb_build_object('width', 132.4, 'height', 56.8, 'depth', 104.2),
      'estimatedWeight', 186.5,
      'units', 'mm'
    ),
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '1 day'
  FROM "model_versions" v
  INNER JOIN "models" mdl ON mdl."id" = v."model_id"
  WHERE mdl."organization_id" IN ('org_alpha_layerworks', 'org_helios_printforge')
    AND v."version" = 'v1'
  ON CONFLICT ("storage_key") DO UPDATE
  SET
    "version_id" = EXCLUDED."version_id",
    "filename" = EXCLUDED."filename",
    "original_name" = EXCLUDED."original_name",
    "size" = EXCLUDED."size",
    "mime_type" = EXCLUDED."mime_type",
    "extension" = EXCLUDED."extension",
    "storage_url" = EXCLUDED."storage_url",
    "storage_bucket" = EXCLUDED."storage_bucket",
    "file_metadata" = EXCLUDED."file_metadata",
    "updated_at" = NOW()
  RETURNING "id", "version_id"
),
seed_model_tags AS (
  INSERT INTO "model_tags" ("model_id", "tag_id", "created_at")
  SELECT
    mdl."id",
    CASE
      WHEN mdl."organization_id" = 'org_alpha_layerworks'
        THEN ('6f95d111-6fdb-4e3a-98f9-' || lpad((101 + ((abs(('x' || substr(md5(mdl."slug"), 1, 8))::bit(32)::int) % 10)))::text, 12, '0'))::uuid
      ELSE ('6f95d111-6fdb-4e3a-98f9-' || lpad((201 + ((abs(('x' || substr(md5(mdl."slug"), 1, 8))::bit(32)::int) % 10)))::text, 12, '0'))::uuid
    END,
    NOW() - INTERVAL '7 days'
  FROM "models" mdl
  WHERE mdl."organization_id" IN ('org_alpha_layerworks', 'org_helios_printforge')
  ON CONFLICT ("model_id", "tag_id") DO NOTHING
  RETURNING "id"
),
seed_version_tags AS (
  INSERT INTO "version_tags" ("version_id", "tag_id", "created_at")
  SELECT
    v."id",
    CASE
      WHEN mdl."organization_id" = 'org_alpha_layerworks'
        THEN ('6f95d111-6fdb-4e3a-98f9-' || lpad((101 + ((abs(('x' || substr(md5(mdl."slug"), 9, 8))::bit(32)::int) % 10)))::text, 12, '0'))::uuid
      ELSE ('6f95d111-6fdb-4e3a-98f9-' || lpad((201 + ((abs(('x' || substr(md5(mdl."slug"), 9, 8))::bit(32)::int) % 10)))::text, 12, '0'))::uuid
    END,
    NOW() - INTERVAL '7 days'
  FROM "model_versions" v
  INNER JOIN "models" mdl ON mdl."id" = v."model_id"
  WHERE mdl."organization_id" IN ('org_alpha_layerworks', 'org_helios_printforge')
    AND v."version" = 'v1'
  ON CONFLICT ("version_id", "tag_id") DO NOTHING
  RETURNING "id"
)
SELECT
  (SELECT COUNT(*) FROM seed_users) AS users_upserted,
  (SELECT COUNT(*) FROM seed_accounts) AS accounts_upserted,
  (SELECT COUNT(*) FROM seed_consents) AS consents_upserted,
  (SELECT COUNT(*) FROM seed_consent_audit) AS consent_audit_upserted,
  (SELECT COUNT(*) FROM seed_orgs) AS orgs_upserted,
  (SELECT COUNT(*) FROM seed_members) AS members_upserted,
  (SELECT COUNT(*) FROM seed_tags) AS tags_upserted,
  (SELECT COUNT(*) FROM alpha_models) AS alpha_models_inserted,
  (SELECT COUNT(*) FROM helios_models) AS helios_models_inserted,
  (SELECT COUNT(*) FROM seed_versions) AS versions_inserted,
  (SELECT COUNT(*) FROM seed_files) AS files_inserted,
  (SELECT COUNT(*) FROM seed_model_tags) AS model_tags_inserted,
  (SELECT COUNT(*) FROM seed_version_tags) AS version_tags_inserted;

-- Keep usage counters coherent for tag-based UX tests.
UPDATE "tags" t
SET "usage_count" = usage.total
FROM (
  SELECT mt."tag_id", COUNT(*)::int AS total
  FROM "model_tags" mt
  GROUP BY mt."tag_id"
) usage
WHERE t."id" = usage."tag_id";

-- Keep organization counters coherent for dashboard/isolation checks.
UPDATE "organization" o
SET
  "current_model_count" = stats.model_count,
  "current_storage" = stats.storage_total,
  "current_member_count" = stats.member_count
FROM (
  SELECT
    org."id" AS org_id,
    COUNT(DISTINCT m."id")::int AS model_count,
    COALESCE(SUM(mf."size"), 0)::bigint AS storage_total,
    COUNT(DISTINCT mem."id")::int AS member_count
  FROM "organization" org
  LEFT JOIN "models" m ON m."organization_id" = org."id" AND m."deleted_at" IS NULL
  LEFT JOIN "model_versions" mv ON mv."model_id" = m."id"
  LEFT JOIN "model_files" mf ON mf."version_id" = mv."id"
  LEFT JOIN "member" mem ON mem."organization_id" = org."id"
  WHERE org."id" IN ('org_alpha_layerworks', 'org_helios_printforge')
  GROUP BY org."id"
) stats
WHERE o."id" = stats.org_id;
