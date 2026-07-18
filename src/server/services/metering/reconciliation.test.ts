// @vitest-environment node
import { eq, isNull, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { bucket } = vi.hoisted(() => ({ bucket: new Map<string, number>() }));

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

vi.mock("@/server/services/storage", () => ({
  storageService: {
    listFiles: vi.fn(async () => ({
      files: [...bucket.entries()].map(([key, size]) => ({
        key,
        size,
        lastModified: new Date(),
        etag: "e",
      })),
      continuationToken: undefined,
      isTruncated: false,
    })),
  },
}));

import { db } from "@/lib/db";
import { meteringRuns, storageHourlySnapshots, storageObjects } from "@/lib/db/schema/metering";
import { runReconciliation } from "./reconciliation";

const ORG = "org_recon";
const MODEL = "00000000-0000-4000-8000-00000000000a";
const okKey = `${ORG}/${MODEL}/v1/sources/ok.stl`;
const mismatchKey = `${ORG}/${MODEL}/v1/sources/mismatch.stl`;
const orphanKey = `${ORG}/${MODEL}/v1/artifacts/orphan.png`;
const garbageKey = "loose-object.bin";
const ghostKey = `${ORG}/${MODEL}/v1/sources/ghost.stl`;

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

  bucket.clear();
  bucket.set(okKey, 100_000);
  bucket.set(mismatchKey, 250_000); // ledger says 200_000
  bucket.set(orphanKey, 70_000); // not in ledger
  bucket.set(garbageKey, 42_000); // not in ledger, unknown layout

  await db.execute(sql`
    insert into "storage_objects" ("storage_key", "organization_id", "object_kind", "size_bytes", "billable_bytes")
    values
      (${okKey}, ${ORG}, 'source', 100000, 100000),
      (${mismatchKey}, ${ORG}, 'source', 200000, 200000),
      (${ghostKey}, ${ORG}, 'source', 500000, 500000)
  `);
});

describe("runReconciliation", () => {
  it("dry-run reports the full diff matrix and writes nothing", async () => {
    const summary = await runReconciliation({ apply: false });

    expect(summary).toMatchObject({
      scannedObjects: 4,
      ledgerLiveRows: 3,
      missingInLedger: 2,
      ghostLedgerRows: 1,
      sizeMismatches: 1,
      applied: false,
    });
    // orphan 70000 + garbage 42000 + ghost 500000 + |250000-200000|
    expect(summary.driftBytes).toBe(662_000);

    expect(await db.select().from(storageObjects)).toHaveLength(3); // unchanged
    expect(await db.select().from(storageHourlySnapshots)).toHaveLength(0);
    expect(await db.select().from(meteringRuns)).toHaveLength(0);
  });

  it("apply fixes the ledger: orphan inserted, garbage unattributed, ghost soft-deleted, size updated", async () => {
    const summary = await runReconciliation({
      apply: true,
      now: new Date("2026-07-18T09:30:00.000Z"),
    });
    expect(summary.applied).toBe(true);

    const [orphan] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, orphanKey));
    expect(orphan?.organizationId).toBe(ORG);
    expect(orphan?.objectKind).toBe("artifact");
    expect(Number(orphan?.sizeBytes)).toBe(70_000);

    const [garbage] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, garbageKey));
    expect(garbage?.organizationId).toBeNull();
    expect(garbage?.objectKind).toBe("unknown");
    expect(Number(garbage?.billableBytes)).toBe(65_536);

    const [ghost] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, ghostKey));
    expect(ghost?.deletedAt).toBeInstanceOf(Date);

    const [fixed] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, mismatchKey));
    expect(Number(fixed?.sizeBytes)).toBe(250_000);

    // Reconciliation snapshot reflects the BUCKET (org + unattributed rows).
    const snapshots = await db
      .select()
      .from(storageHourlySnapshots)
      .where(eq(storageHourlySnapshots.source, "reconciliation"));
    expect(snapshots).toHaveLength(2);
    expect(snapshots.every((row) => row.reconciled)).toBe(true);
    const orgSnapshot = snapshots.find((row) => row.organizationId === ORG);
    expect(Number(orgSnapshot?.logicalBytes)).toBe(420_000); // 100k + 250k + 70k
    const unattributedSnapshot = snapshots.find((row) => row.organizationId === null);
    expect(Number(unattributedSnapshot?.logicalBytes)).toBe(42_000);

    const runs = await db.select().from(meteringRuns);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("completed");
    expect(runs[0]?.jobKind).toBe("reconciliation");

    // Converged: a second apply reports zero drift.
    const second = await runReconciliation({ apply: true });
    expect(second.missingInLedger).toBe(0);
    expect(second.ghostLedgerRows).toBe(0);
    expect(second.sizeMismatches).toBe(0);
    expect(second.driftBytes).toBe(0);

    const liveRows = await db.select().from(storageObjects).where(isNull(storageObjects.deletedAt));
    expect(liveRows).toHaveLength(4); // ok, mismatch (fixed), orphan, garbage
  });
});
