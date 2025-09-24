# Drizzle ORM & PostgreSQL Performance Patterns

## Executive Summary

This document captures critical patterns, optimizations, and lessons learned while building high-performance database operations with Drizzle ORM and PostgreSQL. These patterns have been battle-tested and proven to deliver sub-millisecond query times while maintaining code clarity and type safety.

## 🚨 Critical SQL Template Literal Rules

### The Interpolation Problem

When using Drizzle's `sql` template literals with correlated subqueries, incorrect interpolation causes PostgreSQL "column reference is ambiguous" errors.

#### ❌ WRONG - Causes Ambiguity Error
```typescript
sql`(
  SELECT COUNT(*)
  FROM ${users} u
  WHERE u.org_id = ${orgs.id}  -- Error: column reference 'id' is ambiguous
)`
```

#### ✅ CORRECT - Plain Column Reference
```typescript
sql`(
  SELECT COUNT(*)
  FROM ${users} u
  WHERE u.org_id = orgs.id  -- Works: references outer query's orgs table
)`
```

### The Rule

- **Use `${table}`** for table references in FROM/JOIN clauses
- **Use plain `column`** for column references in WHERE clauses of correlated subqueries
- **Use `${table.column}`** only in the main query's SELECT/WHERE clauses

### Why This Happens

The `${}` interpolation in Drizzle generates fully qualified column references that PostgreSQL cannot resolve in correlated subquery contexts. Plain column references allow PostgreSQL to correctly identify the correlation with the outer query.

## 📊 Query Pattern Selection Guide

### Pattern 1: Correlated Subqueries for Aggregation

**When to Use**: Need aggregated data (counts, sums, arrays) alongside main records

```typescript
const results = await db
  .select({
    id: table.id,
    name: table.name,
    // Correlated subquery for count
    itemCount: sql<number>`(
      SELECT COUNT(*)::int
      FROM ${items} i
      WHERE i.table_id = table.id
    )`,
    // Correlated subquery for array aggregation
    tags: sql<string[]>`(
      SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
      FROM ${tableTags} tt
      INNER JOIN ${tags} t ON t.id = tt.tag_id
      WHERE tt.table_id = table.id
    )`,
  })
  .from(table);
```

**Performance**: ✅ Excellent (0.068ms for typical queries)
**Database Trips**: 1
**Type Safety**: Full with `sql<T>`

### Pattern 2: LEFT JOIN + GROUP BY for Complex Aggregation

**When to Use**: Multiple aggregations on the same related data with complex calculations

```typescript
const results = await db
  .select({
    id: table.id,
    totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)::bigint`,
    fileCount: sql<number>`COUNT(${files.id})::int`,
    avgSize: sql<number>`AVG(${files.size})::int`,
  })
  .from(table)
  .leftJoin(files, eq(files.tableId, table.id))
  .groupBy(table.id);
```

**Performance**: ✅ Can be faster than correlated subqueries for complex aggregations
**Database Trips**: 1
**Type Safety**: Full

### Pattern 3: Drizzle Relational Queries

**When to Use**: Need full nested data structures, not aggregations

```typescript
const result = await db.query.table.findFirst({
  where: eq(table.id, id),
  with: {
    items: true,
    tags: {
      with: {
        tag: true
      }
    }
  }
});
```

**Performance**: ⚠️ Transfers all related data
**Database Trips**: 1 (but more data transfer)
**Type Safety**: Excellent with inferred types

### Pattern 4: Multiple Queries (Anti-Pattern)

**When to Avoid**: Almost always

```typescript
// ❌ AVOID THIS
const table = await db.select().from(tables).where(eq(tables.id, id));
const items = await db.select().from(items).where(eq(items.tableId, id));
const tags = await db.select().from(tags).where(eq(tags.tableId, id));
```

**Performance**: ❌ Poor (multiple round trips)
**Database Trips**: N
**Type Safety**: Manual correlation required

## 🎯 Common Misconceptions Debunked

### Myth 1: "Correlated Subqueries are N+1 Queries"

**Reality**: PostgreSQL executes correlated subqueries as a **single optimized query**. They are fundamentally different from application-level N+1 patterns.

```sql
-- This executes as ONE query, not N+1
SELECT
  m.*,
  (SELECT COUNT(*) FROM items WHERE item.model_id = m.id) as item_count
FROM models m;
```

### Myth 2: "JOINs are Always Faster than Subqueries"

**Reality**: For aggregation scenarios, correlated subqueries often outperform JOINs because:
- No intermediate result set creation
- Better index utilization for each subquery
- Cleaner execution plans

### Myth 3: "Derived Tables are Superior"

**Reality**: PostgreSQL's query planner often generates identical execution plans for correlated subqueries and derived tables. Choose based on readability and maintainability.

## 🚀 Performance Optimization Strategies

### Essential Indexes

```sql
-- Composite index for filtered queries with sorting
CREATE INDEX table_org_deleted_updated_idx ON table
  (organization_id, deleted_at, updated_at DESC);

-- Foreign key indexes for JOINs and subqueries
CREATE INDEX items_table_id_idx ON items (table_id);

-- Composite indexes for many-to-many relationships
CREATE INDEX table_tags_composite_idx ON table_tags (tag_id, table_id);
```

### Query Analysis Commands

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT ... your query here ...;

-- Key metrics to check:
-- - Execution time < 20ms
-- - Buffer hit ratio > 99%
-- - Index scans being used
-- - No sequential scans on large tables
```

### Type Conversions for PostgreSQL Types

```typescript
// Handle PostgreSQL bigint (returns as string)
totalSize: sql<number>`COALESCE(SUM(size), 0)::bigint`,
// In application: Number(result.totalSize)

// Handle arrays with proper defaults
tags: sql<string[]>`COALESCE(ARRAY_AGG(name), '{}'::text[])`,

// Handle JSON aggregation
data: sql<Record<string, any>>`
  COALESCE(json_object_agg(key, value), '{}'::json)
`,
```

## 🔄 Sequential Operations & Parallelization

### Identifying Bottlenecks

Sequential operations compound latency. Common patterns to avoid:

```typescript
// ❌ Sequential file uploads
for (const file of files) {
  await uploadFile(file);  // Each waits for previous
}

// ✅ Parallel with concurrency control
await Promise.all(
  files.map(file => uploadFile(file))
);

// ✅ Or with controlled concurrency
const pool = new PromisePool(files, 3); // Max 3 concurrent
await pool.process(uploadFile);
```

### Database Operation Batching

```typescript
// ❌ Sequential tag operations
for (const tag of tags) {
  await db.insert(tags).values(tag).onConflictDoNothing();
}

// ✅ Batch insert with conflict handling
await db.insert(tags)
  .values(tags)
  .onConflictDoUpdate({
    target: tags.name,
    set: { usageCount: sql`${tags.usageCount} + 1` }
  });
```

## 🛡️ Type Safety Patterns

### Single Source of Truth

```typescript
// Define schemas in router/API layer
const responseSchema = z.object({
  id: z.string(),
  count: z.number(),
  tags: z.array(z.string()),
});

// Infer types from schemas
export type ApiResponse = z.infer<typeof responseSchema>;

// Use in service layer
async function getData(): Promise<ApiResponse> {
  // Implementation ensures type compliance
}
```

### Raw SQL Type Safety

```typescript
// Always specify types for SQL template literals
const result = await db.select({
  count: sql<number>`COUNT(*)::int`,
  total: sql<number>`SUM(amount)::numeric`,
  names: sql<string[]>`ARRAY_AGG(name)`,
  metadata: sql<Record<string, any>>`data::json`,
});
```

## 🔧 Error Handling & Recovery

### Transaction Patterns

```typescript
try {
  const result = await db.transaction(async (tx) => {
    // All operations use tx, not db
    const model = await tx.insert(models).values(data).returning();
    await tx.insert(versions).values({ modelId: model.id });
    return model;
  });
} catch (error) {
  // Transaction automatically rolled back
  // Perform cleanup of external resources (S3, etc.)
  await cleanupExternalResources();
}
```

### Parallel Cleanup Operations

```typescript
// ✅ Parallel cleanup on failure
const cleanupResults = await Promise.allSettled(
  uploadedFiles.map(file =>
    storage.deleteFile(file.key).catch(err =>
      console.error(`Failed to delete ${file.key}:`, err)
    )
  )
);
```

## 📈 Monitoring & Performance Targets

### Key Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Query execution time | < 20ms | Review indexes |
| Database round trips | 1 per request | Consolidate queries |
| Buffer cache hit ratio | > 99% | Increase cache/optimize queries |
| Connection pool usage | < 80% | Scale connection pool |
| Transaction duration | < 100ms | Break into smaller transactions |

### Scaling Thresholds

- **< 10,000 records**: Current patterns work excellently
- **10,000 - 100,000 records**: Ensure proper indexing
- **100,000 - 1M records**: Consider partitioning
- **> 1M records**: Implement caching layer, read replicas

## 🎓 Key Takeaways

1. **Correlated subqueries are your friend** for aggregation - they're NOT N+1 queries
2. **SQL interpolation rules are critical** - memorize when to use `${}` vs plain references
3. **Measure before optimizing** - use EXPLAIN ANALYZE to verify assumptions
4. **Parallelize independent operations** - sequential operations are the silent killer
5. **Type safety throughout** - use Drizzle's type system and Zod schemas consistently
6. **Single query is usually optimal** - avoid multiple round trips when possible
7. **Indexes make or break performance** - design them based on query patterns

## References

- [PostgreSQL Query Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- Internal Performance Analysis: `model-list-performance.md`, `model-create-performance.md`