import { and, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageObjects } from "@/lib/db/schema/metering";
import { getErrorDetails, logErrorEvent } from "@/lib/logging";
import { deriveObjectAttribution, toBillableBytes } from "@/lib/metering/types";

/**
 * Object ledger writes, called from the storage choke point
 * (`StorageService.uploadFile` / `deleteFile` / `deleteFiles`).
 *
 * These are BEST-EFFORT but IN-PROCESS AWAITED: the caller awaits them so an
 * accounting write is never silently dropped, but any failure is caught and
 * logged here (never rethrown) so it can NEVER fail the underlying upload or
 * delete. Accounting is subordinate to the user operation, not the reverse.
 */

/**
 * Upsert one ledger row for a stored key. Overwrites are re-PUTs of the same
 * key, so `ON CONFLICT (storage_key) DO UPDATE` refreshes size/kind/attribution
 * and clears `deleted_at` (the object exists again).
 */
export async function recordObjectUpsert(params: {
  storageKey: string;
  sizeBytes: number;
}): Promise<void> {
  const { storageKey, sizeBytes } = params;
  const { organizationId, objectKind, modelId } = deriveObjectAttribution(storageKey);
  const billableBytes = toBillableBytes(sizeBytes);

  try {
    await db
      .insert(storageObjects)
      .values({ storageKey, organizationId, objectKind, sizeBytes, billableBytes, modelId })
      .onConflictDoUpdate({
        target: storageObjects.storageKey,
        set: {
          organizationId,
          objectKind,
          sizeBytes,
          billableBytes,
          modelId,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    logErrorEvent("metering.ledger.write_failed", {
      storageKey,
      operation: "upsert",
      ...getErrorDetails(error),
    });
  }
}

/**
 * Soft-delete ledger rows for the given keys (set `deleted_at = now()`), keeping
 * the row for history. Only rows not already marked deleted are touched, so the
 * original deletion timestamp is preserved across repeat deletes. Keys with no
 * ledger row are a silent no-op.
 */
export async function recordObjectDeletion(storageKeys: string[]): Promise<void> {
  if (storageKeys.length === 0) {
    return;
  }

  const now = new Date();

  try {
    await db
      .update(storageObjects)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(inArray(storageObjects.storageKey, storageKeys), isNull(storageObjects.deletedAt)),
      );
  } catch (error) {
    logErrorEvent("metering.ledger.write_failed", {
      storageKeyCount: storageKeys.length,
      operation: "delete",
      ...getErrorDetails(error),
    });
  }
}
