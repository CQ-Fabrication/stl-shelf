// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { meteringRuns, storageHourlySnapshots } from "@/lib/db/schema/metering";
import { runHourlySnapshot } from "./storage-snapshot";

const ORG = "org_snap";

async function createSchema(): Promise<void> {
  await db.execute(sql`
    create table if not exists "storage_objects" (
      "id" uuid primary key default gen_random_uuid(),
      "storage_key" text not null unique,
      "organization_id" text,
      "object_kind" text not null,
      "size_bytes" bigint not null,
      "billable_bytes" bigint not null,
      "model_id" uuid,
      "version_id" uuid,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz
    )
  `);
  await db.execute(sql`
    create table if not exists "storage_hourly_snapshots" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text,
      "snapshot_hour" timestamptz not null,
      "logical_bytes" bigint not null default 0,
      "billable_bytes" bigint not null default 0,
      "object_count" bigint not null default 0,
      "source" text not null,
      "reconciled" boolean not null default false,
      "created_at" timestamptz not null default now(),
      constraint "storage_hourly_snapshots_dedup_idx"
        unique nulls not distinct ("organization_id","snapshot_hour","source")
    )
  `);
  await db.execute(sql`
    create table if not exists "metering_runs" (
      "id" uuid primary key default gen_random_uuid(),
      "job_kind" text not null,
      "started_at" timestamptz not null default now(),
      "completed_at" timestamptz,
      "status" text not null default 'running',
      "details" jsonb
    )
  `);
}

beforeEach(async () => {
  await db.execute(sql`drop table if exists "storage_objects" cascade`);
  await db.execute(sql`drop table if exists "storage_hourly_snapshots" cascade`);
  await db.execute(sql`drop table if exists "metering_runs" cascade`);
  await createSchema();

  await db.execute(sql`
    insert into "storage_objects" ("storage_key", "organization_id", "object_kind", "size_bytes", "billable_bytes", "deleted_at")
    values
      ('a/source', ${ORG}, 'source', 100000, 100000, null),
      ('a/artifact', ${ORG}, 'artifact', 30000, 65536, null),
      ('temp/x', null, 'temp', 50000, 65536, null),
      ('a/deleted', ${ORG}, 'source', 999999, 999999, now())
  `);
});

describe("runHourlySnapshot", () => {
  const at = new Date("2026-07-18T11:42:31.000Z");

  it("writes one row per org plus an unattributed row, excluding deleted objects", async () => {
    const summary = await runHourlySnapshot(at);

    expect(summary.snapshotHour).toBe("2026-07-18T11:00:00.000Z");
    expect(summary.organizations).toBe(1);
    expect(summary.totalObjects).toBe(3);

    const rows = await db.select().from(storageHourlySnapshots);
    expect(rows).toHaveLength(2);

    const orgRow = rows.find((row) => row.organizationId === ORG);
    expect(Number(orgRow?.logicalBytes)).toBe(130_000);
    expect(Number(orgRow?.billableBytes)).toBe(165_536);
    expect(Number(orgRow?.objectCount)).toBe(2);
    expect(orgRow?.source).toBe("ledger");

    const unattributed = rows.find((row) => row.organizationId === null);
    expect(Number(unattributed?.logicalBytes)).toBe(50_000);
  });

  it("is idempotent within the hour: re-run upserts the same rows", async () => {
    await runHourlySnapshot(at);
    await runHourlySnapshot(new Date("2026-07-18T11:59:59.000Z"));

    const rows = await db.select().from(storageHourlySnapshots);
    expect(rows).toHaveLength(2);

    const runs = await db.select().from(meteringRuns).where(eq(meteringRuns.status, "completed"));
    expect(runs).toHaveLength(2);
    expect(runs.every((run) => run.jobKind === "hourly_snapshot")).toBe(true);
  });
});
