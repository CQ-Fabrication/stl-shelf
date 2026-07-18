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

export async function runHourlySnapshot(now = new Date()): Promise<{
  snapshotHour: string;
  organizations: number;
  totalLogicalBytes: number;
  totalBillableBytes: number;
  totalObjects: number;
}> {
  return withMeteringRun("hourly_snapshot", async () => {
    const snapshotHour = truncateToUtcHour(now);
    const groups = await computeLedgerGroups();
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
