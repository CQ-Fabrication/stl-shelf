import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageObjects } from "@/lib/db/schema/metering";
import { logErrorEvent } from "@/lib/logging";
import { deriveObjectAttribution, toBillableBytes } from "@/lib/metering/types";
import { storageService } from "@/server/services/storage";
import { withMeteringRun } from "./metering-run";
import { type SnapshotGroup, truncateToUtcHour, upsertSnapshotRows } from "./storage-snapshot";

/**
 * Bucket ↔ ledger reconciliation (spec Fase 2: "riconciliazione periodica
 * ListObjects"). Scoped to the stl-shelf BUCKET — the Hetzner account holds
 * other projects' buckets that this system never sees, so account-level
 * invoice lines can only be compared against the SUM of buckets, never against
 * this bucket alone.
 *
 * Diff matrix:
 *  - object in bucket, no live ledger row → upsert (attribution from key;
 *    unknown layout → unattributed) — drift
 *  - live ledger row, object gone from bucket → soft-delete (deletedAt) — drift
 *  - size mismatch → update the ledger row — drift
 *
 * Dry-run is the DEFAULT (reports the diff, writes nothing — not even a run
 * row). `--apply` fixes the ledger and also writes a `storage_hourly_snapshots`
 * row per org with source "reconciliation" and reconciled=true, so ledger vs
 * reconciliation drift stays visible per hour.
 */

const DEFAULT_DRIFT_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100 MiB

export type ReconciliationSummary = Record<string, unknown> & {
  scannedObjects: number;
  ledgerLiveRows: number;
  missingInLedger: number;
  ghostLedgerRows: number;
  sizeMismatches: number;
  driftBytes: number;
  applied: boolean;
};

export async function runReconciliation(options: {
  apply: boolean;
  driftThresholdBytes?: number;
  now?: Date;
}): Promise<ReconciliationSummary> {
  const { apply } = options;
  const driftThresholdBytes = options.driftThresholdBytes ?? DEFAULT_DRIFT_THRESHOLD_BYTES;

  const execute = async (): Promise<ReconciliationSummary> => {
    // 1. Full bucket inventory (prod bucket is a few hundred objects — fits).
    const bucketObjects = new Map<string, number>();
    let continuationToken: string | undefined;
    do {
      const page = await storageService.listFiles({ continuationToken });
      for (const file of page.files) {
        bucketObjects.set(file.key, file.size);
      }
      continuationToken = page.continuationToken;
    } while (continuationToken);

    // 2. Live ledger rows.
    const ledgerRows = await db
      .select({ storageKey: storageObjects.storageKey, sizeBytes: storageObjects.sizeBytes })
      .from(storageObjects)
      .where(isNull(storageObjects.deletedAt));
    const ledgerByKey = new Map(ledgerRows.map((row) => [row.storageKey, Number(row.sizeBytes)]));

    // 3. Diff.
    let missingInLedger = 0;
    let sizeMismatches = 0;
    let driftBytes = 0;

    for (const [key, size] of bucketObjects) {
      const ledgerSize = ledgerByKey.get(key);

      if (ledgerSize === undefined) {
        missingInLedger += 1;
        driftBytes += size;
        if (apply) {
          const attribution = deriveObjectAttribution(key);
          await db
            .insert(storageObjects)
            .values({
              storageKey: key,
              organizationId: attribution.organizationId,
              objectKind: attribution.objectKind,
              sizeBytes: size,
              billableBytes: toBillableBytes(size),
              modelId: attribution.modelId,
            })
            .onConflictDoUpdate({
              target: storageObjects.storageKey,
              set: {
                organizationId: attribution.organizationId,
                objectKind: attribution.objectKind,
                sizeBytes: size,
                billableBytes: toBillableBytes(size),
                modelId: attribution.modelId,
                deletedAt: null,
                updatedAt: new Date(),
              },
            });
        }
        continue;
      }

      if (ledgerSize !== size) {
        sizeMismatches += 1;
        driftBytes += Math.abs(ledgerSize - size);
        if (apply) {
          await db
            .update(storageObjects)
            .set({ sizeBytes: size, billableBytes: toBillableBytes(size), updatedAt: new Date() })
            .where(eq(storageObjects.storageKey, key));
        }
      }
    }

    const ghostKeys = ledgerRows
      .map((row) => row.storageKey)
      .filter((key) => !bucketObjects.has(key));
    for (const key of ghostKeys) {
      driftBytes += ledgerByKey.get(key) ?? 0;
    }
    if (apply && ghostKeys.length > 0) {
      const now = new Date();
      await db
        .update(storageObjects)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(inArray(storageObjects.storageKey, ghostKeys), isNull(storageObjects.deletedAt)),
        );
    }

    // 4. Reconciliation snapshot: what the BUCKET actually contains, grouped
    // by key-derived attribution (independent of the ledger).
    if (apply) {
      const groups = new Map<string | null, SnapshotGroup>();
      for (const [key, size] of bucketObjects) {
        const { organizationId } = deriveObjectAttribution(key);
        const group = groups.get(organizationId) ?? {
          organizationId,
          logicalBytes: 0,
          billableBytes: 0,
          objectCount: 0,
        };
        group.logicalBytes += size;
        group.billableBytes += toBillableBytes(size);
        group.objectCount += 1;
        groups.set(organizationId, group);
      }
      await upsertSnapshotRows(
        truncateToUtcHour(options.now ?? new Date()),
        "reconciliation",
        [...groups.values()],
        true,
      );
    }

    const summary: ReconciliationSummary = {
      scannedObjects: bucketObjects.size,
      ledgerLiveRows: ledgerRows.length,
      missingInLedger,
      ghostLedgerRows: ghostKeys.length,
      sizeMismatches,
      driftBytes,
      applied: apply,
    };

    if (driftBytes > driftThresholdBytes) {
      logErrorEvent("metering.reconciliation.drift", {
        ...summary,
        driftThresholdBytes,
      });
    }

    return summary;
  };

  // Dry-run writes NOTHING — not even a run row.
  return apply ? withMeteringRun("reconciliation", execute) : execute();
}
