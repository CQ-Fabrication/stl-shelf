import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload.js";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload.js";
import type { WebhookOrderRefundedPayload } from "@polar-sh/sdk/models/components/webhookorderrefundedpayload.js";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload.js";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload.js";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload.js";
import { render } from "@react-email/components";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { organization, user } from "@/lib/db/schema/auth";
import { env } from "@/lib/env";
import { SubscriptionCanceledTemplate, SubscriptionGraceTemplate } from "@/lib/email";
import { formatStorage } from "@/lib/billing/utils";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";
import { trackSubscriptionActivated, trackSubscriptionCanceled } from "@/lib/openpanel";
import {
  deliverAnalyticsBestEffort,
  deliverOrderRefund,
  deliverOrderRevenue,
  recordPaidOrder,
  recordRefundedOrder,
} from "@/lib/billing/order-ledger";
import type { BillingAddon, SubscriptionTier } from "./config";
import {
  SUBSCRIPTION_TIER_ORDER,
  SUBSCRIPTION_TIERS,
  isUnlimited,
  normalizeSubscriptionTier,
} from "./config";
import { getAddonFromProductId } from "./addons";
import {
  computeEffectiveLimits,
  getActiveAddonGrants,
  type PresentAddon,
  reconcileOrgAddons,
  setAddonStatus,
  upsertActiveAddon,
} from "@/server/services/billing/addons.service";
import {
  getGraceDeadlineIfOverLimit,
  getUsageSnapshotForOrganization,
} from "@/server/services/billing/retention.service";
import { getOrgStorageBytes } from "@/server/services/billing/storage-usage";
import { getRetentionDeadline } from "@/lib/billing/grace";

/**
 * Server-side product ID to tier mapping
 * Uses env vars which are only available server-side
 */
export function getTierFromProductId(productId: string): SubscriptionTier | undefined {
  if (env.POLAR_PRODUCT_FREE && productId === env.POLAR_PRODUCT_FREE) return "free";
  if (env.POLAR_PRODUCT_BASIC && productId === env.POLAR_PRODUCT_BASIC) return "basic";
  if (env.POLAR_PRODUCT_BASIC_MONTH && productId === env.POLAR_PRODUCT_BASIC_MONTH) return "basic";
  if (env.POLAR_PRODUCT_BASIC_YEAR && productId === env.POLAR_PRODUCT_BASIC_YEAR) return "basic";
  if (env.POLAR_PRODUCT_PRO && productId === env.POLAR_PRODUCT_PRO) return "pro";
  if (env.POLAR_PRODUCT_PRO_MONTH && productId === env.POLAR_PRODUCT_PRO_MONTH) return "pro";
  if (env.POLAR_PRODUCT_PRO_YEAR && productId === env.POLAR_PRODUCT_PRO_YEAR) return "pro";
  return undefined;
}

type BillingTrackingContext = {
  organizationId: string;
  currentTier: SubscriptionTier;
  profile: {
    profileId: string;
    properties: Record<string, unknown>;
  };
};

export const getTrackingContextByCustomerId = async (
  customerId: string,
): Promise<BillingTrackingContext | null> => {
  const org = await db.query.organization.findFirst({
    where: eq(organization.polarCustomerId, customerId),
    columns: {
      id: true,
      name: true,
      ownerId: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      currentModelCount: true,
      currentMemberCount: true,
    },
  });

  if (!org) {
    return null;
  }

  const currentTier = normalizeSubscriptionTier(org.subscriptionTier);
  // Read stored bytes from the object ledger (one source of truth), not the
  // stale organization.currentStorage cache.
  const storageUsedBytes = await getOrgStorageBytes(org.id);

  return {
    organizationId: org.id,
    currentTier,
    profile: {
      profileId: org.ownerId ?? org.id,
      properties: {
        organizationId: org.id,
        organizationName: org.name,
        subscriptionTier: currentTier,
        subscriptionStatus: org.subscriptionStatus ?? "none",
        storageUsedBytes,
        modelsCount: org.currentModelCount ?? 0,
        memberCount: org.currentMemberCount ?? 1,
      },
    },
  };
};

type WebhookApplyStatus =
  | { status: "updated" }
  | { status: "missing" }
  | { status: "stale"; lastAppliedAt: Date | null };

type WebhookOrganizationChanges = Omit<
  Partial<typeof organization.$inferInsert>,
  "billingLastWebhookAt"
>;

const applyOrganizationUpdateFromWebhook = async ({
  customerId,
  eventTimestamp,
  changes,
}: {
  customerId: string;
  eventTimestamp: Date;
  changes: WebhookOrganizationChanges;
}): Promise<WebhookApplyStatus> => {
  const [updatedOrg] = await db
    .update(organization)
    .set({
      ...changes,
      billingLastWebhookAt: eventTimestamp,
    })
    .where(
      and(
        eq(organization.polarCustomerId, customerId),
        or(
          isNull(organization.billingLastWebhookAt),
          lt(organization.billingLastWebhookAt, eventTimestamp),
        ),
      ),
    )
    .returning({ id: organization.id });

  if (updatedOrg) {
    return { status: "updated" };
  }

  const existingOrg = await db.query.organization.findFirst({
    where: eq(organization.polarCustomerId, customerId),
    columns: {
      id: true,
      billingLastWebhookAt: true,
    },
  });

  if (!existingOrg) {
    return { status: "missing" };
  }

  return {
    status: "stale",
    lastAppliedAt: existingOrg.billingLastWebhookAt ?? null,
  };
};

const logStaleWebhook = ({
  eventType,
  customerId,
  eventTimestamp,
  lastAppliedAt,
}: {
  eventType: string;
  customerId: string;
  eventTimestamp: Date;
  lastAppliedAt: Date | null;
}) => {
  logAuditEvent("billing.webhook.stale_ignored", {
    eventType,
    customerId,
    eventTimestamp: eventTimestamp.toISOString(),
    lastAppliedAt: lastAppliedAt?.toISOString() ?? null,
  });
};

type OrgBillingContext = {
  id: string;
  subscriptionTier: string | null;
  billingLastWebhookAt: Date | null;
};

const getOrgBillingContext = async (customerId: string): Promise<OrgBillingContext | null> => {
  const org = await db.query.organization.findFirst({
    where: eq(organization.polarCustomerId, customerId),
    columns: {
      id: true,
      subscriptionTier: true,
      billingLastWebhookAt: true,
    },
  });

  return org ?? null;
};

/**
 * Effective limits for a tier, folding in the org's currently-active add-on
 * grants. With no add-ons this returns exactly the tier config, so tier-only
 * customers are unaffected.
 */
const resolveEffectiveLimits = async (organizationId: string, tier: SubscriptionTier) => {
  const grants = await getActiveAddonGrants(organizationId);
  return computeEffectiveLimits(tier, grants);
};

/**
 * Apply an add-on subscription lifecycle event (created / order / canceled /
 * revoked). Does NOT touch subscriptionTier/subscriptionId - those describe the
 * TIER subscription.
 *
 * Ordering is PER SUBSCRIPTION (via the add-on row's lastEventAt), NOT the
 * org-level billingLastWebhookAt: tier and add-on subscriptions are independent
 * webhook streams, so a newer tier event advancing the org watermark must not
 * stale-drop a delayed add-on event (worst case an add-on revoke, which would
 * otherwise keep granting forever). After the (possibly skipped) row write, the
 * org's effective limits are recomputed from the CURRENT rows and written
 * unconditionally - that is derived from committed state, so it is correct
 * regardless of event ordering. It deliberately does NOT advance
 * billingLastWebhookAt (that watermark belongs to org-state/tier updates).
 */
const applyAddonSubscriptionEvent = async ({
  customerId,
  polarSubscriptionId,
  productId,
  addon,
  status,
  eventType,
  eventTimestamp,
}: {
  customerId: string;
  polarSubscriptionId: string;
  productId: string;
  addon: BillingAddon;
  status: "active" | "canceled" | "revoked";
  eventType: string;
  eventTimestamp: Date;
}): Promise<void> => {
  const org = await getOrgBillingContext(customerId);

  if (!org) {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: polarSubscriptionId,
    });
    return;
  }

  const applied =
    status === "active"
      ? await upsertActiveAddon({
          organizationId: org.id,
          polarSubscriptionId,
          productId,
          addon,
          eventTimestamp,
        })
      : await setAddonStatus(polarSubscriptionId, status, eventTimestamp);

  // Recompute effective limits from the current add-on rows and write them
  // unconditionally (see the ordering note above).
  const tier = normalizeSubscriptionTier(org.subscriptionTier);
  const limits = await resolveEffectiveLimits(org.id, tier);

  await db
    .update(organization)
    .set({
      storageLimit: limits.storageLimit,
      modelCountLimit: limits.modelCountLimit,
      memberLimit: limits.memberLimit,
    })
    .where(eq(organization.id, org.id));

  if (!applied) {
    logStaleWebhook({ eventType, customerId, eventTimestamp, lastAppliedAt: null });
    return;
  }

  // "canceled" keeps granting until revoked (period-end semantics), so only
  // "revoked" is an actual removal.
  const auditEvent =
    status === "active"
      ? "billing.addon.applied"
      : status === "canceled"
        ? "billing.addon.canceled"
        : "billing.addon.removed";

  logAuditEvent(auditEvent, {
    organizationId: org.id,
    addonSlug: addon.slug,
    polarSubscriptionId,
    eventTimestamp: eventTimestamp.toISOString(),
  });
};

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const getOrgOwnerEmail = async (customerId: string) => {
  const [row] = await db
    .select({
      orgId: organization.id,
      ownerId: organization.ownerId,
      ownerEmail: user.email,
      billingCancelNoticeSentAt: organization.billingCancelNoticeSentAt,
      billingGraceNoticeSentAt: organization.billingGraceNoticeSentAt,
    })
    .from(organization)
    .leftJoin(user, eq(user.id, organization.ownerId))
    .where(eq(organization.polarCustomerId, customerId))
    .limit(1);

  if (!row?.ownerEmail) {
    return null;
  }

  return row;
};

const sendCancellationEmail = async (
  customerId: string,
  tier: SubscriptionTier,
  periodEnd: Date | null,
) => {
  const orgOwner = await getOrgOwnerEmail(customerId);
  const ownerEmail = orgOwner?.ownerEmail;
  if (!orgOwner || !ownerEmail || orgOwner.billingCancelNoticeSentAt) return;

  const snapshot = await getUsageSnapshotForOrganization(orgOwner.orgId);
  const freeTier = SUBSCRIPTION_TIERS.free;
  const overModels =
    !isUnlimited(freeTier.modelCountLimit) &&
    !Number.isNaN(snapshot.modelCount) &&
    snapshot.modelCount > freeTier.modelCountLimit;
  const overStorage = snapshot.storageBytes > freeTier.storageLimit;
  const needsAction = overModels || overStorage;
  const overModelCount = overModels
    ? Math.max(0, snapshot.modelCount - freeTier.modelCountLimit)
    : 0;
  const overStorageBytes = overStorage
    ? Math.max(0, snapshot.storageBytes - freeTier.storageLimit)
    : 0;

  const html = await render(
    SubscriptionCanceledTemplate({
      planName: SUBSCRIPTION_TIERS[tier].name,
      periodEnd: periodEnd ? formatDate(periodEnd) : null,
      modelsUsed: snapshot.modelCount,
      modelsLimit: freeTier.modelCountLimit,
      storageUsed: formatStorage(snapshot.storageBytes),
      storageLimit: formatStorage(freeTier.storageLimit),
      overModelCount,
      storageOverage: overStorageBytes > 0 ? formatStorage(overStorageBytes) : null,
      needsAction,
      manageUrl: `${env.WEB_URL}/billing`,
      logoUrl: env.EMAIL_LOGO_URL,
    }),
  );

  const { error } = await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to: ownerEmail,
    subject: "Your plan was canceled",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  await db
    .update(organization)
    .set({ billingCancelNoticeSentAt: new Date() })
    .where(eq(organization.id, orgOwner.orgId));
};

const sendGraceEmail = async (customerId: string, tier: SubscriptionTier, graceDeadline: Date) => {
  const orgOwner = await getOrgOwnerEmail(customerId);
  const ownerEmail = orgOwner?.ownerEmail;
  if (!orgOwner || !ownerEmail || orgOwner.billingGraceNoticeSentAt) return;

  const retentionDeadline = getRetentionDeadline(graceDeadline);
  const html = await render(
    SubscriptionGraceTemplate({
      planName: SUBSCRIPTION_TIERS[tier].name,
      graceDeadline: formatDate(graceDeadline),
      retentionDeadline: formatDate(retentionDeadline),
      manageUrl: `${env.WEB_URL}/billing`,
      logoUrl: env.EMAIL_LOGO_URL,
    }),
  );

  const { error } = await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to: ownerEmail,
    subject: "Your plan ended — action required",
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  await db
    .update(organization)
    .set({ billingGraceNoticeSentAt: new Date() })
    .where(eq(organization.id, orgOwner.orgId));
};

/**
 * Webhook handler: Order paid
 * Called when a subscription is purchased or renewed
 */
export const handleOrderPaid = async (payload: WebhookOrderPaidPayload): Promise<void> => {
  const order = payload.data;
  const tracking = await getTrackingContextByCustomerId(order.customerId);

  if (tracking) {
    const tier = order.productId ? getTierFromProductId(order.productId) : undefined;
    await recordPaidOrder(
      order,
      {
        organizationId: tracking.organizationId,
        profileId: tracking.profile.profileId,
        tier: tier ?? null,
      },
      order.createdAt,
    );
  } else {
    logErrorEvent("billing.webhook.revenue_unknown_customer", {
      customerId: order.customerId,
      orderId: order.id,
    });
  }

  await applyOrderPaidOrgState(payload);

  if (tracking) {
    await deliverAnalyticsBestEffort("order.paid.revenue", order.id, deliverOrderRevenue);
  }
};

const applyOrderPaidOrgState = async (payload: WebhookOrderPaidPayload) => {
  const { data: order } = payload;
  const customerId = order.customerId;
  const productId = order.productId;
  const eventTimestamp = payload.timestamp;

  if (!productId) {
    logErrorEvent("billing.webhook.order_missing_product", {
      customerId,
      orderId: order.id,
    });
    return;
  }

  const addon = getAddonFromProductId(productId);

  if (addon) {
    if (!order.subscriptionId) {
      logErrorEvent("billing.webhook.addon_missing_subscription", {
        customerId,
        productId,
        orderId: order.id,
      });
      return;
    }

    await applyAddonSubscriptionEvent({
      customerId,
      polarSubscriptionId: order.subscriptionId,
      productId,
      addon,
      status: "active",
      eventType: payload.type,
      eventTimestamp,
    });
    return;
  }

  const tier = getTierFromProductId(productId);

  if (!tier) {
    logErrorEvent("billing.webhook.unknown_product", {
      customerId,
      productId,
      orderId: order.id,
    });
    return;
  }

  const org = await getOrgBillingContext(customerId);

  if (!org) {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      orderId: order.id,
    });
    return;
  }

  const limits = await resolveEffectiveLimits(org.id, tier);

  const updateStatus = await applyOrganizationUpdateFromWebhook({
    customerId,
    eventTimestamp,
    changes: {
      subscriptionTier: tier,
      subscriptionStatus: "active",
      subscriptionId: order.subscriptionId ?? null,
      storageLimit: limits.storageLimit,
      modelCountLimit: limits.modelCountLimit,
      memberLimit: limits.memberLimit,
      subscriptionPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      graceDeadline: null,
    },
  });

  if (updateStatus.status === "missing") {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      orderId: order.id,
    });
    return;
  }

  if (updateStatus.status === "stale") {
    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: updateStatus.lastAppliedAt,
    });
    return;
  }

  logAuditEvent("billing.subscription.upgraded", {
    customerId,
    tier,
    subscriptionId: order.subscriptionId ?? null,
    eventTimestamp: eventTimestamp.toISOString(),
  });
};

/**
 * Webhook handler: Order refunded
 * Called when an order is fully or partially refunded
 */
export const handleOrderRefunded = async (payload: WebhookOrderRefundedPayload): Promise<void> => {
  const order = payload.data;
  const tracking = await getTrackingContextByCustomerId(order.customerId);

  if (!tracking) {
    logErrorEvent("billing.webhook.refund_unknown_customer", {
      customerId: order.customerId,
      orderId: order.id,
    });
    return;
  }

  const tier = order.productId ? getTierFromProductId(order.productId) : undefined;

  await recordRefundedOrder(
    order,
    {
      organizationId: tracking.organizationId,
      profileId: tracking.profile.profileId,
      tier: tier ?? null,
    },
    payload.timestamp,
  );

  logAuditEvent("billing.order.refunded", {
    customerId: order.customerId,
    orderId: order.id,
    subscriptionId: order.subscriptionId ?? null,
    refundedAmountMinor: order.refundedAmount + order.refundedTaxAmount,
    currency: order.currency.toLowerCase(),
    eventTimestamp: payload.timestamp.toISOString(),
  });

  await deliverAnalyticsBestEffort("order.refunded.refund", order.id, deliverOrderRefund);
};

/**
 * Webhook handler: Subscription created
 */
export const handleSubscriptionCreated = async (payload: WebhookSubscriptionCreatedPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const productId = subscription.productId;
  const eventTimestamp = payload.timestamp;
  const trackingBefore = await getTrackingContextByCustomerId(customerId);

  const addon = getAddonFromProductId(productId);

  if (addon) {
    await applyAddonSubscriptionEvent({
      customerId,
      polarSubscriptionId: subscription.id,
      productId,
      addon,
      status: "active",
      eventType: payload.type,
      eventTimestamp,
    });
    return;
  }

  const tier = getTierFromProductId(productId);

  if (!tier) {
    logErrorEvent("billing.webhook.unknown_product", {
      customerId,
      productId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const org = await getOrgBillingContext(customerId);

  if (!org) {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const limits = await resolveEffectiveLimits(org.id, tier);

  const updateStatus = await applyOrganizationUpdateFromWebhook({
    customerId,
    eventTimestamp,
    changes: {
      subscriptionTier: tier,
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
      storageLimit: limits.storageLimit,
      modelCountLimit: limits.modelCountLimit,
      memberLimit: limits.memberLimit,
      subscriptionPeriodEnd: subscription.currentPeriodEnd ?? subscription.endsAt ?? null,
      subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      graceDeadline: null,
    },
  });

  if (updateStatus.status === "missing") {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  if (updateStatus.status === "stale") {
    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: updateStatus.lastAppliedAt,
    });
    return;
  }

  logAuditEvent("billing.subscription.created", {
    customerId,
    tier,
    status: subscription.status,
    subscriptionId: subscription.id,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  const trackingAfter = (await getTrackingContextByCustomerId(customerId)) ?? trackingBefore;
  if (trackingAfter) {
    const previousTier = trackingBefore?.currentTier;
    trackSubscriptionActivated(
      trackingAfter.profile,
      tier,
      previousTier && previousTier !== tier ? previousTier : undefined,
    ).catch(() => {});
  }
};

/**
 * Webhook handler: Subscription canceled
 * User canceled but may have time remaining in billing period
 */
export const handleSubscriptionCanceled = async (payload: WebhookSubscriptionCanceledPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const eventTimestamp = payload.timestamp;

  const addon = getAddonFromProductId(subscription.productId);

  if (addon) {
    await applyAddonSubscriptionEvent({
      customerId,
      polarSubscriptionId: subscription.id,
      productId: subscription.productId,
      addon,
      status: "canceled",
      eventType: payload.type,
      eventTimestamp,
    });
    return;
  }

  const tier = getTierFromProductId(subscription.productId);
  const trackingBefore = await getTrackingContextByCustomerId(customerId);

  const updateStatus = await applyOrganizationUpdateFromWebhook({
    customerId,
    eventTimestamp,
    changes: {
      subscriptionStatus: "canceled",
      subscriptionPeriodEnd: subscription.currentPeriodEnd ?? subscription.endsAt ?? null,
      subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
  });

  if (updateStatus.status === "missing") {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  if (updateStatus.status === "stale") {
    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: updateStatus.lastAppliedAt,
    });
    return;
  }

  if (tier && subscription.cancelAtPeriodEnd) {
    try {
      await sendCancellationEmail(
        customerId,
        tier,
        subscription.currentPeriodEnd ?? subscription.endsAt ?? null,
      );
    } catch (error) {
      logErrorEvent("billing.email.cancel_failed", {
        customerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  logAuditEvent("billing.subscription.canceled", {
    customerId,
    subscriptionId: subscription.id,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  const trackingAfter = (await getTrackingContextByCustomerId(customerId)) ?? trackingBefore;
  const canceledTier = tier ?? trackingBefore?.currentTier ?? "free";
  if (trackingAfter) {
    trackSubscriptionCanceled(
      trackingAfter.profile,
      canceledTier,
      subscription.cancelAtPeriodEnd ? "cancel_at_period_end" : "canceled",
    ).catch(() => {});
  }
};

/**
 * Webhook handler: Subscription revoked
 * Subscription ended - revert to free tier
 */
export const handleSubscriptionRevoked = async (payload: WebhookSubscriptionRevokedPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const eventTimestamp = payload.timestamp;

  const addon = getAddonFromProductId(subscription.productId);

  if (addon) {
    await applyAddonSubscriptionEvent({
      customerId,
      polarSubscriptionId: subscription.id,
      productId: subscription.productId,
      addon,
      status: "revoked",
      eventType: payload.type,
      eventTimestamp,
    });
    return;
  }

  const trackingBefore = await getTrackingContextByCustomerId(customerId);

  const org = await db.query.organization.findFirst({
    where: eq(organization.polarCustomerId, customerId),
    columns: {
      id: true,
      subscriptionTier: true,
      billingLastWebhookAt: true,
    },
  });

  if (!org) {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  if (org.billingLastWebhookAt && org.billingLastWebhookAt >= eventTimestamp) {
    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: org.billingLastWebhookAt,
    });
    return;
  }

  const previousTier =
    getTierFromProductId(subscription.productId) ??
    (org.subscriptionTier as SubscriptionTier) ??
    "free";
  // Tier reverts to free, but any add-on subscriptions that are still active
  // keep their grants (computed honestly from the rows). Grace is judged
  // against those SAME effective limits so an org with a paid storage add-on
  // is not wrongly forced read-only.
  const limits = await resolveEffectiveLimits(org.id, "free");
  const graceDeadline = await getGraceDeadlineIfOverLimit(org.id, limits);

  const [updatedOrg] = await db
    .update(organization)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "active",
      subscriptionId: null,
      storageLimit: limits.storageLimit,
      modelCountLimit: limits.modelCountLimit,
      memberLimit: limits.memberLimit,
      subscriptionPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      graceDeadline,
      billingLastWebhookAt: eventTimestamp,
    })
    .where(
      and(
        eq(organization.id, org.id),
        or(
          isNull(organization.billingLastWebhookAt),
          lt(organization.billingLastWebhookAt, eventTimestamp),
        ),
      ),
    )
    .returning({ id: organization.id });

  if (!updatedOrg) {
    const latestOrg = await db.query.organization.findFirst({
      where: eq(organization.id, org.id),
      columns: {
        billingLastWebhookAt: true,
      },
    });

    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: latestOrg?.billingLastWebhookAt ?? null,
    });
    return;
  }

  if (graceDeadline) {
    try {
      await sendGraceEmail(customerId, previousTier, graceDeadline);
    } catch (error) {
      logErrorEvent("billing.email.grace_failed", {
        customerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  logAuditEvent("billing.subscription.revoked", {
    customerId,
    subscriptionId: subscription.id,
    eventTimestamp: eventTimestamp.toISOString(),
  });

  const trackingAfter = (await getTrackingContextByCustomerId(customerId)) ?? trackingBefore;
  if (trackingAfter && previousTier !== "free") {
    trackSubscriptionCanceled(trackingAfter.profile, previousTier, "revoked").catch(() => {});
  }
};

/**
 * Webhook handler: Customer state changed
 * Comprehensive sync of customer subscription state
 */
export const handleCustomerStateChanged = async (payload: WebhookCustomerStateChangedPayload) => {
  const { data: customerState } = payload;
  const customerId = customerState.id;
  const eventTimestamp = payload.timestamp;

  const activeSubscriptions = customerState.activeSubscriptions ?? [];

  // Partition active subscriptions into TIER subs and ADD-ON subs. The previous
  // implementation looked at activeSubscriptions[0] only - with a tier sub plus
  // add-on subs, array order decided which sub was "the" subscription, silently
  // corrupting limits. We now classify every sub explicitly.
  type TierSub = { sub: (typeof activeSubscriptions)[number]; tier: SubscriptionTier };
  const tierSubs: TierSub[] = [];
  const addonSubs: PresentAddon[] = [];

  for (const sub of activeSubscriptions) {
    const tier = getTierFromProductId(sub.productId);
    if (tier) {
      tierSubs.push({ sub, tier });
      continue;
    }
    const addon = getAddonFromProductId(sub.productId);
    if (addon) {
      addonSubs.push({ polarSubscriptionId: sub.id, productId: sub.productId, addon });
    }
    // Unknown products are ignored (they neither set a tier nor grant add-ons).
  }

  const org = await getOrgBillingContext(customerId);

  if (!org) {
    logErrorEvent("billing.webhook.unknown_customer", {
      customerId,
      subscriptionId: null,
    });
    return;
  }

  if (org.billingLastWebhookAt && org.billingLastWebhookAt >= eventTimestamp) {
    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: org.billingLastWebhookAt,
    });
    return;
  }

  // Reconcile add-on rows against the full present set: activate present ones,
  // revoke rows whose subscription is no longer reported.
  await reconcileOrgAddons(org.id, addonSubs, eventTimestamp);

  // Pick the winning tier sub: when multiple tier subs are active, the highest
  // tier wins.
  const chosen = tierSubs.reduce<TierSub | undefined>((best, current) => {
    if (!best) return current;
    return SUBSCRIPTION_TIER_ORDER.indexOf(current.tier) >
      SUBSCRIPTION_TIER_ORDER.indexOf(best.tier)
      ? current
      : best;
  }, undefined);

  if (chosen) {
    const { sub, tier } = chosen;
    const limits = await resolveEffectiveLimits(org.id, tier);

    const updateStatus = await applyOrganizationUpdateFromWebhook({
      customerId,
      eventTimestamp,
      changes: {
        subscriptionTier: tier,
        subscriptionStatus: sub.status,
        subscriptionId: sub.id,
        storageLimit: limits.storageLimit,
        modelCountLimit: limits.modelCountLimit,
        memberLimit: limits.memberLimit,
        subscriptionPeriodEnd: sub.currentPeriodEnd ?? sub.endsAt ?? null,
        subscriptionCancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        graceDeadline: null,
      },
    });

    if (updateStatus.status === "missing") {
      logErrorEvent("billing.webhook.unknown_customer", {
        customerId,
        subscriptionId: sub.id,
      });
      return;
    }

    if (updateStatus.status === "stale") {
      logStaleWebhook({
        eventType: payload.type,
        customerId,
        eventTimestamp,
        lastAppliedAt: updateStatus.lastAppliedAt,
      });
      return;
    }

    logAuditEvent("billing.subscription.synced", {
      customerId,
      tier,
      status: sub.status,
      subscriptionId: sub.id,
      eventTimestamp: eventTimestamp.toISOString(),
    });
    return;
  }

  // No tier subscription: fall back to free, but keep any still-active add-on
  // grants (computed honestly from the reconciled rows). Grace is judged
  // against those SAME effective limits.
  const previousTier = normalizeSubscriptionTier(org.subscriptionTier);
  const limits = await resolveEffectiveLimits(org.id, "free");
  const graceDeadline = await getGraceDeadlineIfOverLimit(org.id, limits);

  const [updatedOrg] = await db
    .update(organization)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "active",
      subscriptionId: null,
      storageLimit: limits.storageLimit,
      modelCountLimit: limits.modelCountLimit,
      memberLimit: limits.memberLimit,
      subscriptionPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
      graceDeadline,
      billingLastWebhookAt: eventTimestamp,
    })
    .where(
      and(
        eq(organization.id, org.id),
        or(
          isNull(organization.billingLastWebhookAt),
          lt(organization.billingLastWebhookAt, eventTimestamp),
        ),
      ),
    )
    .returning({ id: organization.id });

  if (!updatedOrg) {
    const latestOrg = await db.query.organization.findFirst({
      where: eq(organization.id, org.id),
      columns: {
        billingLastWebhookAt: true,
      },
    });

    logStaleWebhook({
      eventType: payload.type,
      customerId,
      eventTimestamp,
      lastAppliedAt: latestOrg?.billingLastWebhookAt ?? null,
    });
    return;
  }

  if (graceDeadline) {
    try {
      await sendGraceEmail(customerId, previousTier, graceDeadline);
    } catch (error) {
      logErrorEvent("billing.email.grace_failed", {
        customerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  logAuditEvent("billing.subscription.synced", {
    customerId,
    tier: "free",
    status: "active",
    subscriptionId: null,
    eventTimestamp: eventTimestamp.toISOString(),
  });
};
