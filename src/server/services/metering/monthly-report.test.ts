// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { getCostConfigAt } from "@/server/services/billing/metering-costs";
import {
  buildMonthlyReport,
  computeMonthlyCosts,
  hoursInMonth,
  type MonthlyUsage,
} from "./monthly-report";

const ORG = "org_report";
const TB = 1e12;

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
      "created_at" timestamptz not null default now(),
      constraint "storage_hourly_snapshots_dedup_idx"
        unique nulls not distinct ("organization_id","snapshot_hour","source")
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

const snapshot = (organizationId: string | null, hourIso: string, billableBytes: number) =>
  db.execute(sql`
    insert into "storage_hourly_snapshots"
      ("organization_id", "snapshot_hour", "logical_bytes", "billable_bytes", "object_count", "source")
    values (${organizationId}, ${hourIso}, ${billableBytes}, ${billableBytes}, 1, 'ledger')
  `);

const rollup = (
  organizationId: string | null,
  usageDate: string,
  deliveryPath: string,
  bytesServed: number,
  bytesRequested: number,
) =>
  db.execute(sql`
    insert into "egress_daily_rollups"
      ("organization_id", "usage_date", "delivery_kind", "delivery_path", "bytes_served", "bytes_requested")
    values (${organizationId}, ${usageDate}, 'file_download', ${deliveryPath}, ${bytesServed}, ${bytesRequested})
  `);

beforeEach(async () => {
  await db.execute(sql`drop table if exists "storage_hourly_snapshots" cascade`);
  await db.execute(sql`drop table if exists "egress_daily_rollups" cascade`);
  await createSchema();
});

describe("hoursInMonth", () => {
  it("is correct for 28/29/30/31-day months", () => {
    expect(hoursInMonth("2026-02")).toBe(28 * 24); // 672
    expect(hoursInMonth("2024-02")).toBe(29 * 24); // 696 (leap)
    expect(hoursInMonth("2026-04")).toBe(30 * 24); // 720
    expect(hoursInMonth("2026-07")).toBe(31 * 24); // 744
  });
});

describe("computeMonthlyCosts", () => {
  const usage = (partial: Partial<MonthlyUsage>): MonthlyUsage => ({
    storageTbh: 0,
    directEgressTbEstimate: 0,
    proxyEgressTb: 0,
    internalTb: 0,
    ...partial,
  });

  it("applies the included-quota math: H TB-h storage, H*0.0015 TB egress", () => {
    const config = getCostConfigAt(new Date("2026-07-01T00:00:00Z"));
    const costs = computeMonthlyCosts(usage({}), config, 744);

    expect(costs.includedStorageTbh).toBe(744);
    expect(costs.includedObjectEgressTb).toBeCloseTo(1.116, 10);
    expect(costs.baseFeeEur).toBeCloseTo(6.49, 10); // 744*0.0104=7.7376 capped
    expect(costs.totalEstimatedCostEur).toBeCloseTo(6.49, 10);
  });

  it("bills only the overage above the included quotas", () => {
    const config = getCostConfigAt(new Date("2026-07-01T00:00:00Z"));
    const costs = computeMonthlyCosts(
      usage({ storageTbh: 1488, directEgressTbEstimate: 2, proxyEgressTb: 21 }),
      config,
      744,
    );

    expect(costs.storageOverageTbh).toBe(744);
    expect(costs.storageOverageCostEur).toBeCloseTo(744 * 0.0087, 10);
    expect(costs.objectEgressOverageTbEstimate).toBeCloseTo(0.884, 10);
    expect(costs.objectEgressOverageCostEurEstimate).toBeCloseTo(0.884, 10);
    expect(costs.serverOverageTb).toBeCloseTo(1, 10);
    expect(costs.serverOverageCostEur).toBeCloseTo(1, 10);
  });

  it("never sums direct-estimate and proxy bytes into one overage", () => {
    const config = getCostConfigAt(new Date("2026-07-01T00:00:00Z"));
    // Combined they would exceed the 20 TB server quota; separately they don't.
    const costs = computeMonthlyCosts(
      usage({ directEgressTbEstimate: 0.6, proxyEgressTb: 19.6 }),
      config,
      744,
    );

    expect(costs.serverOverageTb).toBe(0); // 19.6 < 20 — direct NOT added
    expect(costs.objectEgressOverageTbEstimate).toBe(0); // 0.6 < 1.116 — proxy NOT added
  });
});

describe("buildMonthlyReport", () => {
  it("uses the pricing era in force for the reported month", async () => {
    const may = await buildMonthlyReport("2026-05");
    const july = await buildMonthlyReport("2026-07");

    expect(may.pricing.effectiveFrom).toBe("1970-01-01"); // legacy rates
    expect(july.pricing.effectiveFrom).toBe("2026-06-15"); // current rates
  });

  it("scales storage from sampled hours and reports the coverage honestly", async () => {
    // Only 2 of 744 hours sampled, 2 TB billable in each.
    await snapshot(ORG, "2026-07-10T10:00:00Z", 2 * TB);
    await snapshot(ORG, "2026-07-10T11:00:00Z", 2 * TB);

    const report = await buildMonthlyReport("2026-07");

    expect(report.snapshotCoverage).toMatchObject({ hoursSampled: 2, hoursInMonth: 744 });
    expect(report.snapshotCoverage.ratio).toBeCloseTo(2 / 744, 10);
    // avg 2 TB/hour scaled to the full month = 1488 TB-h
    expect(report.usage.storageTbh).toBeCloseTo(1488, 6);
    expect(report.accountCaveats.some((caveat) => caveat.includes("2/744 hours sampled"))).toBe(
      true,
    );
  });

  it("keeps egress paths separate and labels attribution as analytical", async () => {
    await snapshot(ORG, "2026-07-10T10:00:00Z", 2 * TB);
    await snapshot(null, "2026-07-10T10:00:00Z", 0.5 * TB);
    await rollup(ORG, "2026-07-10", "application_proxy", 1 * TB, 1 * TB);
    await rollup(ORG, "2026-07-10", "internal_storage_to_application", 1.2 * TB, 1.2 * TB);
    await rollup(ORG, "2026-07-10", "object_storage_direct", 0, 0.5 * TB);

    const report = await buildMonthlyReport("2026-07");

    // Distinct meters, never combined.
    expect(report.usage.proxyEgressTb).toBeCloseTo(1, 10);
    expect(report.usage.directEgressTbEstimate).toBeCloseTo(0.5, 10); // bytesRequested
    expect(report.usage.internalTb).toBeCloseTo(1.2, 10);
    expect(report.freeTraffic.internalStorageToApplicationTb).toBeCloseTo(1.2, 10);

    // Attribution: labeled, includes unattributed, no "cost per user" naming.
    // The phrase only appears inside the warning note itself — never as a field.
    expect(report.attribution.note).toContain("not a measurement");
    expect(report.attribution.note).toContain("Never present them as a cost per user");
    expect(report.attribution.rows).toHaveLength(1);
    expect(report.attribution.unattributed.organizationId).toBeNull();
    expect(report.attribution.unattributed.storageTbh).toBeGreaterThan(0);
    const fieldNames = JSON.stringify(report).match(/"[^"]+":/g) ?? [];
    expect(fieldNames.every((name) => !/cost.?per.?user/i.test(name))).toBe(true);

    // Marginal cost is overage-driven only (base fee cancels out): with the
    // org removed, storage drops below the included quota → marginal equals
    // the full storage overage; pro-rata additionally carries the base fee.
    const [orgRow] = report.attribution.rows;
    expect(orgRow).toBeDefined();
    expect(orgRow?.marginalCostEur).toBeCloseTo(report.costs.storageOverageCostEur, 6);
    expect(orgRow?.proRataAllocationEur).toBeGreaterThan(orgRow?.marginalCostEur ?? 0);
  });
});
