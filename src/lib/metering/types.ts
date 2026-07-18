/**
 * Metering shared types + attribution helpers.
 *
 * These union types are the source of truth for the text-typed enumerated
 * columns in src/lib/db/schema/metering.ts. The DB stores plain `text` (no
 * Postgres enums, so adding a new value stays a code-only change and never
 * needs a migration) — these unions document and type-check the allowed
 * values at every application boundary that writes those columns.
 */

/**
 * `egress_daily_rollups.delivery_kind` — which byte path produced the egress.
 * Mirrors spec Fase 2.
 */
export const DELIVERY_KINDS = [
  "preview_inline",
  "thumbnail",
  "file_download",
  "version_zip",
  "print_profile",
  "api_download",
  "generated_artifact",
  "other",
] as const;
export type DeliveryKind = (typeof DELIVERY_KINDS)[number];

/**
 * `egress_daily_rollups.delivery_path` — the network segment the bytes
 * traversed. `internal_storage_to_application` is the (free, same-zone)
 * Object-Storage→app hop; `object_storage_direct` is a presigned OS→browser
 * transfer; `application_proxy` is app→browser; `unattributed` is anything we
 * cannot pin to an organization. Mirrors spec Fase 2.
 */
export const DELIVERY_PATHS = [
  "object_storage_direct",
  "application_proxy",
  "internal_storage_to_application",
  "unattributed",
] as const;
export type DeliveryPath = (typeof DELIVERY_PATHS)[number];

/** `storage_objects.object_kind` — ledger classification derived from the key. */
export const OBJECT_KINDS = ["source", "slicer", "artifact", "temp", "unknown"] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

/**
 * `storage_hourly_snapshots.source` — provenance of a snapshot row.
 * `ledger` = summed from `storage_objects`; `reconciliation` = observed from a
 * ListObjects bucket sweep. Kept distinct so drift between the two is visible.
 */
export const STORAGE_SNAPSHOT_SOURCES = ["ledger", "reconciliation"] as const;
export type StorageSnapshotSource = (typeof STORAGE_SNAPSHOT_SOURCES)[number];

/** Hetzner bills a 64 KB floor per stored object. */
export const MIN_BILLABLE_OBJECT_BYTES = 65_536;

/** Apply the 64 KB per-object billing floor. */
export const toBillableBytes = (sizeBytes: number): number =>
  Math.max(sizeBytes, MIN_BILLABLE_OBJECT_BYTES);

export type ObjectAttribution = {
  organizationId: string | null;
  objectKind: ObjectKind;
  modelId: string | null;
};

const FOLDER_TO_KIND: Record<string, ObjectKind> = {
  sources: "source",
  slicer: "slicer",
  artifacts: "artifact",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Derive organization / kind / model attribution from a storage key, inverting
 * `StorageService.generateStorageKey`'s layout:
 *   - `{orgId}/{modelId}/{version}/(sources|slicer|artifacts)/{filename}`
 *   - `temp/{timestamp}-{filename}`  → unattributed temp object
 * Any key that does not match a known org layout is `unknown` + unattributed.
 * `versionId` is intentionally never derived: the key carries the version
 * *string* (e.g. `v1`), not the `model_versions.id` UUID, so it is not cheaply
 * recoverable without a DB lookup.
 */
export function deriveObjectAttribution(storageKey: string): ObjectAttribution {
  const segments = storageKey.split("/");

  if (segments[0] === "temp") {
    return { organizationId: null, objectKind: "temp", modelId: null };
  }

  // {orgId}/{modelId}/{version}/{folder}/{filename...}
  if (segments.length >= 5) {
    const organizationId = segments[0] ?? "";
    const modelId = segments[1] ?? "";
    const folder = segments[3] ?? "";
    const objectKind = FOLDER_TO_KIND[folder] ?? "unknown";

    if (organizationId.length > 0 && objectKind !== "unknown") {
      return {
        organizationId,
        objectKind,
        modelId: UUID_RE.test(modelId) ? modelId : null,
      };
    }
  }

  return { organizationId: null, objectKind: "unknown", modelId: null };
}
