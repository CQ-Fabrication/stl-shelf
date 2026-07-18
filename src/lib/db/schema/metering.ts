import {
  bigint,
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Hetzner storage/egress metering (spec Fase 2).
 *
 * Attribution columns (`organization_id`, `object_kind`, `delivery_kind`,
 * `delivery_path`, snapshot `source`) are plain `text` — the allowed values are
 * defined and type-checked as unions in `src/lib/metering/types.ts`. No Postgres
 * enums and no FK on `organization_id`: these are accounting tables that must be
 * able to record orphaned / unattributed objects (null org) and objects whose
 * organization was later hard-deleted, and ledger writes at the storage choke
 * point must never fail an upload/delete because of a constraint.
 *
 * `organization_id` is nullable AND part of each dedup constraint, so those
 * uniques use `NULLS NOT DISTINCT` (Postgres 16) — otherwise null-org rows would
 * never collide and `ON CONFLICT DO UPDATE` upserts could not increment them.
 */

/**
 * Per-day, per-org, per-path egress counters. Idempotent atomic upserts:
 * `ON CONFLICT (organization_id, usage_date, delivery_kind, delivery_path)
 *  DO UPDATE SET requests_* = requests_* + excluded.*, bytes_* = ...`.
 * No unbounded raw-request table by design.
 */
export const egressDailyRollups = pgTable(
  "egress_daily_rollups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = unattributed (could not be pinned to an org). See DELIVERY_PATHS.
    organizationId: text("organization_id"),
    usageDate: date("usage_date").notNull(),
    // DeliveryKind union
    deliveryKind: text("delivery_kind").notNull(),
    // DeliveryPath union
    deliveryPath: text("delivery_path").notNull(),
    requestsStarted: bigint("requests_started", { mode: "number" }).notNull().default(0),
    requestsCompleted: bigint("requests_completed", { mode: "number" }).notNull().default(0),
    requestsAborted: bigint("requests_aborted", { mode: "number" }).notNull().default(0),
    requestsFailed: bigint("requests_failed", { mode: "number" }).notNull().default(0),
    bytesRequested: bigint("bytes_requested", { mode: "number" }).notNull().default(0),
    bytesServed: bigint("bytes_served", { mode: "number" }).notNull().default(0),
    bytesAborted: bigint("bytes_aborted", { mode: "number" }).notNull().default(0),
    rangeRequests: bigint("range_requests", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("egress_daily_rollups_dedup_idx")
      .on(table.organizationId, table.usageDate, table.deliveryKind, table.deliveryPath)
      .nullsNotDistinct(),
    index("egress_daily_rollups_org_date_idx").on(table.organizationId, table.usageDate),
  ],
);

/**
 * Hourly storage snapshots. `billable_bytes` applies the 64 KB/object floor.
 * `source` separates ledger-derived rows from reconciliation (ListObjects)
 * rows so the two can be compared for drift at the same hour.
 */
export const storageHourlySnapshots = pgTable(
  "storage_hourly_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = unattributed / account-level aggregate
    organizationId: text("organization_id"),
    snapshotHour: timestamp("snapshot_hour", { withTimezone: true }).notNull(),
    logicalBytes: bigint("logical_bytes", { mode: "number" }).notNull().default(0),
    billableBytes: bigint("billable_bytes", { mode: "number" }).notNull().default(0),
    objectCount: bigint("object_count", { mode: "number" }).notNull().default(0),
    // StorageSnapshotSource union
    source: text("source").notNull(),
    reconciled: boolean("reconciled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("storage_hourly_snapshots_dedup_idx")
      .on(table.organizationId, table.snapshotHour, table.source)
      .nullsNotDistinct(),
    index("storage_hourly_snapshots_org_hour_idx").on(table.organizationId, table.snapshotHour),
  ],
);

/**
 * Application object ledger — one row per storage key, maintained at the
 * storage choke point (upload/delete). Rows are soft-deleted (`deleted_at`)
 * so history survives object deletion. `billable_bytes` applies the 64 KB
 * floor. `organization_id`/`object_kind`/`model_id` are derived from the key
 * via `deriveObjectAttribution`; unknown/temp keys are unattributed (null org).
 */
export const storageObjects = pgTable(
  "storage_objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageKey: text("storage_key").notNull(),
    // null = unattributed (temp/unknown key layout)
    organizationId: text("organization_id"),
    // ObjectKind union
    objectKind: text("object_kind").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    billableBytes: bigint("billable_bytes", { mode: "number" }).notNull(),
    modelId: uuid("model_id"),
    versionId: uuid("version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // soft delete: row survives object deletion for historical accounting
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("storage_objects_storage_key_idx").on(table.storageKey),
    index("storage_objects_org_idx").on(table.organizationId),
    index("storage_objects_org_deleted_idx").on(table.organizationId, table.deletedAt),
  ],
);
