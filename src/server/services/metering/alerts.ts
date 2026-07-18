import { and, desc, eq, gte, isNotNull, isNull, lt, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  egressDailyRollups,
  storageHourlySnapshots,
  storageObjects,
} from "@/lib/db/schema/metering";
import { logErrorEvent } from "@/lib/logging";
import { getCostConfigAt } from "@/server/services/billing/metering-costs";

/**
 * Metering alerts (spec Fase 7) — INFORMATIONAL ONLY. Nothing here blocks a
 * user or touches enforcement; alerts surface via logErrorEvent
 * ("metering.alert.<kind>" → BetterStack) and stdout, and the CLI exits 1 so a
 * scheduler can notice. Month-to-date scope, current cost config.
 */

const TB = 1e12;

/** Every alert threshold lives HERE — one config object, not scattered. */
export const DEFAULT_ALERT_THRESHOLDS = {
  /** Included-quota consumption steps (of the monthly allowance). */
  quotaSteps: [0.5, 0.75, 0.9, 1] as readonly number[],
  /** Today's bucket bytes vs trailing 7-day mean. */
  dailyGrowthMultiplier: 3,
  /** Org monthly egress bytes vs its stored bytes. */
  egressToStorageRatio: 10,
  /** Unattributed live bytes as a share of the bucket. */
  unattributedShareOfBucket: 0.05,
  /** Ledger vs latest reconciliation snapshot. */
  reconciliationTolerance: 0.02,
  /** App-measured vs operator-supplied provider figures. */
  providerDeltaTolerance: 0.02,
};

export type AlertThresholds = typeof DEFAULT_ALERT_THRESHOLDS;

export type MeteringAlert = {
  kind: string;
  message: string;
  details: Record<string, unknown>;
};

export type AlertRunOptions = {
  now?: Date;
  /** Operator-read from the provider invoice/console (no usage API exists). */
  providerStorageTbh?: number;
  providerEgressTb?: number;
  thresholds?: Partial<AlertThresholds>;
};

const highestStep = (ratio: number, steps: readonly number[]): number | null => {
  let crossed: number | null = null;
  for (const step of steps) {
    if (ratio >= step) {
      crossed = step;
    }
  }
  return crossed;
};

/**
 * Raw = consumed share of the FULL monthly allowance ("already exceeded" when
 * ≥ 1). Pace = consumed share of the allowance accrued so far ("on pace to
 * exceed" when ≥ 1). Both are reported; the alert fires on whichever is worse.
 */
const quotaAlert = (
  kind: string,
  unit: string,
  used: number,
  monthlyIncluded: number,
  elapsedIncluded: number,
  steps: readonly number[],
): MeteringAlert | null => {
  const rawRatio = monthlyIncluded > 0 ? used / monthlyIncluded : 0;
  const paceRatio = elapsedIncluded > 0 ? used / elapsedIncluded : 0;
  const step = highestStep(Math.max(rawRatio, paceRatio), steps);
  if (step === null) {
    return null;
  }

  const alreadyExceeded = rawRatio >= 1;
  const onPaceToExceed = paceRatio >= 1;
  return {
    kind,
    message: `${kind}: ${used.toFixed(6)} ${unit} used — ${(rawRatio * 100).toFixed(1)}% of monthly allowance (pace ${(paceRatio * 100).toFixed(1)}%) — ${alreadyExceeded ? "ALREADY EXCEEDED" : onPaceToExceed ? "on pace to exceed" : `crossed ${step * 100}% step`}`,
    details: {
      used,
      unit,
      monthlyIncluded,
      elapsedIncluded,
      rawRatio,
      paceRatio,
      step,
      alreadyExceeded,
      onPaceToExceed,
    },
  };
};

export async function runMeteringAlerts(options: AlertRunOptions = {}): Promise<{
  alerts: MeteringAlert[];
}> {
  const now = options.now ?? new Date();
  const thresholds: AlertThresholds = { ...DEFAULT_ALERT_THRESHOLDS, ...options.thresholds };
  const config = getCostConfigAt(now);
  const alerts: MeteringAlert[] = [];

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const hoursInMonth = (nextMonthStart.getTime() - monthStart.getTime()) / 3_600_000;
  const elapsedHours = Math.max(0, (now.getTime() - monthStart.getTime()) / 3_600_000);
  const startDate = monthStart.toISOString().slice(0, 10);
  const endDate = nextMonthStart.toISOString().slice(0, 10);

  // --- inputs -------------------------------------------------------------
  const snapshotWhere = and(
    eq(storageHourlySnapshots.source, "ledger"),
    gte(storageHourlySnapshots.snapshotHour, monthStart),
    lt(storageHourlySnapshots.snapshotHour, nextMonthStart),
  );
  const [storageAgg] = await db
    .select({ billableSum: sum(storageHourlySnapshots.billableBytes) })
    .from(storageHourlySnapshots)
    .where(snapshotWhere);
  const sampledHourRows = await db
    .selectDistinct({ snapshotHour: storageHourlySnapshots.snapshotHour })
    .from(storageHourlySnapshots)
    .where(snapshotWhere);
  const sampledHours = sampledHourRows.length;
  const storageTbhUsed = Number(storageAgg?.billableSum ?? 0) / TB;

  const monthRollupWhere = and(
    gte(egressDailyRollups.usageDate, startDate),
    lt(egressDailyRollups.usageDate, endDate),
  );
  const egressAgg = await db
    .select({
      organizationId: egressDailyRollups.organizationId,
      deliveryPath: egressDailyRollups.deliveryPath,
      bytesServed: sum(egressDailyRollups.bytesServed),
      bytesRequested: sum(egressDailyRollups.bytesRequested),
    })
    .from(egressDailyRollups)
    .where(monthRollupWhere)
    .groupBy(egressDailyRollups.organizationId, egressDailyRollups.deliveryPath);

  let directEgressTb = 0;
  const orgEgressBytes = new Map<string, number>();
  let unattributedEgressBytes = 0;
  for (const row of egressAgg) {
    const served = Number(row.bytesServed ?? 0);
    const requested = Number(row.bytesRequested ?? 0);
    if (row.deliveryPath === "object_storage_direct") {
      directEgressTb += requested / TB;
    }
    // Org-attributable egress = measured proxy bytes + direct estimates.
    const egressBytes =
      row.deliveryPath === "application_proxy"
        ? served
        : row.deliveryPath === "object_storage_direct"
          ? requested
          : 0;
    if (egressBytes <= 0) {
      continue;
    }
    if (row.organizationId === null) {
      unattributedEgressBytes += egressBytes;
    } else {
      orgEgressBytes.set(
        row.organizationId,
        (orgEgressBytes.get(row.organizationId) ?? 0) + egressBytes,
      );
    }
  }

  // --- 1. included-quota consumption --------------------------------------
  const storageQuota = quotaAlert(
    "quota_storage",
    "TB-h",
    storageTbhUsed,
    hoursInMonth * config.objectStorage.includedStorageTbHourPerHour,
    sampledHours * config.objectStorage.includedStorageTbHourPerHour,
    thresholds.quotaSteps,
  );
  if (storageQuota) {
    alerts.push(storageQuota);
  }

  const egressQuota = quotaAlert(
    "quota_egress",
    "TB",
    directEgressTb,
    hoursInMonth * config.objectStorage.includedEgressTbPerHour,
    elapsedHours * config.objectStorage.includedEgressTbPerHour,
    thresholds.quotaSteps,
  );
  if (egressQuota) {
    alerts.push(egressQuota);
  }

  // --- 2. anomalous daily growth ------------------------------------------
  const growthWindowStart = new Date(now.getTime() - 8 * 24 * 3_600_000);
  const recentSnapshots = await db
    .select({
      snapshotHour: storageHourlySnapshots.snapshotHour,
      logicalBytes: sum(storageHourlySnapshots.logicalBytes),
    })
    .from(storageHourlySnapshots)
    .where(
      and(
        eq(storageHourlySnapshots.source, "ledger"),
        gte(storageHourlySnapshots.snapshotHour, growthWindowStart),
      ),
    )
    .groupBy(storageHourlySnapshots.snapshotHour)
    .orderBy(storageHourlySnapshots.snapshotHour);

  const lastTotalByDay = new Map<string, number>();
  for (const row of recentSnapshots) {
    // rows are hour-ascending: the last write per day wins
    lastTotalByDay.set(row.snapshotHour.toISOString().slice(0, 10), Number(row.logicalBytes ?? 0));
  }
  const todayKey = now.toISOString().slice(0, 10);
  const todayBytes = lastTotalByDay.get(todayKey);
  const priorTotals = [...lastTotalByDay.entries()]
    .filter(([day]) => day !== todayKey)
    .map(([, bytes]) => bytes);
  if (todayBytes !== undefined && priorTotals.length >= 3) {
    const mean = priorTotals.reduce((total, bytes) => total + bytes, 0) / priorTotals.length;
    if (mean > 0 && todayBytes > mean * thresholds.dailyGrowthMultiplier) {
      alerts.push({
        kind: "daily_growth",
        message: `daily_growth: bucket at ${todayBytes} bytes today vs trailing mean ${Math.round(mean)} (>${thresholds.dailyGrowthMultiplier}x)`,
        details: { todayBytes, trailingMeanBytes: mean, days: priorTotals.length },
      });
    }
  }

  // --- 3. per-org egress/storage ratio ------------------------------------
  const orgStored = await db
    .select({
      organizationId: storageObjects.organizationId,
      stored: sum(storageObjects.sizeBytes),
    })
    .from(storageObjects)
    .where(and(isNull(storageObjects.deletedAt), isNotNull(storageObjects.organizationId)))
    .groupBy(storageObjects.organizationId);
  const storedByOrg = new Map(
    orgStored.map((row) => [row.organizationId ?? "", Number(row.stored ?? 0)]),
  );

  const ratioOffenders: Array<{
    organizationId: string;
    egressBytes: number;
    storedBytes: number;
  }> = [];
  for (const [organizationId, egressBytes] of orgEgressBytes) {
    const storedBytes = storedByOrg.get(organizationId) ?? 0;
    if (egressBytes > Math.max(storedBytes, 1) * thresholds.egressToStorageRatio) {
      ratioOffenders.push({ organizationId, egressBytes, storedBytes });
    }
  }
  if (ratioOffenders.length > 0) {
    alerts.push({
      kind: "org_ratio",
      message: `org_ratio: ${ratioOffenders.length} org(s) with monthly egress > ${thresholds.egressToStorageRatio}x stored bytes`,
      details: { offenders: ratioOffenders, ratio: thresholds.egressToStorageRatio },
    });
  }

  // --- 4. unattributed ----------------------------------------------------
  const [liveTotals] = await db
    .select({ total: sum(storageObjects.sizeBytes) })
    .from(storageObjects)
    .where(isNull(storageObjects.deletedAt));
  const [unattributedLive] = await db
    .select({ total: sum(storageObjects.sizeBytes) })
    .from(storageObjects)
    .where(and(isNull(storageObjects.deletedAt), isNull(storageObjects.organizationId)));
  const bucketBytes = Number(liveTotals?.total ?? 0);
  const unattributedBytes = Number(unattributedLive?.total ?? 0);
  const unattributedShare = bucketBytes > 0 ? unattributedBytes / bucketBytes : 0;
  if (unattributedShare > thresholds.unattributedShareOfBucket || unattributedEgressBytes > 0) {
    alerts.push({
      kind: "unattributed",
      message: `unattributed: ${(unattributedShare * 100).toFixed(1)}% of bucket bytes unattributed, ${unattributedEgressBytes} unattributed egress bytes this month`,
      details: {
        unattributedBytes,
        bucketBytes,
        unattributedShare,
        unattributedEgressBytes,
        shareThreshold: thresholds.unattributedShareOfBucket,
      },
    });
  }

  // --- 5. ledger vs latest reconciliation ---------------------------------
  const [latestRecon] = await db
    .select({ snapshotHour: storageHourlySnapshots.snapshotHour })
    .from(storageHourlySnapshots)
    .where(eq(storageHourlySnapshots.source, "reconciliation"))
    .orderBy(desc(storageHourlySnapshots.snapshotHour))
    .limit(1);
  if (latestRecon) {
    const [recon] = await db
      .select({ total: sum(storageHourlySnapshots.logicalBytes) })
      .from(storageHourlySnapshots)
      .where(
        and(
          eq(storageHourlySnapshots.source, "reconciliation"),
          eq(storageHourlySnapshots.snapshotHour, latestRecon.snapshotHour),
        ),
      );
    const reconBytes = Number(recon?.total ?? 0);
    const base = Math.max(bucketBytes, reconBytes, 1);
    const delta = Math.abs(bucketBytes - reconBytes) / base;
    if (delta > thresholds.reconciliationTolerance) {
      alerts.push({
        kind: "reconciliation_drift",
        message: `reconciliation_drift: ledger ${bucketBytes} vs reconciliation ${reconBytes} bytes (${(delta * 100).toFixed(2)}% > ${(thresholds.reconciliationTolerance * 100).toFixed(1)}%)`,
        details: {
          ledgerBytes: bucketBytes,
          reconciliationBytes: reconBytes,
          delta,
          snapshotHour: latestRecon.snapshotHour.toISOString(),
        },
      });
    }
  }

  // --- 6. provider comparison (manual inputs — no usage API exists) -------
  const providerCheck = (
    kind: string,
    provider: number | undefined,
    measured: number,
    unit: string,
  ) => {
    if (provider === undefined) {
      return;
    }
    const base = Math.max(Math.abs(provider), 1e-9);
    const delta = Math.abs(provider - measured) / base;
    if (delta > thresholds.providerDeltaTolerance) {
      alerts.push({
        kind,
        message: `${kind}: provider ${provider} vs measured ${measured.toFixed(6)} ${unit} (${(delta * 100).toFixed(2)}% > ${(thresholds.providerDeltaTolerance * 100).toFixed(1)}%)`,
        details: { provider, measured, unit, delta },
      });
    }
  };
  providerCheck("provider_delta_storage", options.providerStorageTbh, storageTbhUsed, "TB-h");
  providerCheck("provider_delta_egress", options.providerEgressTb, directEgressTb, "TB");

  for (const alert of alerts) {
    logErrorEvent(`metering.alert.${alert.kind}`, alert.details);
  }

  return { alerts };
}
