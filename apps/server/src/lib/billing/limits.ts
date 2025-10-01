import { ORPCError } from "@orpc/server";
import type { SubscriptionTier } from "./config";
import { getTierConfig } from "./config";

/**
 * Limit enforcement utilities
 * Throw ORPCError when limits exceeded
 */
export const enforceLimits = {
  /**
   * Check if organization can add a new member
   */
  checkMemberLimit(currentCount: number, tier: SubscriptionTier) {
    const config = getTierConfig(tier);

    if (currentCount >= config.maxMembers) {
      throw new ORPCError("FORBIDDEN", {
        message: `Member limit reached. Your ${config.name} plan allows ${config.maxMembers} member(s). Upgrade to add more team members.`,
      });
    }
  },

  /**
   * Check if organization can add a new model
   */
  checkModelLimit(currentCount: number, tier: SubscriptionTier) {
    const config = getTierConfig(tier);

    if (currentCount >= config.modelCountLimit) {
      throw new ORPCError("FORBIDDEN", {
        message: `Model limit reached. Your ${config.name} plan allows ${config.modelCountLimit} model(s). Upgrade to add more models.`,
      });
    }
  },

  /**
   * Check if organization has storage available for upload
   */
  checkStorageLimit(
    currentUsage: number,
    additionalSize: number,
    tier: SubscriptionTier
  ) {
    const config = getTierConfig(tier);
    const totalAfterUpload = currentUsage + additionalSize;

    if (totalAfterUpload > config.storageLimit) {
      const limitMB = (config.storageLimit / 1_048_576).toFixed(0);
      throw new ORPCError("FORBIDDEN", {
        message: `Storage limit exceeded. Your ${config.name} plan allows ${limitMB} MB. Upgrade for more storage.`,
      });
    }
  },
};

/**
 * Validation utilities (non-throwing)
 */
export const validateLimits = {
  canAddMember(currentCount: number, tier: SubscriptionTier): boolean {
    const config = getTierConfig(tier);
    return currentCount < config.maxMembers;
  },

  canAddModel(currentCount: number, tier: SubscriptionTier): boolean {
    const config = getTierConfig(tier);
    return currentCount < config.modelCountLimit;
  },

  hasStorageAvailable(
    currentUsage: number,
    additionalSize: number,
    tier: SubscriptionTier
  ): boolean {
    const config = getTierConfig(tier);
    return currentUsage + additionalSize <= config.storageLimit;
  },
};
