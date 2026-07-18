import { and, eq, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationAddons } from "@/lib/db/schema/billing";
import type { AddonKind, BillingAddon, SubscriptionTier } from "@/lib/billing/config";
import { SUBSCRIPTION_TIERS } from "@/lib/billing/config";

/**
 * A currently-granting add-on, as read from `organization_addons` (status =
 * "active"). Only these contribute to effective limits.
 */
export type ActiveAddonGrant = {
  kind: AddonKind;
  grantBytes: number | null;
  grantSeats: number | null;
};

export type EffectiveLimits = {
  storageLimit: number;
  memberLimit: number;
  modelCountLimit: number;
};

/**
 * Effective limits = tier limits + active add-on grants.
 *
 * Storage packs raise the storage limit, seat packs raise the member limit.
 * The model-count limit is never affected by add-ons, and an unlimited (-1)
 * tier limit stays -1.
 */
export function computeEffectiveLimits(
  tier: SubscriptionTier,
  activeAddons: ActiveAddonGrant[],
): EffectiveLimits {
  const config = SUBSCRIPTION_TIERS[tier];

  let storageLimit = config.storageLimit;
  let memberLimit = config.maxMembers;

  for (const addon of activeAddons) {
    if (addon.kind === "storage" && addon.grantBytes) {
      storageLimit += addon.grantBytes;
    }
    if (addon.kind === "seats" && addon.grantSeats) {
      memberLimit += addon.grantSeats;
    }
  }

  return {
    storageLimit,
    memberLimit,
    modelCountLimit: config.modelCountLimit,
  };
}

/**
 * Read the org's currently-granting add-ons.
 *
 * "canceled" still grants: Polar fires subscription.canceled when a
 * cancellation is SCHEDULED (cancelAtPeriodEnd) and subscription.revoked when
 * access actually ends - mirroring how tier subscriptions behave here. Only
 * "revoked" stops granting.
 */
export async function getActiveAddonGrants(organizationId: string): Promise<ActiveAddonGrant[]> {
  const rows = await db
    .select({
      kind: organizationAddons.kind,
      grantBytes: organizationAddons.grantBytes,
      grantSeats: organizationAddons.grantSeats,
    })
    .from(organizationAddons)
    .where(
      and(
        eq(organizationAddons.organizationId, organizationId),
        inArray(organizationAddons.status, ["active", "canceled"]),
      ),
    );

  return rows.map((row) => ({
    kind: row.kind as AddonKind,
    grantBytes: row.grantBytes,
    grantSeats: row.grantSeats,
  }));
}

/**
 * Per-subscription ordering guard: only apply an event that is strictly newer
 * than what this row last saw. Add-on subscriptions are an independent webhook
 * stream from the tier subscription, so a shared org-level watermark would
 * stale-drop a delayed add-on event; we order each add-on row on its own.
 */
const isNewerEvent = (eventTimestamp: Date) =>
  or(isNull(organizationAddons.lastEventAt), lt(organizationAddons.lastEventAt, eventTimestamp));

type AddonUpsertInput = {
  organizationId: string;
  polarSubscriptionId: string;
  productId: string;
  addon: BillingAddon;
  eventTimestamp: Date;
  /**
   * When true (customer.state_changed reconcile, which carries the full truth),
   * override the row regardless of its lastEventAt ordering. Single-event
   * webhook writes leave this false so a stale event cannot clobber a newer one.
   */
  force?: boolean;
};

/**
 * Idempotently record an add-on subscription as active. Keyed by
 * polarSubscriptionId, so webhook re-delivery of the same subscription never
 * double-grants. Returns true when the row was actually written (inserted or
 * updated), false when skipped as stale by the per-subscription guard.
 */
export async function upsertActiveAddon({
  organizationId,
  polarSubscriptionId,
  productId,
  addon,
  eventTimestamp,
  force = false,
}: AddonUpsertInput): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .insert(organizationAddons)
    .values({
      organizationId,
      polarSubscriptionId,
      productId,
      addonSlug: addon.slug,
      kind: addon.kind,
      grantBytes: addon.grantBytes,
      grantSeats: addon.grantSeats,
      status: "active",
      lastEventAt: eventTimestamp,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: organizationAddons.polarSubscriptionId,
      set: {
        organizationId,
        productId,
        addonSlug: addon.slug,
        kind: addon.kind,
        grantBytes: addon.grantBytes,
        grantSeats: addon.grantSeats,
        status: "active",
        lastEventAt: eventTimestamp,
        updatedAt: now,
      },
      setWhere: force ? undefined : isNewerEvent(eventTimestamp),
    })
    .returning({ id: organizationAddons.id });

  return row !== undefined;
}

/**
 * Mark an add-on subscription canceled or revoked. Returns true when the row
 * was actually written, false when skipped as stale by the per-subscription
 * guard (or when no matching row exists).
 */
export async function setAddonStatus(
  polarSubscriptionId: string,
  status: "canceled" | "revoked",
  eventTimestamp: Date,
): Promise<boolean> {
  const [row] = await db
    .update(organizationAddons)
    .set({ status, lastEventAt: eventTimestamp, updatedAt: new Date() })
    .where(
      and(
        eq(organizationAddons.polarSubscriptionId, polarSubscriptionId),
        isNewerEvent(eventTimestamp),
      ),
    )
    .returning({ id: organizationAddons.id });

  return row !== undefined;
}

export type PresentAddon = {
  polarSubscriptionId: string;
  productId: string;
  addon: BillingAddon;
};

/**
 * Reconcile the org's add-on rows against the full set of add-on subscriptions
 * reported by a customer.state_changed event: upsert every present one as
 * active, and mark every previously-active row that is now absent as revoked.
 *
 * customer.state_changed is the full-truth snapshot, so it overrides rows
 * regardless of their per-subscription lastEventAt and stamps that watermark to
 * the state event's timestamp on every touched row.
 */
export async function reconcileOrgAddons(
  organizationId: string,
  present: PresentAddon[],
  eventTimestamp: Date,
): Promise<void> {
  for (const item of present) {
    await upsertActiveAddon({
      organizationId,
      polarSubscriptionId: item.polarSubscriptionId,
      productId: item.productId,
      addon: item.addon,
      eventTimestamp,
      force: true,
    });
  }

  const presentIds = present.map((item) => item.polarSubscriptionId);

  await db
    .update(organizationAddons)
    .set({ status: "revoked", lastEventAt: eventTimestamp, updatedAt: new Date() })
    .where(
      and(
        eq(organizationAddons.organizationId, organizationId),
        inArray(organizationAddons.status, ["active", "canceled"]),
        ...(presentIds.length > 0
          ? [notInArray(organizationAddons.polarSubscriptionId, presentIds)]
          : []),
      ),
    );
}
