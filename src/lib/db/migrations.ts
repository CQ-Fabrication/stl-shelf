import type { Sql, TransactionSql } from "postgres";

/**
 * Custom migration runner core, used by scripts/migrate.ts.
 *
 * Replaces `drizzle-kit migrate` for applying migrations because drizzle-kit
 * wraps every migration in a transaction, and Postgres rejects
 * CREATE/DROP INDEX CONCURRENTLY inside a transaction block (this silently
 * broke prod deploys for 0014+0015). Uses the same `drizzle.__drizzle_migrations`
 * bookkeeping table as drizzle-kit, so the two stay interoperable.
 */

export interface MigrationFile {
  /** Journal tag, e.g. "0014_library_search_perf" */
  tag: string;
  /** Journal `when` timestamp (ms) — written to created_at like drizzle-kit does */
  whenMs: number;
  /** sha256 hex of the raw .sql file content — same format drizzle-kit records */
  hash: string;
  /** Raw .sql file content */
  sql: string;
}

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Statements that Postgres refuses to run inside a transaction block.
 * CONCURRENTLY only appears in CREATE/DROP INDEX and REINDEX, all of which
 * share that restriction. A false positive (e.g. the word in a comment) is
 * safe: the migration just loses transactional atomicity.
 */
export function isConcurrentStatement(statement: string): boolean {
  return /\bconcurrently\b/i.test(statement);
}

export function runsOutsideTransaction(migration: MigrationFile): boolean {
  return splitSqlStatements(migration.sql).some(isConcurrentStatement);
}

/**
 * Migrations not yet recorded in drizzle.__drizzle_migrations, in journal order.
 * Matching by hash (not by created_at like drizzle-kit) keeps out-of-band
 * repairs safe: a manually recorded migration is skipped regardless of the
 * created_at value it was inserted with.
 */
export function pendingMigrations(
  journal: MigrationFile[],
  appliedHashes: ReadonlySet<string>,
): MigrationFile[] {
  return journal.filter((migration) => !appliedHashes.has(migration.hash));
}

export async function ensureMigrationsTable(sql: Sql): Promise<void> {
  await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
  await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;
}

export async function fetchAppliedHashes(sql: Sql): Promise<Set<string>> {
  const rows = await sql<{ hash: string }[]>`
    SELECT hash FROM "drizzle"."__drizzle_migrations"
  `;
  return new Set(rows.map((row) => row.hash));
}

async function applyMigration(sql: Sql, migration: MigrationFile): Promise<void> {
  const statements = splitSqlStatements(migration.sql);

  if (runsOutsideTransaction(migration)) {
    // CONCURRENTLY forbids a surrounding transaction, so every statement runs
    // in autocommit mode with no rollback on failure. The migration guidelines
    // require such migrations to be fully idempotent (IF NOT EXISTS / IF EXISTS),
    // which also makes the rerun safe if the bookkeeping insert below fails.
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    await recordMigration(sql, migration);
    return;
  }

  // DDL and bookkeeping commit atomically: if the record insert fails, the
  // whole migration rolls back and the next start can rerun it cleanly —
  // otherwise a committed CREATE TABLE would be retried and crash the boot.
  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
    await recordMigration(tx, migration);
  });
}

async function recordMigration(sql: Sql | TransactionSql, migration: MigrationFile): Promise<void> {
  await sql.unsafe(
    'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
    [migration.hash, migration.whenMs],
  );
}

export interface MigrateResult {
  applied: string[];
}

/**
 * Applies all pending migrations in journal order. Throws on the first
 * failure; already-applied migrations stay recorded, the failing one does not.
 */
export async function runMigrations(
  sql: Sql,
  journal: MigrationFile[],
  log: (message: string) => void = console.log,
): Promise<MigrateResult> {
  await ensureMigrationsTable(sql);
  const appliedHashes = await fetchAppliedHashes(sql);
  const pending = pendingMigrations(journal, appliedHashes);

  for (const migration of pending) {
    const mode = runsOutsideTransaction(migration)
      ? "outside transaction (CONCURRENTLY)"
      : "in transaction";
    log(`[migrate] applying ${migration.tag} (${mode})`);
    await applyMigration(sql, migration);
  }

  return { applied: pending.map((migration) => migration.tag) };
}
