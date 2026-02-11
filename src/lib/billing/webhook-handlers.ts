import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload.js";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload.js";
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
import type { SubscriptionTier } from "./config";
import { SUBSCRIPTION_TIERS, isUnlimited, normalizeSubscriptionTier } from "./config";
import {
  getGraceDeadlineIfOverLimit,
  getUsageSnapshotForOrganization,
} from "@/server/services/billing/retention.service";
import { getRetentionDeadline } from "@/lib/billing/grace";

/**
 * Server-side product ID to tier mapping
 * Uses env vars which are only available server-side
 */
function getTierFromProductId(productId: string): SubscriptionTier | undefined {
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
  currentTier: SubscriptionTier;
  profile: {
    profileId: string;
    properties: Record<string, unknown>;
  };
};

const getTrackingContextByCustomerId = async (
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
      currentStorage: true,
      currentModelCount: true,
      currentMemberCount: true,
    },
  });

  if (!org) {
    return null;
  }

  const currentTier = normalizeSubscriptionTier(org.subscriptionTier);

  return {
    currentTier,
    profile: {
      profileId: org.ownerId ?? org.id,
      properties: {
        organizationId: org.id,
        organizationName: org.name,
        subscriptionTier: currentTier,
        subscriptionStatus: org.subscriptionStatus ?? "none",
        storageUsedBytes: org.currentStorage ?? 0,
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
export const handleOrderPaid = async (payload: WebhookOrderPaidPayload) => {
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

  const tier = getTierFromProductId(productId);

  if (!tier) {
    logErrorEvent("billing.webhook.unknown_product", {
      customerId,
      productId,
      orderId: order.id,
    });
    return;
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const updateStatus = await applyOrganizationUpdateFromWebhook({
    customerId,
    eventTimestamp,
    changes: {
      subscriptionTier: tier,
      subscriptionStatus: "active",
      subscriptionId: order.subscriptionId ?? null,
      storageLimit: tierConfig.storageLimit,
      modelCountLimit: tierConfig.modelCountLimit,
      memberLimit: tierConfig.maxMembers,
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
 * Webhook handler: Subscription created
 */
export const handleSubscriptionCreated = async (payload: WebhookSubscriptionCreatedPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const productId = subscription.productId;
  const eventTimestamp = payload.timestamp;
  const trackingBefore = await getTrackingContextByCustomerId(customerId);

  const tier = getTierFromProductId(productId);

  if (!tier) {
    logErrorEvent("billing.webhook.unknown_product", {
      customerId,
      productId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const updateStatus = await applyOrganizationUpdateFromWebhook({
    customerId,
    eventTimestamp,
    changes: {
      subscriptionTier: tier,
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
      storageLimit: tierConfig.storageLimit,
      modelCountLimit: tierConfig.modelCountLimit,
      memberLimit: tierConfig.maxMembers,
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
  const tier = getTierFromProductId(subscription.productId);
  const eventTimestamp = payload.timestamp;
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
  const freeTier = SUBSCRIPTION_TIERS.free;
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
  const graceDeadline = await getGraceDeadlineIfOverLimit(org.id);

  const [updatedOrg] = await db
    .update(organization)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "active",
      subscriptionId: null,
      storageLimit: freeTier.storageLimit,
      modelCountLimit: freeTier.modelCountLimit,
      memberLimit: freeTier.maxMembers,
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

  if (activeSubscriptions.length > 0) {
    const sub = activeSubscriptions[0];
    if (!sub) return;

    const tier = getTierFromProductId(sub.productId);

    if (tier) {
      const tierConfig = SUBSCRIPTION_TIERS[tier];

      const updateStatus = await applyOrganizationUpdateFromWebhook({
        customerId,
        eventTimestamp,
        changes: {
          subscriptionTier: tier,
          subscriptionStatus: sub.status,
          subscriptionId: sub.id,
          storageLimit: tierConfig.storageLimit,
          modelCountLimit: tierConfig.modelCountLimit,
          memberLimit: tierConfig.maxMembers,
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
    }
  } else {
    const freeTier = SUBSCRIPTION_TIERS.free;

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

    const graceDeadline = await getGraceDeadlineIfOverLimit(org.id);
    const previousTier = (org.subscriptionTier as SubscriptionTier) ?? "free";

    const [updatedOrg] = await db
      .update(organization)
      .set({
        subscriptionTier: "free",
        subscriptionStatus: "active",
        subscriptionId: null,
        storageLimit: freeTier.storageLimit,
        modelCountLimit: freeTier.modelCountLimit,
        memberLimit: freeTier.maxMembers,
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
  }
};
