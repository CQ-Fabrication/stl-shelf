import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageObjects } from "@/lib/db/schema/metering";

/**
 * The ONE source of truth for an organization's stored bytes.
 *
 * Sums live (non-soft-deleted) rows in the `storage_objects` ledger, which is
 * maintained at the storage choke point and therefore counts EVERY object the
 * org owns — sources, slicer files, and artifacts (thumbnails/previews/ZIPs)
 * that the old `SUM(model_files.size)` path missed entirely.
 *
 * This replaces the split-brain between the stale `organization.current_storage`
 * cache (only bumped on createModel; over-subtracted on delete) and the live
 * `SUM(model_files.size)` used elsewhere. The `current_storage` column and its
 * writers are intentionally left in place for now (later cleanup); nothing
 * user-facing should read that column anymore — read here instead.
 */
export async function getOrgStorageBytes(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string | null>`sum(${storageObjects.sizeBytes})` })
    .from(storageObjects)
    .where(
      and(eq(storageObjects.organizationId, organizationId), isNull(storageObjects.deletedAt)),
    );

  return Number(row?.total ?? 0);
}
