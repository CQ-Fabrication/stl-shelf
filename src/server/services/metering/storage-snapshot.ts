import { count, isNull, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageHourlySnapshots, storageObjects } from "@/lib/db/schema/metering";
import { withMeteringRun } from "./metering-run";

/**
 * Hourly storage snapshot from the object ledger (spec Fase 2).
 *
 * One row per organization (plus one `organizationId = null` row for
 * unattributed objects) for the current UTC hour, source "ledger". Idempotent:
 * re-running within the same hour upserts the SAME rows (dedup on
 * org+hour+source), so a retried cron tick never duplicates.
 *
 * Missed-run semantics (honest by design): a skipped hour stays MISSING.
 * Storage state is point-in-time — it cannot be reconstructed after the fact,
 * so we never backfill invented rows. Consumers (the monthly report) must
 * tolerate gaps: they scale from the sampled hours and report the coverage
 * ratio instead of silently pretending full coverage.
 */

export type SnapshotGroup = {
  organizationId: string | null;
  logicalBytes: number;
  billableBytes: number;
  objectCount: number;
};

export const truncateToUtcHour = (date: Date): Date => {
  const hour = new Date(date);
  hour.setUTCMinutes(0, 0, 0);
  return hour;
};

export async function computeLedgerGroups(): Promise<SnapshotGroup[]> {
  const groups = await db
    .select({
      organizationId: storageObjects.organizationId,
      logicalBytes: sum(storageObjects.sizeBytes),
      billableBytes: sum(storageObjects.billableBytes),
      objectCount: count(),
    })
    .from(storageObjects)
    .where(isNull(storageObjects.deletedAt))
    .groupBy(storageObjects.organizationId);

  return groups.map((group) => ({
    organizationId: group.organizationId,
    logicalBytes: Number(group.logicalBytes ?? 0),
    billableBytes: Number(group.billableBytes ?? 0),
    objectCount: Number(group.objectCount ?? 0),
  }));
}

export async function upsertSnapshotRows(
  snapshotHour: Date,
  source: "ledger" | "reconciliation",
  groups: SnapshotGroup[],
  reconciled: boolean,
): Promise<void> {
  for (const group of groups) {
    await db
      .insert(storageHourlySnapshots)
      .values({
        organizationId: group.organizationId,
        snapshotHour,
        logicalBytes: group.logicalBytes,
        billableBytes: group.billableBytes,
        objectCount: group.objectCount,
        source,
        reconciled,
      })
      .onConflictDoUpdate({
        target: [
          storageHourlySnapshots.organizationId,
          storageHourlySnapshots.snapshotHour,
          storageHourlySnapshots.source,
        ],
        set: {
          logicalBytes: group.logicalBytes,
          billableBytes: group.billableBytes,
          objectCount: group.objectCount,
          reconciled,
        },
      });
  }
}

/**
 * Guarantee a single `organizationId = null` row for the hour.
 *
 * That null-org row is the "hour sampled" marker the monthly report counts via
 * DISTINCT snapshot_hour. Without it, an hour whose ledger has no unattributed
 * objects AND drops to zero live rows (empty bucket, or every org emptied)
 * would write NO rows at all — the report would then treat the hour as
 * UNSAMPLED and mis-scale every org's TB-hours from a smaller denominator,
 * instead of recording a measured zero. When unattributed bytes exist the row
 * carries them (its normal meaning); otherwise it is an explicit zero.
 */
export function withAggregateRow(groups: SnapshotGroup[]): SnapshotGroup[] {
  if (groups.some((group) => group.organizationId === null)) {
    return groups;
  }
  return [...groups, { organizationId: null, logicalBytes: 0, billableBytes: 0, objectCount: 0 }];
}

export async function runHourlySnapshot(now = new Date()): Promise<{
  snapshotHour: string;
  organizations: number;
  totalLogicalBytes: number;
  totalBillableBytes: number;
  totalObjects: number;
}> {
  return withMeteringRun("hourly_snapshot", async () => {
    const snapshotHour = truncateToUtcHour(now);
    const groups = withAggregateRow(await computeLedgerGroups());
    await upsertSnapshotRows(snapshotHour, "ledger", groups, false);

    return {
      snapshotHour: snapshotHour.toISOString(),
      organizations: groups.filter((group) => group.organizationId !== null).length,
      totalLogicalBytes: groups.reduce((total, group) => total + group.logicalBytes, 0),
      totalBillableBytes: groups.reduce((total, group) => total + group.billableBytes, 0),
      totalObjects: groups.reduce((total, group) => total + group.objectCount, 0),
    };
  });
}
