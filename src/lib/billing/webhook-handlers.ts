import type { WebhookCustomerStateChangedPayload } from "@polar-sh/sdk/models/components/webhookcustomerstatechangedpayload.js";
import type { WebhookOrderPaidPayload } from "@polar-sh/sdk/models/components/webhookorderpaidpayload.js";
import type { WebhookSubscriptionCanceledPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncanceledpayload.js";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload.js";
import type { WebhookSubscriptionRevokedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionrevokedpayload.js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { env } from "@/lib/env";
import type { SubscriptionTier } from "./config";
import { SUBSCRIPTION_TIERS } from "./config";

/**
 * Server-side product ID to tier mapping
 * Uses env vars which are only available server-side
 */
function getTierFromProductId(productId: string): SubscriptionTier | undefined {
  if (env.POLAR_PRODUCT_FREE && productId === env.POLAR_PRODUCT_FREE) return "free";
  if (env.POLAR_PRODUCT_BASIC && productId === env.POLAR_PRODUCT_BASIC) return "basic";
  if (env.POLAR_PRODUCT_PRO && productId === env.POLAR_PRODUCT_PRO) return "pro";
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
    console.error("[Polar Webhook] Order missing productId");
    return;
  }

  const tier = getTierFromProductId(productId);

  if (!tier) {
    console.error(`[Polar Webhook] Unknown product ID: ${productId}`);
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

  console.log(`[Polar Webhook] Organization upgraded to ${tier} tier`);
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
    console.error(`[Polar Webhook] Unknown product ID: ${productId}`);
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

  console.log(`[Polar Webhook] Subscription created: ${tier} (status: ${subscription.status})`);
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

  console.log("[Polar Webhook] Subscription canceled (grace period active)");
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

  console.log("[Polar Webhook] Subscription ended, reverted to free tier");
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

      console.log(`[Polar Webhook] Customer state synced: ${tier} tier`);
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

    console.log("[Polar Webhook] Customer state synced: free tier (no active subscription)");
  }
};
