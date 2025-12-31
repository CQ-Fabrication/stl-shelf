import { env } from '@/lib/env'

/**
 * Subscription tier configuration - single source of truth
 * All limits defined here for easy adjustment
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    slug: 'free',
    productId: env.POLAR_PRODUCT_FREE || '',
    name: 'Free',
    price: 0,
    maxMembers: 1,
    storageLimit: 209_715_200, // 200 MB in bytes
    modelCountLimit: 10,
    features: [
      '1 user (you)',
      '200 MB storage',
      '10 models',
      '3D preview',
      'Community support',
    ],
  },
  basic: {
    slug: 'basic',
    productId: env.POLAR_PRODUCT_BASIC || '',
    name: 'Basic',
    price: 4.99,
    maxMembers: 3,
    storageLimit: 10_737_418_240, // 10 GB in bytes
    modelCountLimit: 200,
    features: [
      'Up to 3 team members',
      '10 GB storage',
      '200 models',
      'Version history',
      'Priority email support',
    ],
  },
  pro: {
    slug: 'pro',
    productId: env.POLAR_PRODUCT_PRO || '',
    name: 'Pro',
    price: 12.99,
    maxMembers: 10,
    storageLimit: 53_687_091_200, // 50 GB in bytes
    modelCountLimit: -1, // Unlimited (-1 = no limit)
    features: [
      'Up to 10 team members',
      '50 GB storage',
      'Unlimited models',
      'API access',
      'Premium support',
      'All features',
    ],
  },
} as const satisfies Record<
  string,
  {
    slug: string
    productId: string
    name: string
    price: number
    maxMembers: number
    storageLimit: number
    modelCountLimit: number
    features: string[]
  }
>

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

export const getTierConfig = (tier: SubscriptionTier) => {
  return SUBSCRIPTION_TIERS[tier]
}

export const isUnlimited = (limit: number) => limit === -1

/**
 * Products array for Polar checkout configuration
 * Filters out products without IDs (not configured yet)
 */
export const POLAR_PRODUCTS_CONFIG = Object.entries(SUBSCRIPTION_TIERS)
  .filter(([_, config]) => config.productId)
  .map(([_, config]) => ({
    productId: config.productId,
    slug: config.slug,
  }))
