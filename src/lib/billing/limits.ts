import type { SubscriptionTier } from './config'
import { getTierConfig, isUnlimited } from './config'

/**
 * Limit enforcement utilities
 * Throw Error when limits exceeded
 */
export const enforceLimits = {
  checkMemberLimit(currentCount: number, tier: SubscriptionTier) {
    const config = getTierConfig(tier)

    if (currentCount >= config.maxMembers) {
      throw new Error(
        `Member limit reached. Your ${config.name} plan allows ${config.maxMembers} member(s). Upgrade to add more team members.`
      )
    }
  },

  checkModelLimit(currentCount: number, tier: SubscriptionTier) {
    const config = getTierConfig(tier)

    // -1 means unlimited - skip check
    if (isUnlimited(config.modelCountLimit)) return

    if (currentCount >= config.modelCountLimit) {
      throw new Error(
        `Model limit reached. Your ${config.name} plan allows ${config.modelCountLimit} model(s). Upgrade to add more models.`
      )
    }
  },

  checkStorageLimit(
    currentUsage: number,
    additionalSize: number,
    tier: SubscriptionTier
  ) {
    const config = getTierConfig(tier)
    const totalAfterUpload = currentUsage + additionalSize

    if (totalAfterUpload > config.storageLimit) {
      const limitMB = (config.storageLimit / 1_048_576).toFixed(0)
      throw new Error(
        `Storage limit exceeded. Your ${config.name} plan allows ${limitMB} MB. Upgrade for more storage.`
      )
    }
  },
}

/**
 * Validation utilities (non-throwing)
 */
export const validateLimits = {
  canAddMember(currentCount: number, tier: SubscriptionTier): boolean {
    const config = getTierConfig(tier)
    return currentCount < config.maxMembers
  },

  canAddModel(currentCount: number, tier: SubscriptionTier): boolean {
    const config = getTierConfig(tier)
    // -1 means unlimited - always allow
    if (isUnlimited(config.modelCountLimit)) return true
    return currentCount < config.modelCountLimit
  },

  hasStorageAvailable(
    currentUsage: number,
    additionalSize: number,
    tier: SubscriptionTier
  ): boolean {
    const config = getTierConfig(tier)
    return currentUsage + additionalSize <= config.storageLimit
  },
}
