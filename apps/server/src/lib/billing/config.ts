import { env } from "@/env";

/**
 * Subscription tier configuration - single source of truth
 * All limits defined here for easy adjustment
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    slug: "free",
    productId: env.POLAR_PRODUCT_FREE || "",
    name: "Free",
    price: 0,

    // Limits
    maxMembers: 1, // Owner only
    storageLimit: 104_857_600, // 100 MB in bytes
    modelCountLimit: 20, // 20 models

    // Features for display
    features: [
      "1 user (you)",
      "100 MB storage",
      "20 models",
      "Community support",
    ],
  },
  basic: {
    slug: "basic",
    productId: env.POLAR_PRODUCT_BASIC || "",
    name: "Basic",
    price: 4.99,

    // Limits
    maxMembers: 5, // Owner + 4 invited
    storageLimit: 5_368_709_120, // 5 GB in bytes
    modelCountLimit: 100, // 100 models

    // Features for display
    features: [
      "Up to 5 team members",
      "5 GB storage",
      "100 models",
      "Priority email support",
      "Advanced features",
    ],
  },
  pro: {
    slug: "pro",
    productId: env.POLAR_PRODUCT_PRO || "",
    name: "Pro",
    price: 12.99,

    // Limits
    maxMembers: 10, // Owner + 9 invited
    storageLimit: 21_474_836_480, // 20 GB in bytes
    modelCountLimit: 1000, // 1000 models

    // Features for display
    features: [
      "Up to 10 team members",
      "20 GB storage",
      "1,000 models",
      "Premium support",
      "All features",
      "API access",
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
 * Products array for Polar checkout configuration
 * Filters out products without IDs (not configured yet)
 */
export const POLAR_PRODUCTS_CONFIG = Object.entries(SUBSCRIPTION_TIERS)
  .filter(([_, config]) => config.productId)
  .map(([_, config]) => ({
    productId: config.productId,
    slug: config.slug,
  }));
