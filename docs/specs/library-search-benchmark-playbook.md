---
title: Library Search Benchmark Playbook
summary: Canonical EXPLAIN ANALYZE BUFFERS queries and checklist for library search performance regressions.
read_when:
  - You change query/index logic for library search
  - You need to compare search performance before/after a migration
---

# Library Search Benchmark Playbook

This playbook defines the canonical `EXPLAIN (ANALYZE, BUFFERS)` queries to benchmark library search.

## Prerequisites

1. Seed data loaded (`drizzle/seeds/002_load_test_two_orgs.sql`).
2. Connect with:

```bash
psql "postgresql://stlshelf:stlshelf_dev_password@localhost:5432/stlshelf"
```

## Canonical Queries

Use one organization with high cardinality, for example `org_alpha_layerworks`.

### Q1: Base list (no search, no tags)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.updated_at
FROM models m
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
ORDER BY m.updated_at DESC
       , m.id DESC
LIMIT 13;
```

Expected:

1. `Index Only Scan` or `Index Scan` on org + updated index.
2. Low shared buffer reads.

### Q2: Substring search (name/description)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.updated_at
FROM models m
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
  AND (m.name ILIKE '%0999%' OR COALESCE(m.description, '') ILIKE '%0999%')
ORDER BY m.updated_at DESC
       , m.id DESC
LIMIT 13;
```

Expected:

1. Trigram index usage (`Bitmap Index Scan` on `models_name_trgm_idx` / `models_description_trgm_idx`) for broad search.
2. No full-table sequential scan on `models` for selective terms.

### Q3: Search + tag filter

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.updated_at
FROM models m
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
  AND (m.name ILIKE '%0999%' OR COALESCE(m.description, '') ILIKE '%0999%')
  AND m.id IN (
    SELECT mt.model_id
    FROM model_tags mt
    INNER JOIN tags t ON t.id = mt.tag_id
    WHERE t.organization_id = 'org_alpha_layerworks'
      AND t.name IN ('support-heavy')
  )
ORDER BY m.updated_at DESC
       , m.id DESC
LIMIT 13;
```

Expected:

1. `model_tags_tag_id_idx` usage for tag narrowing.
2. No pathological row explosion in nested loops.

## Optional Stress Query (Keyset Depth)

```sql
-- Step 1: get a real cursor from the first page (last row)
SELECT m.id, m.updated_at
FROM models m
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
ORDER BY m.updated_at DESC, m.id DESC
LIMIT 13;
```

Copy `updated_at` + `id` from row 13 and run:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.updated_at
FROM models m
WHERE m.organization_id = 'org_alpha_layerworks'
  AND m.deleted_at IS NULL
  AND (m.updated_at, m.id) < (TIMESTAMPTZ '2026-01-01T00:00:00Z', '00000000-0000-0000-0000-000000000000'::uuid)
ORDER BY m.updated_at DESC, m.id DESC
LIMIT 13;
```

This verifies keyset pagination performance without scanning/discarding deep offsets.

## Benchmark Checklist

For each query capture:

1. `Execution Time`
2. `Planning Time`
3. Main scan node and index name
4. `Buffers: shared hit/read`
5. `Rows Removed by Filter` on the main `models` scan

Store results in PR notes as:

```text
Q1: 0.20 ms (Index Only Scan models_org_active_updated_idx, shared hit=3)
Q2: 0.23 ms (Bitmap Index Scan models_name_trgm_idx + models_description_trgm_idx)
Q3: 0.47 ms (model_tags_tag_id_idx + models_pkey join path)
```

## Guardrails

1. Measure with `EXPLAIN (ANALYZE, BUFFERS)` before changing memory knobs.
2. Do not tune global `shared_buffers` or `work_mem` for app-level query regressions.
3. Prefer query/index fixes first; infra tuning only after repeatable evidence.
