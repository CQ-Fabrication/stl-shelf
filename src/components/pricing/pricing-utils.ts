import {
  SUBSCRIPTION_TIERS,
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

export type PricingDisplay = {
  tiers: PricingTier[];
  /** true = one or more visible paid tiers have no Polar price; hide them and show an error block */
  paidUnavailable: boolean;
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

// The Free tier is always displayable without Polar: it costs $0 by definition.
const buildFreeCard = (): PricingTier => {
  const ui = tierUiConfig.free;
  return {
    slug: "free",
    name: ui.name,
    price: "$0",
    period: "forever",
    description: ui.description,
    badge: ui.badge,
    badgeVariant: ui.badgeVariant,
    highlighted: ui.highlighted,
    features: SUBSCRIPTION_TIERS.free.features,
    cta: ui.cta,
  };
};

/**
 * Build the tier cards to display. Paid tier prices must come from Polar
 * (fresh or last-known-good, resolved server-side): if any visible paid tier
 * has no price for the selected interval, all paid cards are hidden and
 * `paidUnavailable` tells the caller to render one error block instead.
 */
export const buildPricingDisplay = (
  pricing: PublicPricingResponse | null | undefined,
  visibleSlugs: TierSlug[] = defaultVisibleSlugs,
  interval: BillingInterval = "month",
): PricingDisplay => {
  const allowed = new Set(visibleSlugs);
  const freeTiers = allowed.has("free") ? [buildFreeCard()] : [];
  const visiblePaidSlugs = (["basic", "pro"] as const).filter((slug) => allowed.has(slug));

  if (visiblePaidSlugs.length === 0) {
    return { tiers: freeTiers, paidUnavailable: false };
  }

  if (!pricing?.tiers?.length) {
    return { tiers: freeTiers, paidUnavailable: true };
  }

  const paidCards: PricingTier[] = [];

  for (const slug of visiblePaidSlugs) {
    const tier = pricing.tiers.find((entry) => entry.slug === slug);
    const priceData = tier?.prices[interval];

    if (!tier || !priceData) {
      return { tiers: freeTiers, paidUnavailable: true };
    }

    const ui = tierUiConfig[slug];
    paidCards.push({
      slug,
      name: ui.name,
      price: formatPrice(priceData.amount, priceData.currency || "USD"),
      period: formatPeriod(priceData.interval, priceData.intervalCount),
      description: ui.description,
      badge: ui.badge,
      badgeVariant: ui.badgeVariant,
      highlighted: ui.highlighted,
      features: tier.benefits.length ? tier.benefits : SUBSCRIPTION_TIERS[slug].features,
      cta: ui.cta,
    });
  }

  return { tiers: [...freeTiers, ...paidCards], paidUnavailable: false };
};
