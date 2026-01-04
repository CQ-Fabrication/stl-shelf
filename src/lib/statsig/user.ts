import { createHmac } from "node:crypto";
import type { StatsigUser } from "statsig-node";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { env } from "@/lib/env";
import type { MemberRole, SubscriptionTier, StatsigUserContext } from "./types";

/**
 * Organization data needed for Statsig user context
 */
export type OrganizationData = {
  id: string;
  name: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  currentStorage: number | null;
  currentModelCount: number | null;
  currentMemberCount: number | null;
};

/**
 * Build a Statsig user from authenticated context and organization data
 *
 * GDPR/Privacy Note: IP addresses are included for analytics segmentation
 * (geo, device type). Statsig's data retention and processing comply with
 * GDPR. For stricter privacy requirements, set ipAddress to undefined.
 * Email is hashed with HMAC-SHA256 before sending to protect PII.
 */
export function buildStatsigUser(
  context: AuthenticatedContext,
  org?: OrganizationData | null,
): StatsigUser {
  const user = context.session.user;

  return {
    userID: context.userId,
    email: hashEmail(user.email),
    ip: context.ipAddress ?? undefined,
    custom: {
      // User properties
      createdAt: user.createdAt?.toISOString(),
      emailVerified: user.emailVerified,

      // Organization properties
      organizationId: context.organizationId,
      organizationName: org?.name,
      memberRole: context.memberRole as MemberRole,

      // Subscription properties
      subscriptionTier: (org?.subscriptionTier as SubscriptionTier) ?? "free",
      subscriptionStatus: org?.subscriptionStatus ?? "none",

      // Usage metrics
      modelsCount: org?.currentModelCount ?? 0,
      storageUsedBytes: org?.currentStorage ?? 0,
      memberCount: org?.currentMemberCount ?? 1,
    },
    customIDs: {
      organizationId: context.organizationId,
    },
  };
}

/**
 * Build a Statsig user for anonymous (unauthenticated) users
 */
export function buildAnonymousStatsigUser(
  anonymousId: string,
  ipAddress?: string,
): StatsigUser {
  return {
    userID: anonymousId,
    ip: ipAddress,
    custom: {
      isAnonymous: true,
    },
  };
}

/**
 * Build Statsig user from minimal context (for lightweight tracking)
 */
export function buildMinimalStatsigUser(context: StatsigUserContext): StatsigUser {
  return {
    userID: context.userId,
    email: context.email ? hashEmail(context.email) : undefined,
    ip: context.ipAddress,
    custom: {
      createdAt: context.createdAt?.toISOString(),
      organizationId: context.organizationId,
      organizationName: context.organizationName,
      memberRole: context.memberRole,
      subscriptionTier: context.subscriptionTier ?? "free",
      subscriptionStatus: context.subscriptionStatus,
      modelsCount: context.modelsCount,
      storageUsedBytes: context.storageUsedBytes,
      memberCount: context.memberCount,
      hasCompletedOnboarding: context.hasCompletedOnboarding,
    },
    customIDs: context.organizationId
      ? { organizationId: context.organizationId }
      : undefined,
  };
}

/**
 * Hash email for privacy (send hashed version to Statsig)
 * Uses HMAC-SHA256 with server secret as key to prevent rainbow table attacks
 * Same email always produces the same hash for analytics consistency
 */
function hashEmail(email: string): string {
  const secret = env.STATSIG_SERVER_SECRET ?? env.BETTER_AUTH_SECRET;
  return createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

/**
 * Generate a stable anonymous ID
 * Should be stored in a cookie for consistency across requests
 */
export function generateAnonymousId(): string {
  return `anon_${crypto.randomUUID()}`;
}

/**
 * Cookie name for storing anonymous ID
 */
export const ANONYMOUS_ID_COOKIE = "statsig_anon_id";
