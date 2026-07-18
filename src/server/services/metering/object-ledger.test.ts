// @vitest-environment node
import { and, eq, isNull, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the metering modules' `db` with in-memory Postgres (PGlite) so the real
// upsert / ON CONFLICT / soft-delete SQL is exercised — the correctness lives in
// SQL semantics (dedup constraints, atomic increments), not JS logic.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { egressDailyRollups, storageObjects } from "@/lib/db/schema/metering";
import { getOrgStorageBytes } from "@/server/services/billing/storage-usage";
import { recordObjectDeletion, recordObjectUpsert } from "./object-ledger";

const ORG = "org_ledger";
const MODEL = "00000000-0000-4000-8000-00000000000a";
const sourceKey = `${ORG}/${MODEL}/v1/sources/part.stl`;
const artifactKey = `${ORG}/${MODEL}/v1/artifacts/preview.png`;

async function createSchema(): Promise<void> {
  await db.execute(sql`
    create table if not exists "storage_objects" (
      "id" uuid primary key default gen_random_uuid(),
      "storage_key" text not null,
      "organization_id" text,
      "object_kind" text not null,
      "size_bytes" bigint not null,
      "billable_bytes" bigint not null,
      "model_id" uuid,
      "version_id" uuid,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz,
      constraint "storage_objects_storage_key_idx" unique ("storage_key")
    )
  `);
  await db.execute(sql`
    create table if not exists "egress_daily_rollups" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text,
      "usage_date" date not null,
      "delivery_kind" text not null,
      "delivery_path" text not null,
      "requests_started" bigint not null default 0,
      "requests_completed" bigint not null default 0,
      "requests_aborted" bigint not null default 0,
      "requests_failed" bigint not null default 0,
      "bytes_requested" bigint not null default 0,
      "bytes_served" bigint not null default 0,
      "bytes_aborted" bigint not null default 0,
      "range_requests" bigint not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "egress_daily_rollups_dedup_idx"
        unique nulls not distinct
        ("organization_id","usage_date","delivery_kind","delivery_path")
    )
  `);
}

async function countRows(storageKey: string): Promise<number> {
  const rows = await db
    .select({ id: storageObjects.id })
    .from(storageObjects)
    .where(eq(storageObjects.storageKey, storageKey));
  return rows.length;
}

beforeEach(async () => {
  await db.execute(sql`drop table if exists "storage_objects"`);
  await db.execute(sql`drop table if exists "egress_daily_rollups"`);
  await createSchema();
});

describe("recordObjectUpsert", () => {
  it("is idempotent: re-putting the same key updates, never duplicates", async () => {
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 100_000 });
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 250_000 });

    expect(await countRows(sourceKey)).toBe(1);
    const [row] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, sourceKey));
    expect(Number(row?.sizeBytes)).toBe(250_000);
    expect(row?.organizationId).toBe(ORG);
    expect(row?.objectKind).toBe("source");
    expect(row?.modelId).toBe(MODEL);
  });

  it("applies the 64 KB billable floor for a small object", async () => {
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 1_000 });
    const [row] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, sourceKey));
    expect(Number(row?.sizeBytes)).toBe(1_000);
    expect(Number(row?.billableBytes)).toBe(65_536);
  });

  it("stores temp / garbage keys as unattributed", async () => {
    await recordObjectUpsert({ storageKey: "temp/123-upload.stl", sizeBytes: 100_000 });
    await recordObjectUpsert({ storageKey: "garbage-key", sizeBytes: 100_000 });

    const [temp] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, "temp/123-upload.stl"));
    const [garbage] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, "garbage-key"));

    expect(temp?.organizationId).toBeNull();
    expect(temp?.objectKind).toBe("temp");
    expect(garbage?.organizationId).toBeNull();
    expect(garbage?.objectKind).toBe("unknown");
  });

  it("re-putting a deleted key clears deleted_at (object exists again)", async () => {
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 100_000 });
    await recordObjectDeletion([sourceKey]);
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 100_000 });

    const [row] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, sourceKey));
    expect(row?.deletedAt).toBeNull();
  });
});

describe("recordObjectDeletion", () => {
  it("marks deleted_at and preserves the first deletion timestamp", async () => {
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 100_000 });
    await recordObjectDeletion([sourceKey]);

    const [afterFirst] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, sourceKey));
    expect(afterFirst?.deletedAt).toBeInstanceOf(Date);
    const firstDeletedAt = afterFirst?.deletedAt;

    // Re-deleting must not move the original deletion timestamp.
    await recordObjectDeletion([sourceKey]);
    const [afterSecond] = await db
      .select()
      .from(storageObjects)
      .where(eq(storageObjects.storageKey, sourceKey));
    expect(afterSecond?.deletedAt).toEqual(firstDeletedAt);
  });

  it("is a no-op for unknown keys and empty input", async () => {
    await expect(recordObjectDeletion([])).resolves.toBeUndefined();
    await expect(recordObjectDeletion(["never-seen"])).resolves.toBeUndefined();
  });
});

describe("getOrgStorageBytes", () => {
  it("includes artifacts (which model_files misses) and excludes deleted rows", async () => {
    await recordObjectUpsert({ storageKey: sourceKey, sizeBytes: 100_000 });
    await recordObjectUpsert({ storageKey: artifactKey, sizeBytes: 30_000 });

    // source + artifact both counted
    expect(await getOrgStorageBytes(ORG)).toBe(130_000);

    // deleting the artifact removes it from the live total
    await recordObjectDeletion([artifactKey]);
    expect(await getOrgStorageBytes(ORG)).toBe(100_000);
  });

  it("returns 0 for an org with no ledger rows", async () => {
    expect(await getOrgStorageBytes("org_empty")).toBe(0);
  });
});

describe("egress_daily_rollups atomic increment upsert", () => {
  const upsert = (started: number, served: number) =>
    db
      .insert(egressDailyRollups)
      .values({
        organizationId: ORG,
        usageDate: "2026-07-18",
        deliveryKind: "file_download",
        deliveryPath: "application_proxy",
        requestsStarted: started,
        requestsCompleted: started,
        bytesServed: served,
      })
      .onConflictDoUpdate({
        target: [
          egressDailyRollups.organizationId,
          egressDailyRollups.usageDate,
          egressDailyRollups.deliveryKind,
          egressDailyRollups.deliveryPath,
        ],
        set: {
          requestsStarted: sql`${egressDailyRollups.requestsStarted} + excluded.requests_started`,
          requestsCompleted: sql`${egressDailyRollups.requestsCompleted} + excluded.requests_completed`,
          bytesServed: sql`${egressDailyRollups.bytesServed} + excluded.bytes_served`,
        },
      });

  it("sums two increments on the same key into one row", async () => {
    await upsert(1, 100);
    await upsert(1, 250);

    const rows = await db.select().from(egressDailyRollups);
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.requestsStarted)).toBe(2);
    expect(Number(rows[0]?.requestsCompleted)).toBe(2);
    expect(Number(rows[0]?.bytesServed)).toBe(350);
  });

  it("dedups null-org rows via NULLS NOT DISTINCT", async () => {
    const nullOrgUpsert = () =>
      db
        .insert(egressDailyRollups)
        .values({
          organizationId: null,
          usageDate: "2026-07-18",
          deliveryKind: "thumbnail",
          deliveryPath: "unattributed",
          bytesServed: 500,
        })
        .onConflictDoUpdate({
          target: [
            egressDailyRollups.organizationId,
            egressDailyRollups.usageDate,
            egressDailyRollups.deliveryKind,
            egressDailyRollups.deliveryPath,
          ],
          set: { bytesServed: sql`${egressDailyRollups.bytesServed} + excluded.bytes_served` },
        });

    await nullOrgUpsert();
    await nullOrgUpsert();

    const rows = await db
      .select()
      .from(egressDailyRollups)
      .where(
        and(
          isNull(egressDailyRollups.organizationId),
          eq(egressDailyRollups.deliveryKind, "thumbnail"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.bytesServed)).toBe(1_000);
  });
});
