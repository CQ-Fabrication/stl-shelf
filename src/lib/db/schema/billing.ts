import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const billingWebhookEvents = pgTable(
  "billing_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    customerId: text("customer_id"),
    subscriptionId: text("subscription_id"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_webhook_events_type_idx").on(table.eventType),
    index("billing_webhook_events_received_at_idx").on(table.receivedAt),
    index("billing_webhook_events_customer_idx").on(table.customerId),
  ],
);

export type BillingWebhookEvent = typeof billingWebhookEvents.$inferSelect;
export type NewBillingWebhookEvent = typeof billingWebhookEvents.$inferInsert;

export const billingRetentionRuns = pgTable(
  "billing_retention_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    totalOrganizations: integer("total_organizations").notNull().default(0),
    cleanedOrganizations: integer("cleaned_organizations").notNull().default(0),
    deletedModels: integer("deleted_models").notNull().default(0),
    deletedBytes: bigint("deleted_bytes", { mode: "number" }).notNull().default(0),
    error: text("error"),
  },
  (table) => [
    index("billing_retention_runs_status_idx").on(table.status),
    index("billing_retention_runs_started_idx").on(table.startedAt),
  ],
);

export const billingRetentionRunItems = pgTable(
  "billing_retention_run_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => billingRetentionRuns.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    deletedModels: integer("deleted_models").notNull().default(0),
    deletedBytes: bigint("deleted_bytes", { mode: "number" }).notNull().default(0),
    retentionDeadline: timestamp("retention_deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_retention_run_items_run_idx").on(table.runId),
    index("billing_retention_run_items_org_idx").on(table.organizationId),
    index("billing_retention_run_items_status_idx").on(table.status),
  ],
);

export type BillingRetentionRun = typeof billingRetentionRuns.$inferSelect;
export type NewBillingRetentionRun = typeof billingRetentionRuns.$inferInsert;
export type BillingRetentionRunItem = typeof billingRetentionRunItems.$inferSelect;
export type NewBillingRetentionRunItem = typeof billingRetentionRunItems.$inferInsert;

export const accountDeletionRuns = pgTable(
  "account_deletion_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    totalUsers: integer("total_users").notNull().default(0),
    deletedUsers: integer("deleted_users").notNull().default(0),
    deletedOrganizations: integer("deleted_organizations").notNull().default(0),
    deletedBytes: bigint("deleted_bytes", { mode: "number" }).notNull().default(0),
    error: text("error"),
  },
  (table) => [
    index("account_deletion_runs_status_idx").on(table.status),
    index("account_deletion_runs_started_idx").on(table.startedAt),
  ],
);

export const accountDeletionRunItems = pgTable(
  "account_deletion_run_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => accountDeletionRuns.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    userEmail: text("user_email"),
    status: text("status").notNull(),
    deletedOrganizations: integer("deleted_organizations").notNull().default(0),
    deletedBytes: bigint("deleted_bytes", { mode: "number" }).notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("account_deletion_run_items_run_idx").on(table.runId),
    index("account_deletion_run_items_status_idx").on(table.status),
  ],
);

export type AccountDeletionRun = typeof accountDeletionRuns.$inferSelect;
export type NewAccountDeletionRun = typeof accountDeletionRuns.$inferInsert;
export type AccountDeletionRunItem = typeof accountDeletionRunItems.$inferSelect;
export type NewAccountDeletionRunItem = typeof accountDeletionRunItems.$inferInsert;

export const billingOrder = pgTable(
  "billing_order",
  {
    polarOrderId: text("polar_order_id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    profileId: text("profile_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    totalAmountMinor: integer("total_amount_minor").notNull(),
    taxAmountMinor: integer("tax_amount_minor").notNull(),
    currency: text("currency").notNull(),
    productId: text("product_id"),
    subscriptionId: text("subscription_id"),
    billingReason: text("billing_reason").notNull(),
    tier: text("tier"),
    revenueState: text("revenue_state").notNull().default("pending"), // pending|processing|completed
    revenueTrackedAt: timestamp("revenue_tracked_at", { withTimezone: true }),
    refundedAmountMinor: integer("refunded_amount_minor").notNull().default(0),
    refundTrackedAmountMinor: integer("refund_tracked_amount_minor").notNull().default(0),
    refundAnalyticsState: text("refund_analytics_state").notNull().default("not_applicable"), // not_applicable|pending|processing|completed
    refundTrackedAt: timestamp("refund_tracked_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("billing_order_organization_id_idx").on(table.organizationId)],
);

export type BillingOrder = typeof billingOrder.$inferSelect;
export type NewBillingOrder = typeof billingOrder.$inferInsert;

/**
 * Billing add-ons: one row per active Polar add-on subscription (storage packs,
 * extra seats). Keyed by polarSubscriptionId so webhook re-delivery is
 * idempotent. Grants stack on top of the tier limits via computeEffectiveLimits.
 */
export const organizationAddons = pgTable(
  "organization_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    polarSubscriptionId: text("polar_subscription_id").notNull().unique(),
    productId: text("product_id").notNull(),
    addonSlug: text("addon_slug").notNull(),
    kind: text("kind").notNull(),
    grantBytes: bigint("grant_bytes", { mode: "number" }),
    grantSeats: integer("grant_seats"),
    status: text("status").notNull().default("active"),
    // Per-subscription ordering watermark. Add-on subscriptions are an
    // independent webhook stream from the tier subscription, so they cannot
    // rely on the org-level billingLastWebhookAt: a newer tier event would
    // stale-drop a delayed add-on event. We order add-on writes per row.
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("organization_addons_org_idx").on(table.organizationId)],
);

export type OrganizationAddon = typeof organizationAddons.$inferSelect;
export type NewOrganizationAddon = typeof organizationAddons.$inferInsert;
