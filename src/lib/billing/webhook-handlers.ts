import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload.js";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload.js";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload.js";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload.js";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload.js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { env } from "@/lib/env";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";
import type { SubscriptionTier } from "./config";
import { SUBSCRIPTION_TIERS } from "./config";

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

/**
 * Webhook handler: Order paid
 * Called when a subscription is purchased or renewed
 */
export const handleOrderPaid = async (payload: WebhookOrderPaidPayload) => {
  const { data: order } = payload;
  const customerId = order.customerId;
  const productId = order.productId;

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

  await db
    .update(organization)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: "active",
      subscriptionId: order.subscriptionId ?? null,
      storageLimit: tierConfig.storageLimit,
      modelCountLimit: tierConfig.modelCountLimit,
      memberLimit: tierConfig.maxMembers,
    })
    .where(eq(organization.polarCustomerId, customerId));

  logAuditEvent("billing.subscription.upgraded", {
    customerId,
    tier,
    subscriptionId: order.subscriptionId ?? null,
  });
};

/**
 * Webhook handler: Subscription created
 */
export const handleSubscriptionCreated = async (payload: WebhookSubscriptionCreatedPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const productId = subscription.productId;

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

  await db
    .update(organization)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
      storageLimit: tierConfig.storageLimit,
      modelCountLimit: tierConfig.modelCountLimit,
      memberLimit: tierConfig.maxMembers,
    })
    .where(eq(organization.polarCustomerId, customerId));

  logAuditEvent("billing.subscription.created", {
    customerId,
    tier,
    status: subscription.status,
    subscriptionId: subscription.id,
  });
};

/**
 * Webhook handler: Subscription canceled
 * User canceled but may have time remaining in billing period
 */
export const handleSubscriptionCanceled = async (payload: WebhookSubscriptionCanceledPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;

  await db
    .update(organization)
    .set({
      subscriptionStatus: "canceled",
    })
    .where(eq(organization.polarCustomerId, customerId));

  logAuditEvent("billing.subscription.canceled", {
    customerId,
    subscriptionId: subscription.id,
  });
};

/**
 * Webhook handler: Subscription revoked
 * Subscription ended - revert to free tier
 */
export const handleSubscriptionRevoked = async (payload: WebhookSubscriptionRevokedPayload) => {
  const { data: subscription } = payload;
  const customerId = subscription.customerId;
  const freeTier = SUBSCRIPTION_TIERS.free;

  await db
    .update(organization)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "active",
      subscriptionId: null,
      storageLimit: freeTier.storageLimit,
      modelCountLimit: freeTier.modelCountLimit,
      memberLimit: freeTier.maxMembers,
    })
    .where(eq(organization.polarCustomerId, customerId));

  logAuditEvent("billing.subscription.revoked", {
    customerId,
    subscriptionId: subscription.id,
  });
};

/**
 * Webhook handler: Customer state changed
 * Comprehensive sync of customer subscription state
 */
export const handleCustomerStateChanged = async (payload: WebhookCustomerStateChangedPayload) => {
  const { data: customerState } = payload;
  const customerId = customerState.id;

  const activeSubscriptions = customerState.activeSubscriptions ?? [];

  if (activeSubscriptions.length > 0) {
    const sub = activeSubscriptions[0];
    if (!sub) return;

    const tier = getTierFromProductId(sub.productId);

    if (tier) {
      const tierConfig = SUBSCRIPTION_TIERS[tier];

      await db
        .update(organization)
        .set({
          subscriptionTier: tier,
          subscriptionStatus: sub.status,
          subscriptionId: sub.id,
          storageLimit: tierConfig.storageLimit,
          modelCountLimit: tierConfig.modelCountLimit,
          memberLimit: tierConfig.maxMembers,
        })
        .where(eq(organization.polarCustomerId, customerId));

      logAuditEvent("billing.subscription.synced", {
        customerId,
        tier,
        status: sub.status,
        subscriptionId: sub.id,
      });
    }
  } else {
    const freeTier = SUBSCRIPTION_TIERS.free;

    await db
      .update(organization)
      .set({
        subscriptionTier: "free",
        subscriptionStatus: "active",
        subscriptionId: null,
        storageLimit: freeTier.storageLimit,
        modelCountLimit: freeTier.modelCountLimit,
        memberLimit: freeTier.maxMembers,
      })
      .where(eq(organization.polarCustomerId, customerId));

    logAuditEvent("billing.subscription.synced", {
      customerId,
      tier: "free",
      status: "active",
      subscriptionId: null,
    });
  }
};
