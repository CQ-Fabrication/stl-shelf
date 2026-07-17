import type { Order } from "@polar-sh/sdk/models/components/order.js";
import { and, eq, ne } from "drizzle-orm";
import { billingOrder, db } from "@/lib/db";
import { trackRefund, trackRevenue } from "@/lib/openpanel";

export type OrderTrackingContext = {
  organizationId: string;
  profileId: string;
  tier: string | null;
};

export const recordPaidOrder = async (order: Order, ctx: OrderTrackingContext, paidAt: Date) => {
  // Defensive: Polar may re-send a paid order after a partial refund.
  const refundedAmountMinor = order.refundedAmount + order.refundedTaxAmount;

  await db
    .insert(billingOrder)
    .values({
      polarOrderId: order.id,
      organizationId: ctx.organizationId,
      profileId: ctx.profileId,
      tier: ctx.tier,
      amountMinor: order.netAmount,
      totalAmountMinor: order.totalAmount,
      taxAmountMinor: order.taxAmount,
      currency: order.currency.toLowerCase(),
      productId: order.productId,
      subscriptionId: order.subscriptionId,
      billingReason: order.billingReason,
      refundedAmountMinor,
      paidAt,
    })
    .onConflictDoUpdate({
      target: billingOrder.polarOrderId,
      // Never touch revenueState / refundAnalyticsState / refundTracked* here:
      // those state machines must survive webhook re-delivery.
      set: {
        organizationId: ctx.organizationId,
        profileId: ctx.profileId,
        tier: ctx.tier,
        amountMinor: order.netAmount,
        totalAmountMinor: order.totalAmount,
        taxAmountMinor: order.taxAmount,
        currency: order.currency.toLowerCase(),
        productId: order.productId,
        subscriptionId: order.subscriptionId,
        billingReason: order.billingReason,
        refundedAmountMinor,
        paidAt,
        updatedAt: new Date(),
      },
    });
};

export const recordRefundedOrder = async (
  order: Order,
  ctx: OrderTrackingContext,
  refundedAt: Date,
) => {
  const existing = await db.query.billingOrder.findFirst({
    where: eq(billingOrder.polarOrderId, order.id),
    columns: { refundTrackedAmountMinor: true, refundAnalyticsState: true },
  });

  const previousRefundTrackedMinor = existing?.refundTrackedAmountMinor ?? 0;
  const previousRefundState = existing?.refundAnalyticsState ?? "not_applicable";

  const refundedAmountMinor = order.refundedAmount + order.refundedTaxAmount;

  await db
    .insert(billingOrder)
    .values({
      polarOrderId: order.id,
      organizationId: ctx.organizationId,
      profileId: ctx.profileId,
      tier: ctx.tier,
      amountMinor: order.netAmount,
      totalAmountMinor: order.totalAmount,
      taxAmountMinor: order.taxAmount,
      currency: order.currency.toLowerCase(),
      productId: order.productId,
      subscriptionId: order.subscriptionId,
      billingReason: order.billingReason,
      refundedAmountMinor,
      paidAt: order.createdAt,
      refundedAt,
    })
    .onConflictDoUpdate({
      target: billingOrder.polarOrderId,
      set: {
        organizationId: ctx.organizationId,
        profileId: ctx.profileId,
        tier: ctx.tier,
        amountMinor: order.netAmount,
        totalAmountMinor: order.totalAmount,
        taxAmountMinor: order.taxAmount,
        currency: order.currency.toLowerCase(),
        productId: order.productId,
        subscriptionId: order.subscriptionId,
        billingReason: order.billingReason,
        refundedAmountMinor,
        refundedAt,
        updatedAt: new Date(),
      },
    });

  if (previousRefundState === "not_applicable") {
    await db
      .update(billingOrder)
      .set({ refundAnalyticsState: "pending", updatedAt: new Date() })
      .where(
        and(
          eq(billingOrder.polarOrderId, order.id),
          eq(billingOrder.refundAnalyticsState, "not_applicable"),
        ),
      );
    return;
  }

  // The processing guard avoids clobbering an in-flight delivery back to
  // pending — that's the race that double-counts refunds.
  if (refundedAmountMinor > previousRefundTrackedMinor && previousRefundState !== "processing") {
    await db
      .update(billingOrder)
      .set({ refundAnalyticsState: "pending", updatedAt: new Date() })
      .where(
        and(
          eq(billingOrder.polarOrderId, order.id),
          ne(billingOrder.refundAnalyticsState, "processing"),
        ),
      );
  }
};

export const deliverOrderRevenue = async (orderId: string) => {
  // Claim the row: pending -> processing atomically. Zero rows returned means
  // it was already delivered or is in-flight elsewhere, so this is a no-op.
  const [claimed] = await db
    .update(billingOrder)
    .set({ revenueState: "processing", updatedAt: new Date() })
    .where(and(eq(billingOrder.polarOrderId, orderId), eq(billingOrder.revenueState, "pending")))
    .returning();

  if (!claimed) return;

  // Free / 100%-discount orders emit no event but still complete the ledger.
  if (claimed.amountMinor === 0) {
    await db
      .update(billingOrder)
      .set({ revenueState: "completed", revenueTrackedAt: null, updatedAt: new Date() })
      .where(eq(billingOrder.polarOrderId, orderId));
    return;
  }

  try {
    const result = await trackRevenue(claimed.amountMinor, {
      profileId: claimed.profileId,
      orderId: claimed.polarOrderId,
      productId: claimed.productId,
      subscriptionId: claimed.subscriptionId,
      tier: claimed.tier,
      billingReason: claimed.billingReason,
      currency: claimed.currency,
      totalAmountMinor: claimed.totalAmountMinor,
      taxAmountMinor: claimed.taxAmountMinor,
      timestamp: claimed.paidAt,
    });

    if (result === "sent") {
      await db
        .update(billingOrder)
        .set({ revenueState: "completed", revenueTrackedAt: new Date(), updatedAt: new Date() })
        .where(eq(billingOrder.polarOrderId, orderId));
      return;
    }

    // Deliberate deviation from Tailmux's terminal "skipped": leave the row
    // retryable so a later backfill can redeliver once creds exist.
    await db
      .update(billingOrder)
      .set({ revenueState: "pending", updatedAt: new Date() })
      .where(eq(billingOrder.polarOrderId, orderId));
    console.warn(
      `[billing analytics] revenue delivery skipped for order ${orderId} — OpenPanel not configured; left pending for retry.`,
    );
  } catch (error) {
    await db
      .update(billingOrder)
      .set({ revenueState: "pending", updatedAt: new Date() })
      .where(eq(billingOrder.polarOrderId, orderId));
    throw error;
  }
};

export const deliverOrderRefund = async (orderId: string) => {
  const [claimed] = await db
    .update(billingOrder)
    .set({ refundAnalyticsState: "processing", updatedAt: new Date() })
    .where(
      and(eq(billingOrder.polarOrderId, orderId), eq(billingOrder.refundAnalyticsState, "pending")),
    )
    .returning();

  if (!claimed) return;

  const deltaMinor = claimed.refundedAmountMinor - claimed.refundTrackedAmountMinor;

  // Nothing new to report: mark completed and sync the tracked amount so the
  // columns don't drift apart.
  if (deltaMinor <= 0 || !claimed.refundedAt) {
    await db
      .update(billingOrder)
      .set({
        refundAnalyticsState: "completed",
        refundTrackedAmountMinor: claimed.refundedAmountMinor,
        updatedAt: new Date(),
      })
      .where(eq(billingOrder.polarOrderId, orderId));
    return;
  }

  try {
    const result = await trackRefund(deltaMinor, {
      profileId: claimed.profileId,
      orderId: claimed.polarOrderId,
      productId: claimed.productId,
      subscriptionId: claimed.subscriptionId,
      tier: claimed.tier,
      billingReason: claimed.billingReason,
      currency: claimed.currency,
      totalAmountMinor: claimed.totalAmountMinor,
      taxAmountMinor: claimed.taxAmountMinor,
      timestamp: claimed.refundedAt,
    });

    if (result === "sent") {
      await db
        .update(billingOrder)
        .set({
          refundAnalyticsState: "completed",
          refundTrackedAmountMinor: claimed.refundedAmountMinor,
          refundTrackedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(billingOrder.polarOrderId, orderId));
      return;
    }

    // Skipped: do NOT touch refundTrackedAmountMinor so the delta recomputes on
    // a later retry once OpenPanel is configured.
    await db
      .update(billingOrder)
      .set({ refundAnalyticsState: "pending", updatedAt: new Date() })
      .where(eq(billingOrder.polarOrderId, orderId));
    console.warn(
      `[billing analytics] refund delivery skipped for order ${orderId} — OpenPanel not configured; left pending for retry.`,
    );
  } catch (error) {
    // Reset to pending without touching refundTrackedAmountMinor; the delta
    // recomputes on retry.
    await db
      .update(billingOrder)
      .set({ refundAnalyticsState: "pending", updatedAt: new Date() })
      .where(eq(billingOrder.polarOrderId, orderId));
    throw error;
  }
};

export const deliverAnalyticsBestEffort = async (
  source: "order.paid.revenue" | "order.refunded.refund",
  orderId: string,
  deliver: (orderId: string) => Promise<void>,
) => {
  // Analytics must never fail the Polar webhook; the ledger already reset itself
  // to pending so a retry/backfill can redeliver.
  try {
    await deliver(orderId);
  } catch (error) {
    console.warn(`[billing analytics] ${source} delivery failed for order ${orderId}`, error);
  }
};
