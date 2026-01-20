import { createHmac } from "node:crypto";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { env } from "@/lib/env";
import type { MemberRole, SubscriptionTier } from "./types";

export type OpenPanelProfile = {
  profileId: string;
  properties: Record<string, unknown>;
};

/**
 * Organization data needed for OpenPanel profile context
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
 * Build an OpenPanel profile from authenticated context and organization data
 *
 * Privacy note: Email is hashed before sending to avoid raw PII in analytics.
 */
export function buildOpenPanelProfile(
  context: AuthenticatedContext,
  org?: OrganizationData | null,
): OpenPanelProfile {
  const user = context.session.user;

  return {
    profileId: context.userId,
    properties: {
      // User properties
      createdAt: user.createdAt?.toISOString(),
      emailHash: user.email ? hashEmail(user.email) : undefined,
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
  };
}

/**
 * Hash email for privacy using HMAC-SHA256
 */
function hashEmail(email: string): string {
  const secret = env.OPENPANEL_CLIENT_SECRET;
  return createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
}
