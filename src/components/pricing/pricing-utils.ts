import {
  SUBSCRIPTION_TIERS,
  getTierPrice,
  type BillingInterval,
  type SubscriptionTier,
} from "@/lib/billing/config";
import type { PublicPricingResponse } from "@/server/functions/pricing";

export type TierSlug = SubscriptionTier;

export type PricingTier = {
  slug: TierSlug;
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "popular";
  features: string[];
  cta: string;
  highlighted?: boolean;
};

type TierUiConfig = {
  name: string;
  description: string;
  badge?: string;
  cta: string;
  badgeVariant?: "default" | "popular";
  highlighted?: boolean;
};

const tierUiConfig: Record<TierSlug, TierUiConfig> = {
  free: {
    name: "Free",
    description: "A tiny starter library to try STL Shelf",
    badge: "Free Forever",
    cta: "Get Started",
  },
  basic: {
    name: "Basic",
    description: "For focused solo creators",
    badge: "Most Popular",
    badgeVariant: "popular",
    highlighted: true,
    cta: "Choose Basic",
  },
  pro: {
    name: "Pro",
    description: "For teams and production workflows",
    badge: "Team Plan",
    cta: "Upgrade to Pro",
  },
};

const tierOrder: TierSlug[] = ["free", "basic", "pro"];

export const defaultVisibleSlugs: TierSlug[] = ["free", "basic", "pro"];

const formatPeriod = (interval: BillingInterval | null, intervalCount: number | null) => {
  if (!interval) return "forever";
  if (intervalCount && intervalCount > 1) {
    return `/${intervalCount} ${interval}s`;
  }
  return `/${interval}`;
};

const formatPrice = (amountInCents: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amountInCents % 100 === 0 ? 0 : 2,
  }).format(amountInCents / 100);
};

const buildFallbackTier = (slug: TierSlug, interval: BillingInterval): PricingTier => {
  const config = SUBSCRIPTION_TIERS[slug];
  const ui = tierUiConfig[slug];
  const priceValue = getTierPrice(slug, interval);
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: priceValue % 1 === 0 ? 0 : 2,
  }).format(priceValue);

  return {
    slug,
    name: ui.name,
    price,
    period: priceValue === 0 ? "forever" : interval === "year" ? "/year" : "/month",
    description: ui.description,
    badge: ui.badge,
    badgeVariant: ui.badgeVariant,
    highlighted: ui.highlighted,
    features: config.features,
    cta: ui.cta,
  };
};

const fallbackBySlug: Record<TierSlug, PricingTier> = tierOrder.reduce(
  (acc, slug) => {
    acc[slug] = buildFallbackTier(slug, "month");
    return acc;
  },
  {} as Record<TierSlug, PricingTier>,
);

const buildPricingTiersFromPricing = (
  pricing: PublicPricingResponse,
  interval: BillingInterval,
): PricingTier[] => {
  return pricing.tiers.map((tier) => {
    const slug = tier.slug as TierSlug;
    const ui = tierUiConfig[slug] ?? tierUiConfig.free;
    const fallbackTier = fallbackBySlug[slug] ?? fallbackBySlug.free;
    const priceData = tier.prices[interval];
    const priceAmount = priceData?.amount ?? 0;
    const currency = priceData?.currency || "USD";
    const price = formatPrice(priceAmount, currency);

    return {
      slug,
      name: ui.name,
      price,
      period: formatPeriod(priceData?.interval ?? null, priceData?.intervalCount ?? null),
      description: ui.description,
      badge: ui.badge,
      badgeVariant: ui.badgeVariant,
      highlighted: ui.highlighted,
      features: tier.benefits.length ? tier.benefits : fallbackTier.features,
      cta: ui.cta,
    } satisfies PricingTier;
  });
};

export const buildPricingTiers = (
  pricing: PublicPricingResponse | null | undefined,
  visibleSlugs: TierSlug[] = defaultVisibleSlugs,
  interval: BillingInterval = "month",
): PricingTier[] => {
  const allowed = new Set(visibleSlugs);
  const tiers = pricing?.tiers?.length
    ? buildPricingTiersFromPricing(pricing, interval)
    : tierOrder.map((slug) => buildFallbackTier(slug, interval));

  return tiers.filter((tier) => allowed.has(tier.slug));
};
