/**
 * Subscription tier configuration - single source of truth
 * All limits defined here for easy adjustment
 *
 * NOTE: This file is client-safe. Product IDs are resolved server-side only.
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    slug: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    maxMembers: 1,
    storageLimit: 536_870_912, // 0.5 GB in bytes
    modelCountLimit: 10,
    features: [
      "1 seat",
      "0.5 GB storage",
      "10 models",
      "3D preview",
      "Search & tags",
      "Basic versioning",
    ],
  },
  basic: {
    slug: "basic",
    name: "Basic",
    priceMonthly: 10.99,
    priceYearly: 118.99,
    maxMembers: 1,
    storageLimit: 26_843_545_600, // 25 GB in bytes
    modelCountLimit: 300,
    features: [
      "1 seat",
      "25 GB storage",
      "300 models",
      "Full search, tags & versioning",
      "ZIP downloads",
      "PrintPulse connection (soon)",
    ],
  },
  pro: {
    slug: "pro",
    name: "Pro",
    priceMonthly: 35.99,
    priceYearly: 388.99,
    maxMembers: 5,
    storageLimit: 214_748_364_800, // 200 GB in bytes
    modelCountLimit: -1, // Unlimited (-1 = no limit)
    features: [
      "Up to 5 seats",
      "200 GB storage",
      "Unlimited models",
      "Team collaboration & permissions",
      "Activity & audit basics",
      "Priority support",
      "PrintPulse connection (soon)",
    ],
  },
} as const satisfies Record<
  string,
  {
    slug: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    maxMembers: number;
    storageLimit: number;
    modelCountLimit: number;
    features: string[];
  }
>;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export const SUBSCRIPTION_TIER_ORDER = ["free", "basic", "pro"] as const;

export const normalizeSubscriptionTier = (tier?: string | null): SubscriptionTier => {
  if (!tier) return "free";
  const normalized = tier.toLowerCase();
  return SUBSCRIPTION_TIER_ORDER.includes(normalized as SubscriptionTier)
    ? (normalized as SubscriptionTier)
    : "free";
};

export const isTierAtLeast = (
  currentTier: string | null | undefined,
  requiredTier: SubscriptionTier,
) => {
  const normalizedCurrentTier = normalizeSubscriptionTier(currentTier);
  return (
    SUBSCRIPTION_TIER_ORDER.indexOf(normalizedCurrentTier) >=
    SUBSCRIPTION_TIER_ORDER.indexOf(requiredTier)
  );
};

export const getTierConfig = (tier: SubscriptionTier) => {
  return SUBSCRIPTION_TIERS[tier];
};

export const isUnlimited = (limit: number) => limit === -1;

export const BILLING_INTERVALS = ["month", "year"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_PRODUCT_SLUGS = {
  free: { month: "free", year: "free" },
  basic: { month: "basic_month", year: "basic_year" },
  pro: { month: "pro_month", year: "pro_year" },
} as const;

export const SUBSCRIPTION_PRODUCT_SLUG_OPTIONS = [
  SUBSCRIPTION_PRODUCT_SLUGS.free.month,
  SUBSCRIPTION_PRODUCT_SLUGS.basic.month,
  SUBSCRIPTION_PRODUCT_SLUGS.basic.year,
  SUBSCRIPTION_PRODUCT_SLUGS.pro.month,
  SUBSCRIPTION_PRODUCT_SLUGS.pro.year,
] as const;

export type SubscriptionProductSlug = (typeof SUBSCRIPTION_PRODUCT_SLUG_OPTIONS)[number];

export const getProductSlugForTier = (tier: SubscriptionTier, interval: BillingInterval) => {
  return SUBSCRIPTION_PRODUCT_SLUGS[tier][interval];
};

export const getTierFromProductSlug = (productSlug: SubscriptionProductSlug): SubscriptionTier => {
  if (productSlug === "free") return "free";
  if (productSlug.startsWith("basic")) return "basic";
  if (productSlug.startsWith("pro")) return "pro";
  return "free";
};

export const getTierPrice = (tier: SubscriptionTier, interval: BillingInterval) => {
  const config = SUBSCRIPTION_TIERS[tier];
  return interval === "year" ? config.priceYearly : config.priceMonthly;
};
