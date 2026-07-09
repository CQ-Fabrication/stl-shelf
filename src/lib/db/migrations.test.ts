import { describe, expect, it } from "vitest";
import {
  isConcurrentStatement,
  pendingMigrations,
  runsOutsideTransaction,
  splitSqlStatements,
  type MigrationFile,
} from "./migrations";

const migration = (overrides: Partial<MigrationFile>): MigrationFile => ({
  tag: "0000_test",
  whenMs: 1,
  hash: "hash-0000",
  sql: "SELECT 1;",
  ...overrides,
});

describe("splitSqlStatements", () => {
  it("splits on statement breakpoints and trims", () => {
    const sql = [
      'CREATE TABLE "a" (id int);--> statement-breakpoint',
      'ALTER TABLE "a" ADD COLUMN name text;--> statement-breakpoint',
      'CREATE INDEX "a_idx" ON "a" (id);',
    ].join("\n");

    expect(splitSqlStatements(sql)).toEqual([
      'CREATE TABLE "a" (id int);',
      'ALTER TABLE "a" ADD COLUMN name text;',
      'CREATE INDEX "a_idx" ON "a" (id);',
    ]);
  });

  it("returns a single statement when there is no breakpoint", () => {
    expect(splitSqlStatements("SELECT 1;\n")).toEqual(["SELECT 1;"]);
  });

  it("drops empty segments from trailing breakpoints", () => {
    expect(splitSqlStatements("SELECT 1;--> statement-breakpoint\n  \n")).toEqual(["SELECT 1;"]);
  });
});

describe("isConcurrentStatement", () => {
  it("detects CREATE INDEX CONCURRENTLY case-insensitively", () => {
    expect(isConcurrentStatement('CREATE INDEX CONCURRENTLY IF NOT EXISTS "i" ON "t" (c)')).toBe(
      true,
    );
    expect(isConcurrentStatement('create unique index concurrently "i" on "t" (c)')).toBe(true);
    expect(isConcurrentStatement('DROP INDEX CONCURRENTLY "i"')).toBe(true);
  });

  it("does not flag regular DDL", () => {
    expect(isConcurrentStatement('CREATE INDEX "i" ON "t" (c)')).toBe(false);
    expect(isConcurrentStatement("CREATE EXTENSION IF NOT EXISTS pg_trgm")).toBe(false);
    expect(isConcurrentStatement('ALTER TABLE "t" ADD COLUMN concurrent_jobs int')).toBe(false);
  });
});

describe("runsOutsideTransaction", () => {
  it("is true when any statement is concurrent", () => {
    const sql = [
      "CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint",
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "i" ON "t" (c);',
    ].join("\n");
    expect(runsOutsideTransaction(migration({ sql }))).toBe(true);
  });

  it("is false for transactional migrations", () => {
    expect(runsOutsideTransaction(migration({ sql: 'ALTER TABLE "t" ADD COLUMN c int;' }))).toBe(
      false,
    );
  });
});

describe("pendingMigrations", () => {
  const journal = [
    migration({ tag: "0000_a", hash: "h0" }),
    migration({ tag: "0001_b", hash: "h1" }),
    migration({ tag: "0002_c", hash: "h2" }),
  ];

  it("returns unapplied migrations in journal order", () => {
    const pending = pendingMigrations(journal, new Set(["h1"]));
    expect(pending.map((m) => m.tag)).toEqual(["0000_a", "0002_c"]);
  });

  it("returns everything for an empty database", () => {
    expect(pendingMigrations(journal, new Set()).map((m) => m.tag)).toEqual([
      "0000_a",
      "0001_b",
      "0002_c",
    ]);
  });

  it("returns nothing when all hashes are recorded", () => {
    expect(pendingMigrations(journal, new Set(["h0", "h1", "h2"]))).toEqual([]);
  });
});
