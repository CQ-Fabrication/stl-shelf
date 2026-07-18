import { and, countDistinct, eq, gte, lt, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { egressDailyRollups, storageHourlySnapshots } from "@/lib/db/schema/metering";
import { getCostConfigAt, type MeteringCostConfig } from "@/server/services/billing/metering-costs";

/**
 * Monthly usage + estimated Hetzner cost report (spec Fase 5).
 *
 * COST model only — no revenue, margins or taxes, ever. The provider invoice
 * is per ACCOUNT: the base fee and the included quotas are shared across ALL
 * buckets/projects on the account, while this system observes the stl-shelf
 * bucket only. Every figure here is therefore bucket-scoped; account-level
 * overage risk is UNDER-stated by construction and the report says so.
 * Per-organization figures are analytical allocations of a shared bill —
 * never a measurement, and never a "cost per user".
 */

/** Hetzner prices storage/traffic in decimal terabytes. */
const TB = 1e12;

export const hoursInMonth = (month: string): number => {
  const { start, end } = monthBounds(month);
  return (end.getTime() - start.getTime()) / 3_600_000;
};

export const monthBounds = (month: string): { start: Date; end: Date } => {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error(`Invalid month "${month}" (expected YYYY-MM)`);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month "${month}" (expected YYYY-MM)`);
  }
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
};

export type MonthlyUsage = {
  /** Billable storage TB-hours over the month (64 KB floor applied). */
  storageTbh: number;
  /** Presigned direct OS→browser TB — ISSUANCE-based ESTIMATE, unverifiable. */
  directEgressTbEstimate: number;
  /** app→browser TB actually served (measured on the wire). */
  proxyEgressTb: number;
  /** OS→app TB (free same-zone traffic, informational). */
  internalTb: number;
};

export type MonthlyCosts = {
  baseFeeEur: number;
  includedStorageTbh: number;
  storageOverageTbh: number;
  storageOverageCostEur: number;
  includedObjectEgressTb: number;
  objectEgressOverageTbEstimate: number;
  objectEgressOverageCostEurEstimate: number;
  serverIncludedEgressTb: number;
  serverOverageTb: number;
  serverOverageCostEur: number;
  totalEstimatedCostEur: number;
};

/**
 * The spec's Fase 5 formula, pure and testable:
 *   H = hours in the month (28/29/30/31-day correct)
 *   storage_included_tbh   = H × includedStorageTbHourPerHour
 *   object_egress_included = H × includedEgressTbPerHour
 *   overage                = max(0, used − included)
 *   cost = min(baseHourly×H, cap) + storage_overage×rate + egress_overage×rate
 *   server: overage = max(0, egress − includedPerMonth); cost = overage×rate
 *
 * Direct (estimate) and proxy (measured) egress are DIFFERENT meters on
 * different segments and are never summed into one number.
 */
export function computeMonthlyCosts(
  usage: MonthlyUsage,
  config: MeteringCostConfig,
  hours: number,
): MonthlyCosts {
  const { objectStorage, server } = config;

  const baseFeeEur = Math.min(hours * objectStorage.baseHourly, objectStorage.monthlyCap);
  const includedStorageTbh = hours * objectStorage.includedStorageTbHourPerHour;
  const includedObjectEgressTb = hours * objectStorage.includedEgressTbPerHour;

  const storageOverageTbh = Math.max(0, usage.storageTbh - includedStorageTbh);
  const storageOverageCostEur = storageOverageTbh * objectStorage.extraStoragePerTbHour;

  const objectEgressOverageTbEstimate = Math.max(
    0,
    usage.directEgressTbEstimate - includedObjectEgressTb,
  );
  const objectEgressOverageCostEurEstimate =
    objectEgressOverageTbEstimate * objectStorage.extraEgressPerTb;

  const serverOverageTb = Math.max(0, usage.proxyEgressTb - server.includedEgressTbPerMonth);
  const serverOverageCostEur = serverOverageTb * server.extraEgressPerTb;

  return {
    baseFeeEur,
    includedStorageTbh,
    storageOverageTbh,
    storageOverageCostEur,
    includedObjectEgressTb,
    objectEgressOverageTbEstimate,
    objectEgressOverageCostEurEstimate,
    serverIncludedEgressTb: server.includedEgressTbPerMonth,
    serverOverageTb,
    serverOverageCostEur,
    totalEstimatedCostEur:
      baseFeeEur +
      storageOverageCostEur +
      objectEgressOverageCostEurEstimate +
      serverOverageCostEur,
  };
}

export type OrgAttributionRow = {
  organizationId: string | null;
  storageTbh: number;
  egressByPath: {
    objectStorageDirectTbEstimate: number;
    applicationProxyTb: number;
    internalStorageToApplicationTb: number;
  };
  shareOfStorageTbhPct: number;
  shareOfProxyEgressPct: number;
  /**
   * The org's overage-driven cost delta ONLY: total estimated cost minus the
   * cost recomputed without this org's usage. Excludes the (shared, fixed)
   * base fee by construction.
   */
  marginalCostEur: number;
  /** Analytical allocation, not a measurement (see `attribution.note`). */
  proRataAllocationEur: number;
};

export type MonthlyReport = {
  month: string;
  hoursInMonth: number;
  snapshotCoverage: {
    hoursSampled: number;
    hoursInMonth: number;
    /** 0..1 — storage TB-hours are scaled from sampled hours when < 1. */
    ratio: number;
  };
  pricing: { effectiveFrom: string; currency: string; vat: string };
  usage: MonthlyUsage;
  costs: MonthlyCosts;
  /** Free traffic, informational only. */
  freeTraffic: {
    internalStorageToApplicationTb: number;
    /** Uploads are not yet metered; ingress is free either way. */
    ingressTb: number;
  };
  attribution: {
    note: string;
    rows: OrgAttributionRow[];
    unattributed: OrgAttributionRow;
  };
  accountCaveats: string[];
};

const ATTRIBUTION_NOTE =
  "Per-organization figures are an ANALYTICAL ALLOCATION of an account-level bill, not a measurement. Never present them as a cost per user.";

type OrgUsage = {
  storageTbh: number;
  directTb: number;
  proxyTb: number;
  internalTb: number;
};

const emptyOrgUsage = (): OrgUsage => ({ storageTbh: 0, directTb: 0, proxyTb: 0, internalTb: 0 });

export async function buildMonthlyReport(month: string): Promise<MonthlyReport> {
  const { start, end } = monthBounds(month);
  const hours = hoursInMonth(month);
  // Resolve prices at the LAST instant of the month: the entry in force at
  // month end prices the whole month (documented limitation: a mid-month list
  // change is not split pro-rata — matches how the provider re-priced 06/2026).
  const config = getCostConfigAt(new Date(end.getTime() - 1));

  const snapshotWhere = and(
    eq(storageHourlySnapshots.source, "ledger"),
    gte(storageHourlySnapshots.snapshotHour, start),
    lt(storageHourlySnapshots.snapshotHour, end),
  );

  const [coverage] = await db
    .select({ hoursSampled: countDistinct(storageHourlySnapshots.snapshotHour) })
    .from(storageHourlySnapshots)
    .where(snapshotWhere);
  const hoursSampled = Number(coverage?.hoursSampled ?? 0);

  const snapshotAgg = await db
    .select({
      organizationId: storageHourlySnapshots.organizationId,
      billableSum: sum(storageHourlySnapshots.billableBytes),
    })
    .from(storageHourlySnapshots)
    .where(snapshotWhere)
    .groupBy(storageHourlySnapshots.organizationId);

  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const egressAgg = await db
    .select({
      organizationId: egressDailyRollups.organizationId,
      deliveryPath: egressDailyRollups.deliveryPath,
      bytesServed: sum(egressDailyRollups.bytesServed),
      bytesRequested: sum(egressDailyRollups.bytesRequested),
    })
    .from(egressDailyRollups)
    .where(
      and(gte(egressDailyRollups.usageDate, startDate), lt(egressDailyRollups.usageDate, endDate)),
    )
    .groupBy(egressDailyRollups.organizationId, egressDailyRollups.deliveryPath);

  // Assemble per-org usage. Gap handling: scale the average of sampled hours
  // across the month's full hour count; the coverage ratio is REPORTED, never
  // silently absorbed.
  const orgUsage = new Map<string | null, OrgUsage>();
  const usageFor = (organizationId: string | null): OrgUsage => {
    const existing = orgUsage.get(organizationId);
    if (existing) {
      return existing;
    }
    const created = emptyOrgUsage();
    orgUsage.set(organizationId, created);
    return created;
  };

  for (const row of snapshotAgg) {
    const billableByteHours = Number(row.billableSum ?? 0);
    usageFor(row.organizationId).storageTbh =
      hoursSampled > 0 ? ((billableByteHours / hoursSampled) * hours) / TB : 0;
  }

  for (const row of egressAgg) {
    const usage = usageFor(row.organizationId);
    const served = Number(row.bytesServed ?? 0) / TB;
    if (row.deliveryPath === "object_storage_direct") {
      // Issuance-based estimate: bytesRequested, since served is unknowable.
      usage.directTb += Number(row.bytesRequested ?? 0) / TB;
    } else if (row.deliveryPath === "application_proxy") {
      usage.proxyTb += served;
    } else if (row.deliveryPath === "internal_storage_to_application") {
      usage.internalTb += served;
    }
  }

  const totals = [...orgUsage.values()].reduce(
    (acc, usage) => ({
      storageTbh: acc.storageTbh + usage.storageTbh,
      directTb: acc.directTb + usage.directTb,
      proxyTb: acc.proxyTb + usage.proxyTb,
      internalTb: acc.internalTb + usage.internalTb,
    }),
    { storageTbh: 0, directTb: 0, proxyTb: 0, internalTb: 0 },
  );

  const totalUsage: MonthlyUsage = {
    storageTbh: totals.storageTbh,
    directEgressTbEstimate: totals.directTb,
    proxyEgressTb: totals.proxyTb,
    internalTb: totals.internalTb,
  };
  const costs = computeMonthlyCosts(totalUsage, config, hours);

  const buildRow = (organizationId: string | null, usage: OrgUsage): OrgAttributionRow => {
    const without: MonthlyUsage = {
      storageTbh: totals.storageTbh - usage.storageTbh,
      directEgressTbEstimate: totals.directTb - usage.directTb,
      proxyEgressTb: totals.proxyTb - usage.proxyTb,
      internalTb: totals.internalTb - usage.internalTb,
    };
    const costsWithout = computeMonthlyCosts(without, config, hours);
    // Overage-driven delta only — the base fee cancels out (fixed either way).
    const marginalCostEur = costs.totalEstimatedCostEur - costsWithout.totalEstimatedCostEur;

    const storageShare = totals.storageTbh > 0 ? usage.storageTbh / totals.storageTbh : 0;
    const directShare = totals.directTb > 0 ? usage.directTb / totals.directTb : 0;
    const proxyShare = totals.proxyTb > 0 ? usage.proxyTb / totals.proxyTb : 0;

    // Component-wise pro-rata: storage-driven components by storage share,
    // egress components by the matching egress share.
    const proRataAllocationEur =
      (costs.baseFeeEur + costs.storageOverageCostEur) * storageShare +
      costs.objectEgressOverageCostEurEstimate * directShare +
      costs.serverOverageCostEur * proxyShare;

    return {
      organizationId,
      storageTbh: usage.storageTbh,
      egressByPath: {
        objectStorageDirectTbEstimate: usage.directTb,
        applicationProxyTb: usage.proxyTb,
        internalStorageToApplicationTb: usage.internalTb,
      },
      shareOfStorageTbhPct: storageShare * 100,
      shareOfProxyEgressPct: proxyShare * 100,
      marginalCostEur,
      proRataAllocationEur,
    };
  };

  const rows = [...orgUsage.entries()]
    .filter(([organizationId]) => organizationId !== null)
    .map(([organizationId, usage]) => buildRow(organizationId, usage))
    .sort((a, b) => b.storageTbh - a.storageTbh);
  const unattributed = buildRow(null, orgUsage.get(null) ?? emptyOrgUsage());

  return {
    month,
    hoursInMonth: hours,
    snapshotCoverage: {
      hoursSampled,
      hoursInMonth: hours,
      ratio: hours > 0 ? hoursSampled / hours : 0,
    },
    pricing: {
      effectiveFrom: config.effectiveFrom,
      currency: config.currency,
      vat: config.vat,
    },
    usage: totalUsage,
    costs,
    freeTraffic: {
      internalStorageToApplicationTb: totals.internalTb,
      ingressTb: 0,
    },
    attribution: {
      note: ATTRIBUTION_NOTE,
      rows,
      unattributed,
    },
    accountCaveats: [
      "Base fee and included quotas (1 TB-h/h storage, 0.0015 TB/h egress) are ACCOUNT-level and shared with other projects' buckets outside this system's scope; this report covers the stl-shelf bucket only and therefore UNDER-states account-level overage risk.",
      "object_storage_direct egress is an issuance-time ESTIMATE (the provider exposes no per-bucket access logs) — never treat it as measured, and never sum it with proxy egress.",
      `Snapshot coverage: ${hoursSampled}/${hours} hours sampled — storage TB-hours are scaled from sampled hours.`,
      "Uploads (ingress) are not yet metered; provider ingress is free.",
    ],
  };
}
