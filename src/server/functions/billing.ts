import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, count, eq, isNull, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema/auth";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import type { SubscriptionTier } from "@/lib/billing/config";
import { getTierConfig, isUnlimited } from "@/lib/billing/config";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { polarService } from "@/server/services/billing/polar.service";

const createCheckoutSchema = z.object({
  productSlug: z.enum(["free", "basic", "pro"]),
});

// Get current subscription info
export const getSubscription = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = (org.subscriptionTier as SubscriptionTier) ?? "free";
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
  });

// Get usage statistics
export const getUsageStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Query actual counts from the database for accuracy
    // IMPORTANT: Exclude soft-deleted models (deletedAt IS NULL)
    const [modelCountResult] = await db
      .select({ count: count() })
      .from(models)
      .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

    const [memberCountResult] = await db
      .select({ count: count() })
      .from(member)
      .where(eq(member.organizationId, context.organizationId));

    // Calculate total storage from all files across all versions of all models
    // IMPORTANT: Exclude soft-deleted models
    const [storageResult] = await db
      .select({ total: sum(modelFiles.size) })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
      .innerJoin(models, eq(modelVersions.modelId, models.id))
      .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

    // Get tier config for fallback limits
    const tier = (org.subscriptionTier as SubscriptionTier) ?? "free";
    const tierConfig = getTierConfig(tier);

    const currentStorage = Number(storageResult?.total ?? 0);
    const storageLimit = org.storageLimit ?? tierConfig.storageLimit;
    const currentModelCount = modelCountResult?.count ?? 0;
    const modelCountLimit = org.modelCountLimit ?? tierConfig.modelCountLimit;
    const currentMemberCount = memberCountResult?.count ?? 0;
    const memberLimit = org.memberLimit ?? tierConfig.maxMembers;

    return {
      storage: {
        used: currentStorage,
        limit: storageLimit,
        percentage: Math.min((currentStorage / storageLimit) * 100, 100),
      },
      models: {
        used: currentModelCount,
        limit: modelCountLimit,
        percentage: Math.min((currentModelCount / modelCountLimit) * 100, 100),
      },
      members: {
        used: currentMemberCount,
        limit: memberLimit,
        percentage: Math.min((currentMemberCount / memberLimit) * 100, 100),
      },
    };
  });

// Check upload limits before allowing upload (fresh data, no caching)
export const checkUploadLimits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = (org.subscriptionTier as SubscriptionTier) ?? "free";
    const tierConfig = getTierConfig(tier);

    // ALWAYS query actual counts from DB - never trust cached counters
    // IMPORTANT: Exclude soft-deleted models (deletedAt IS NULL)
    const [modelCountResult] = await db
      .select({ count: count() })
      .from(models)
      .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

    const [storageResult] = await db
      .select({ total: sum(modelFiles.size) })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
      .innerJoin(models, eq(modelVersions.modelId, models.id))
      .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

    const currentModelCount = modelCountResult?.count ?? 0;
    const currentStorage = Number(storageResult?.total ?? 0);
    const modelLimit = org.modelCountLimit ?? tierConfig.modelCountLimit;
    const storageLimit = org.storageLimit ?? tierConfig.storageLimit;

    const modelLimitIsUnlimited = isUnlimited(modelLimit);
    const modelBlocked = !modelLimitIsUnlimited && currentModelCount >= modelLimit;
    const storageBlocked = currentStorage >= storageLimit;

    return {
      tier,
      isOwner: org.ownerId === context.session.user.id,
      models: {
        current: currentModelCount,
        limit: modelLimit,
        isUnlimited: modelLimitIsUnlimited,
        blocked: modelBlocked,
      },
      storage: {
        current: currentStorage,
        limit: storageLimit,
        blocked: storageBlocked,
      },
      graceDeadline: org.graceDeadline?.toISOString() ?? null,
      blocked: modelBlocked || storageBlocked,
      blockReason: modelBlocked
        ? ("model_limit" as const)
        : storageBlocked
          ? ("storage_limit" as const)
          : null,
    };
  });

// Create checkout session (owner only)
export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createCheckoutSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof createCheckoutSchema>;
      context: AuthenticatedContext;
    }) => {
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
          context.session.user.email,
        );
        customerId = customer.id;

        await db
          .update(organization)
          .set({ polarCustomerId: customerId })
          .where(eq(organization.id, org.id));
      }

      // Create checkout session
      const checkout = await polarService.createCheckoutSession(customerId, data.productSlug);

      return { checkoutUrl: checkout.url };
    },
  );

// Get customer portal URL (owner only)
export const getPortalUrl = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
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
  });
