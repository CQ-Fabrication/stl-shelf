// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logErrorEventMock } = vi.hoisted(() => ({ logErrorEventMock: vi.fn() }));

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

vi.mock("@/lib/logging", () => ({ logErrorEvent: logErrorEventMock }));

import { db } from "@/lib/db";
import { runMeteringAlerts } from "./alerts";

const ORG = "org_alerts";
const TB = 1e12;
// July 2026: 744h, included egress = 1.116 TB, included storage = 744 TB-h.
const MONTH_END = new Date("2026-07-31T23:59:00.000Z");
const MID_MONTH = new Date("2026-07-16T12:00:00.000Z"); // 372h elapsed

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
      "created_at" timestamptz not null default now()
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
      "updated_at" timestamptz not null default now()
    )
  `);
}

const seedStored = (organizationId: string | null, key: string, bytes: number) =>
  db.execute(sql`
    insert into "storage_objects" ("storage_key", "organization_id", "object_kind", "size_bytes", "billable_bytes")
    values (${key}, ${organizationId}, 'source', ${bytes}, ${bytes})
  `);

const seedRollup = (
  organizationId: string | null,
  usageDate: string,
  deliveryPath: string,
  bytesServed: number,
  bytesRequested: number,
) =>
  db.execute(sql`
    insert into "egress_daily_rollups"
      ("organization_id", "usage_date", "delivery_kind", "delivery_path", "bytes_served", "bytes_requested")
    values (${organizationId}, ${usageDate}, 'file_download', ${deliveryPath}, ${Math.round(bytesServed)}, ${Math.round(bytesRequested)})
  `);

beforeEach(async () => {
  vi.clearAllMocks();
  await db.execute(sql`drop table if exists "storage_objects" cascade`);
  await db.execute(sql`drop table if exists "storage_hourly_snapshots" cascade`);
  await db.execute(sql`drop table if exists "egress_daily_rollups" cascade`);
  await createSchema();
});

describe("included-quota alerts", () => {
  it("does not fire at 49% of the egress allowance, fires at 50%", async () => {
    // Enough stored bytes so the org_ratio check stays quiet.
    await seedStored(ORG, "a/big", 10 * TB);

    await seedRollup(ORG, "2026-07-10", "object_storage_direct", 0, 0.49 * 1.116 * TB);
    const below = await runMeteringAlerts({ now: MONTH_END });
    expect(below.alerts).toHaveLength(0);
    expect(logErrorEventMock).not.toHaveBeenCalled();

    await seedRollup(ORG, "2026-07-11", "object_storage_direct", 0, 0.01 * 1.116 * TB);
    const at = await runMeteringAlerts({ now: MONTH_END });
    const quota = at.alerts.find((alert) => alert.kind === "quota_egress");
    expect(quota).toBeDefined();
    expect(quota?.details.step).toBe(0.5);
    expect(logErrorEventMock).toHaveBeenCalledWith(
      "metering.alert.quota_egress",
      expect.objectContaining({ step: 0.5 }),
    );
  });

  it("distinguishes on-pace-to-exceed from already-exceeded", async () => {
    await seedStored(ORG, "a/big", 10 * TB);
    // 60% of the MONTHLY allowance consumed by mid-month → raw 0.6, pace 1.2.
    await seedRollup(ORG, "2026-07-10", "object_storage_direct", 0, 0.6 * 1.116 * TB);

    const { alerts } = await runMeteringAlerts({ now: MID_MONTH });
    const quota = alerts.find((alert) => alert.kind === "quota_egress");

    expect(quota?.details.rawRatio).toBeCloseTo(0.6, 6);
    expect(quota?.details.paceRatio).toBeCloseTo(1.2, 6);
    expect(quota?.details.alreadyExceeded).toBe(false);
    expect(quota?.details.onPaceToExceed).toBe(true);
    expect(quota?.message).toContain("on pace to exceed");
  });

  it("fires the storage quota alert from sampled TB-hours", async () => {
    // 372 sampled hours at 1 TB each → 372 TB-h = 50% raw, pace 100%.
    await db.execute(sql`
      insert into "storage_hourly_snapshots"
        ("organization_id", "snapshot_hour", "logical_bytes", "billable_bytes", "object_count", "source")
      select ${ORG}, ts, 1000000000000, 1000000000000, 1, 'ledger'
      from generate_series(
        '2026-07-01T00:00:00Z'::timestamptz,
        '2026-07-16T11:00:00Z'::timestamptz,
        interval '1 hour'
      ) as ts
    `);

    const { alerts } = await runMeteringAlerts({ now: MID_MONTH });
    const quota = alerts.find((alert) => alert.kind === "quota_storage");

    expect(quota).toBeDefined();
    expect(quota?.details.used).toBeCloseTo(372, 6);
    expect(quota?.details.rawRatio).toBeCloseTo(0.5, 6);
    expect(quota?.details.paceRatio).toBeCloseTo(1, 6);
    expect(quota?.details.onPaceToExceed).toBe(true);
  });
});

describe("org egress/storage ratio", () => {
  it("flags orgs whose monthly egress exceeds 10x their stored bytes", async () => {
    await seedStored(ORG, "a/small", 1_000);
    await seedRollup(ORG, "2026-07-10", "application_proxy", 20_000, 20_000);

    const { alerts } = await runMeteringAlerts({ now: MONTH_END });
    const ratio = alerts.find((alert) => alert.kind === "org_ratio");

    expect(ratio).toBeDefined();
    expect(ratio?.details.offenders).toEqual([
      { organizationId: ORG, egressBytes: 20_000, storedBytes: 1_000 },
    ]);
  });
});

describe("unattributed", () => {
  it("fires when unattributed bytes exceed 5% of the bucket", async () => {
    await seedStored(ORG, "a/main", 900);
    await seedStored(null, "loose-object", 100); // 10% of the bucket

    const { alerts } = await runMeteringAlerts({ now: MONTH_END });
    const unattributed = alerts.find((alert) => alert.kind === "unattributed");

    expect(unattributed).toBeDefined();
    expect(unattributed?.details.unattributedShare).toBeCloseTo(0.1, 6);
  });

  it("fires on any unattributed egress even when storage is clean", async () => {
    await seedStored(ORG, "a/main", 10 * TB);
    await seedRollup(null, "2026-07-10", "application_proxy", 500, 500);

    const { alerts } = await runMeteringAlerts({ now: MONTH_END });
    const unattributed = alerts.find((alert) => alert.kind === "unattributed");

    expect(unattributed).toBeDefined();
    expect(unattributed?.details.unattributedEgressBytes).toBe(500);
  });
});

describe("provider comparison", () => {
  beforeEach(async () => {
    // 10 sampled hours at 0.1 TB → 1 TB-h measured, no quota alerts.
    await db.execute(sql`
      insert into "storage_hourly_snapshots"
        ("organization_id", "snapshot_hour", "logical_bytes", "billable_bytes", "object_count", "source")
      select ${ORG}, ts, 100000000000, 100000000000, 1, 'ledger'
      from generate_series(
        '2026-07-01T00:00:00Z'::timestamptz,
        '2026-07-01T09:00:00Z'::timestamptz,
        interval '1 hour'
      ) as ts
    `);
  });

  it("stays quiet when provider figures are within tolerance", async () => {
    const { alerts } = await runMeteringAlerts({ now: MONTH_END, providerStorageTbh: 1.01 });
    expect(alerts.find((alert) => alert.kind === "provider_delta_storage")).toBeUndefined();
  });

  it("fires when provider figures deviate beyond tolerance", async () => {
    const { alerts } = await runMeteringAlerts({
      now: MONTH_END,
      providerStorageTbh: 1.5,
      providerEgressTb: 0.5, // measured direct egress is 0
    });

    expect(alerts.find((alert) => alert.kind === "provider_delta_storage")).toBeDefined();
    expect(alerts.find((alert) => alert.kind === "provider_delta_egress")).toBeDefined();
    expect(logErrorEventMock).toHaveBeenCalledWith(
      "metering.alert.provider_delta_storage",
      expect.objectContaining({ provider: 1.5 }),
    );
  });
});
