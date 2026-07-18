import { and, eq, notInArray } from "drizzle-orm";
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

/** Read the org's currently-granting (status = "active") add-ons. */
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
        eq(organizationAddons.status, "active"),
      ),
    );

  return rows.map((row) => ({
    kind: row.kind as AddonKind,
    grantBytes: row.grantBytes,
    grantSeats: row.grantSeats,
  }));
}

type AddonUpsertInput = {
  organizationId: string;
  polarSubscriptionId: string;
  productId: string;
  addon: BillingAddon;
};

/**
 * Idempotently record an add-on subscription as active. Keyed by
 * polarSubscriptionId, so webhook re-delivery of the same subscription never
 * double-grants.
 */
export async function upsertActiveAddon({
  organizationId,
  polarSubscriptionId,
  productId,
  addon,
}: AddonUpsertInput): Promise<void> {
  const now = new Date();
  await db
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
        updatedAt: now,
      },
    });
}

/**
 * Mark an add-on subscription canceled or revoked. Returns the affected row
 * (org + slug) so the caller can recompute limits and emit an audit event.
 */
export async function setAddonStatus(
  polarSubscriptionId: string,
  status: "canceled" | "revoked",
): Promise<{ organizationId: string; addonSlug: string } | undefined> {
  const [row] = await db
    .update(organizationAddons)
    .set({ status, updatedAt: new Date() })
    .where(eq(organizationAddons.polarSubscriptionId, polarSubscriptionId))
    .returning({
      organizationId: organizationAddons.organizationId,
      addonSlug: organizationAddons.addonSlug,
    });

  return row;
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
 */
export async function reconcileOrgAddons(
  organizationId: string,
  present: PresentAddon[],
): Promise<void> {
  for (const item of present) {
    await upsertActiveAddon({
      organizationId,
      polarSubscriptionId: item.polarSubscriptionId,
      productId: item.productId,
      addon: item.addon,
    });
  }

  const presentIds = present.map((item) => item.polarSubscriptionId);

  await db
    .update(organizationAddons)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(
        eq(organizationAddons.organizationId, organizationId),
        eq(organizationAddons.status, "active"),
        ...(presentIds.length > 0
          ? [notInArray(organizationAddons.polarSubscriptionId, presentIds)]
          : []),
      ),
    );
}
