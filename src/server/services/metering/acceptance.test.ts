// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The spec's formal acceptance scenario: an organization stores 2 TB for all
 * 744 hours of a 31-day month, uploads 2 TB and downloads 2 TB. The spec's
 * published figures assume the LEGACY price era; the same scenario is also
 * asserted under the CURRENT era to document that those figures were
 * era-bound. Prod data is far smaller — this test is intentionally synthetic.
 */

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { getCostConfigAt } from "@/server/services/billing/metering-costs";
import { buildMonthlyReport, computeMonthlyCosts } from "./monthly-report";

const ORG = "org_acceptance";
const TB = 1e12;
// May 2026: 31 days = 744 hours, before the 2026-06-15 price change → legacy era.
const LEGACY_MONTH = "2026-05";

async function createSchema(): Promise<void> {
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

/** 2 TB stored for every hour of May 2026 (full snapshot coverage). */
const seedFullMonthStorage = () =>
  db.execute(sql`
    insert into "storage_hourly_snapshots"
      ("organization_id", "snapshot_hour", "logical_bytes", "billable_bytes", "object_count", "source")
    select ${ORG}, ts, 2000000000000, 2000000000000, 1, 'ledger'
    from generate_series(
      '2026-05-01T00:00:00Z'::timestamptz,
      '2026-05-31T23:00:00Z'::timestamptz,
      interval '1 hour'
    ) as ts
  `);

const seedRollup = (
  deliveryPath: string,
  bytesServed: number,
  bytesRequested: number,
  day = "2026-05-10",
) =>
  db.execute(sql`
    insert into "egress_daily_rollups"
      ("organization_id", "usage_date", "delivery_kind", "delivery_path", "bytes_served", "bytes_requested")
    values (${ORG}, ${day}, 'file_download', ${deliveryPath}, ${bytesServed}, ${bytesRequested})
  `);

beforeEach(async () => {
  await db.execute(sql`drop table if exists "storage_hourly_snapshots" cascade`);
  await db.execute(sql`drop table if exists "egress_daily_rollups" cascade`);
  await createSchema();
});

describe("acceptance: direct variant (2 TB stored 744h, 2 TB up, 2 TB down via presigned)", () => {
  beforeEach(async () => {
    await seedFullMonthStorage();
    // 2 TB downloaded via presigned direct URLs (issuance-estimated).
    await seedRollup("object_storage_direct", 0, 2 * TB);
    // Uploads (2 TB ingress) are free and not metered as egress.
  });

  it("matches the spec's exact figures under the legacy price era", async () => {
    const report = await buildMonthlyReport(LEGACY_MONTH);

    expect(report.hoursInMonth).toBe(744);
    expect(report.snapshotCoverage.ratio).toBeCloseTo(1, 10);
    expect(report.pricing.effectiveFrom).toBe("1970-01-01"); // legacy era

    // Storage: 2 TB × 744 h = 1488 TB-h; 744 included; 744 over → €4.9848.
    expect(report.usage.storageTbh).toBeCloseTo(1488, 6);
    expect(report.costs.includedStorageTbh).toBe(744);
    expect(report.costs.storageOverageTbh).toBeCloseTo(744, 6);
    expect(report.costs.storageOverageCostEur).toBeCloseTo(4.9848, 4);

    // Ingress: 2 TB uploaded → €0 (free; no ingress cost exists in the model).
    expect(report.freeTraffic.ingressTb).toBe(0);

    // Object egress: 1.116 TB included, 0.884 TB over → €0.884 (estimate).
    expect(report.costs.includedObjectEgressTb).toBeCloseTo(1.116, 6);
    expect(report.costs.objectEgressOverageTbEstimate).toBeCloseTo(0.884, 6);
    expect(report.costs.objectEgressOverageCostEurEstimate).toBeCloseTo(0.884, 4);

    // Base fee €4.99 → object-storage total €10.8588 net.
    expect(report.costs.baseFeeEur).toBeCloseTo(4.99, 10);
    expect(report.costs.serverOverageCostEur).toBe(0);
    expect(report.costs.totalEstimatedCostEur).toBeCloseTo(10.8588, 4);
  });

  it("recomputes under the current era — the spec's figures were era-bound", async () => {
    const currentConfig = getCostConfigAt(new Date("2026-07-01T00:00:00Z"));
    const costs = computeMonthlyCosts(
      { storageTbh: 1488, directEgressTbEstimate: 2, proxyEgressTb: 0, internalTb: 0 },
      currentConfig,
      744,
    );

    expect(costs.baseFeeEur).toBeCloseTo(6.49, 10);
    expect(costs.storageOverageCostEur).toBeCloseTo(744 * 0.0087, 6); // €6.4728
    expect(costs.objectEgressOverageCostEurEstimate).toBeCloseTo(0.884, 6);
    expect(costs.totalEstimatedCostEur).toBeCloseTo(13.8468, 4);
  });
});

describe("acceptance: proxy variant (same 2 TB via app server, same network zone)", () => {
  beforeEach(async () => {
    await seedFullMonthStorage();
    // 2 TB leaves via the app server; the OS→app hop is free internal traffic.
    await seedRollup("application_proxy", 2 * TB, 2 * TB);
    await seedRollup("internal_storage_to_application", 2 * TB, 2 * TB);
  });

  it("moves the egress to the server quota: zero OS egress, zero server overage", async () => {
    const report = await buildMonthlyReport(LEGACY_MONTH);

    // No direct OS egress at all on this path.
    expect(report.usage.directEgressTbEstimate).toBe(0);
    expect(report.costs.objectEgressOverageCostEurEstimate).toBe(0);

    // Internal OS→app traffic is free and informational.
    expect(report.freeTraffic.internalStorageToApplicationTb).toBeCloseTo(2, 6);

    // Server egress 2 TB vs 20 TB included → €0 overage.
    expect(report.usage.proxyEgressTb).toBeCloseTo(2, 6);
    expect(report.costs.serverIncludedEgressTb).toBe(20);
    expect(report.costs.serverOverageCostEur).toBe(0);

    // Account total = base fee + storage overage only.
    expect(report.costs.totalEstimatedCostEur).toBeCloseTo(4.99 + 4.9848, 4);
  });

  it("never assigns the base fee or the whole included quota to the org", async () => {
    const report = await buildMonthlyReport(LEGACY_MONTH);
    const [orgRow] = report.attribution.rows;
    expect(orgRow).toBeDefined();

    // Marginal = the org's overage-driven delta ONLY (here: storage overage).
    expect(orgRow?.marginalCostEur).toBeCloseTo(4.9848, 4);
    // The base fee stays an account-level figure, shown separately.
    expect(orgRow?.marginalCostEur).toBeLessThan(report.costs.totalEstimatedCostEur);
    expect(report.costs.baseFeeEur).toBeCloseTo(4.99, 10);
    expect(report.attribution.note).toContain("not a measurement");
  });

  it("keeps totals monotonic as more previews/downloads are served", async () => {
    const before = await buildMonthlyReport(LEGACY_MONTH);

    // A second day of activity: every subsequent open/preview/download adds.
    await seedRollup("application_proxy", 0.5 * TB, 0.5 * TB, "2026-05-11");
    await seedRollup("internal_storage_to_application", 0.5 * TB, 0.5 * TB, "2026-05-11");

    const after = await buildMonthlyReport(LEGACY_MONTH);
    expect(after.usage.proxyEgressTb).toBeCloseTo(2.5, 6);
    expect(after.usage.proxyEgressTb).toBeGreaterThan(before.usage.proxyEgressTb);
    expect(after.freeTraffic.internalStorageToApplicationTb).toBeGreaterThan(
      before.freeTraffic.internalStorageToApplicationTb,
    );
  });

  it("exposes no revenue, margin or profit fields anywhere in the report", async () => {
    const report = await buildMonthlyReport(LEGACY_MONTH);
    const fieldNames = JSON.stringify(report).match(/"[^"]+":/g) ?? [];

    expect(fieldNames.length).toBeGreaterThan(0);
    // \bmargin\b: "marginalCostEur" (the spec's marginal COST) is allowed;
    // commercial margin/revenue/profit/plan-price fields are not.
    expect(fieldNames.every((name) => !/revenue|profit|planPrice|\bmargin\b/i.test(name))).toBe(
      true,
    );
  });
});
