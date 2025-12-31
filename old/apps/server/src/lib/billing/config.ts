import { env } from "@/env";

/**
 * Subscription tier configuration - single source of truth
 * All limits defined here for easy adjustment
 *
 * Pricing Analysis: /docs/PRICING_COST_ANALYSIS.md
 * Last updated: December 2025
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    slug: "free",
    productId: env.POLAR_PRODUCT_FREE || "",
    name: "Free",
    price: 0,

    // Limits
    maxMembers: 1, // Owner only
    storageLimit: 209_715_200, // 200 MB in bytes
    modelCountLimit: 10, // 10 models - tight to encourage upgrade

    // Features for display
    features: [
      "1 user (you)",
      "200 MB storage",
      "10 models",
      "3D preview",
      "Community support",
    ],
  },
  basic: {
    slug: "basic",
    productId: env.POLAR_PRODUCT_BASIC || "",
    name: "Basic",
    price: 4.99,

    // Limits
    maxMembers: 3, // Owner + 2 invited
    storageLimit: 10_737_418_240, // 10 GB in bytes
    modelCountLimit: 200, // 200 models

    // Features for display
    features: [
      "Up to 3 team members",
      "10 GB storage",
      "200 models",
      "Version history",
      "Priority email support",
    ],
  },
  pro: {
    slug: "pro",
    productId: env.POLAR_PRODUCT_PRO || "",
    name: "Pro",
    price: 12.99,

    // Limits
    maxMembers: 10, // Owner + 9 invited
    storageLimit: 53_687_091_200, // 50 GB in bytes
    modelCountLimit: -1, // Unlimited (-1 = no limit)

    // Features for display
    features: [
      "Up to 10 team members",
      "50 GB storage",
      "Unlimited models",
      "API access",
      "Premium support",
      "All features",
    ],
  },
} as const satisfies Record<
  string,
  {
    slug: string;
    productId: string;
    name: string;
    price: number;
    maxMembers: number;
    storageLimit: number;
    modelCountLimit: number;
    features: string[];
  }
>;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Get tier configuration by name
 */
export const getTierConfig = (tier: SubscriptionTier) => {
  return SUBSCRIPTION_TIERS[tier];
};

/**
 * Check if a limit is unlimited
 */
export const isUnlimited = (limit: number) => limit === -1;

/**
 * Products array for Polar checkout configuration
 * Filters out products without IDs (not configured yet)
 */
export const POLAR_PRODUCTS_CONFIG = Object.entries(SUBSCRIPTION_TIERS)
  .filter(([_, config]) => config.productId)
  .map(([_, config]) => ({
    productId: config.productId,
    slug: config.slug,
  }));
