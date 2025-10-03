import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { organization } from "@/db/schema/better-auth-schema";
import type { SubscriptionTier } from "@/lib/billing/config";
import { getTierConfig } from "@/lib/billing/config";
import { protectedProcedure } from "@/lib/orpc";
import { polarService } from "@/services/billing/polar.service";

export const billingRouter = {
  /**
   * Get current subscription info
   */
  getSubscription: protectedProcedure.handler(async ({ context }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = org.subscriptionTier as SubscriptionTier;
    const tierConfig = getTierConfig(tier);

    return {
      tier,
      status: org.subscriptionStatus,
      isOwner: org.ownerId === context.session.user.id,

      // Limits
      storageLimit: org.storageLimit,
      modelCountLimit: org.modelCountLimit,
      memberLimit: org.memberLimit,

      // Current usage
      currentStorage: org.currentStorage,
      currentModelCount: org.currentModelCount,
      currentMemberCount: org.currentMemberCount,

      // Tier details
      tierConfig,
    };
  }),

  /**
   * Get usage statistics
   */
  getUsageStats: protectedProcedure.handler(async ({ context }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      storage: {
        used: org.currentStorage,
        limit: org.storageLimit,
        percentage: Math.min(
          (org.currentStorage / org.storageLimit) * 100,
          100
        ),
      },
      models: {
        used: org.currentModelCount,
        limit: org.modelCountLimit,
        percentage: Math.min(
          (org.currentModelCount / org.modelCountLimit) * 100,
          100
        ),
      },
      members: {
        used: org.currentMemberCount,
        limit: org.memberLimit,
        percentage: Math.min(
          (org.currentMemberCount / org.memberLimit) * 100,
          100
        ),
      },
    };
  }),

  /**
   * Create checkout session (owner only)
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        productSlug: z.enum(["free", "basic", "pro"]),
      })
    )
    .handler(async ({ input, context }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, context.organizationId),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      // Only owner can manage billing
      if (org.ownerId !== context.session.user.id) {
        throw new Error("Only organization owner can manage billing");
      }

      // Create Polar customer if doesn't exist
      let customerId = org.polarCustomerId;
      if (!customerId) {
        const customer = await polarService.createCustomer(
          org.id,
          org.name,
          context.session.user.email
        );
        customerId = customer.id;

        await db
          .update(organization)
          .set({ polarCustomerId: customerId })
          .where(eq(organization.id, org.id));
      }

      // Create checkout session
      const checkout = await polarService.createCheckoutSession(
        customerId,
        input.productSlug
      );

      return { checkoutUrl: checkout.url };
    }),

  /**
   * Get customer portal URL (owner only)
   */
  getPortalUrl: protectedProcedure.handler(async ({ context }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Only owner can access billing portal
    if (org.ownerId !== context.session.user.id) {
      throw new Error("Only organization owner can access billing portal");
    }

    if (!org.polarCustomerId) {
      throw new Error("No subscription found");
    }

    // Return Better Auth portal URL
    return {
      portalUrl: `/api/auth/portal?customerId=${org.polarCustomerId}`,
    };
  }),
};
