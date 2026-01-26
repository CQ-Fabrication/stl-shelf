import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_TIERS } from "@/lib/billing/config";
import { cn } from "@/lib/utils";
import type { PublicPricingResponse } from "@/server/functions/pricing";

export type TierSlug = "free" | "basic" | "pro";

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
    description: "Perfect for getting started",
    badge: "Free Forever",
    cta: "Get Started",
  },
  basic: {
    name: "Basic",
    description: "For growing collections",
    badge: "Most Popular",
    badgeVariant: "popular" as const,
    cta: "Choose Basic",
  },
  pro: {
    name: "Pro",
    description: "For serious collections and teams",
    badge: "All Features",
    badgeVariant: "popular" as const,
    highlighted: true,
    cta: "Upgrade to Pro",
  },
};

const tierOrder: TierSlug[] = ["free", "basic", "pro"];
const defaultVisibleSlugs: TierSlug[] = ["free", "pro"];

const formatPeriod = (interval: string | null, intervalCount: number | null) => {
  if (!interval) return "forever";
  if (intervalCount && intervalCount > 1) {
    return `/${intervalCount} ${interval}s`;
  }
  return `/${interval}`;
};

const fallbackBySlug: Record<TierSlug, PricingTier> = tierOrder.reduce(
  (acc, slug) => {
    const config = SUBSCRIPTION_TIERS[slug];
    const ui = tierUiConfig[slug];
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: config.price % 1 === 0 ? 0 : 2,
    }).format(config.price);

    acc[slug] = {
      slug,
      name: ui.name,
      price,
      period: config.price === 0 ? "forever" : "/month",
      description: ui.description,
      badge: ui.badge,
      badgeVariant: ui.badgeVariant,
      highlighted: ui.highlighted,
      features: config.features,
      cta: ui.cta,
    };

    return acc;
  },
  {} as Record<TierSlug, PricingTier>,
);

const buildPricingTiersFromPricing = (pricing: PublicPricingResponse): PricingTier[] => {
  return pricing.tiers.map((tier) => {
    const slug = tier.slug as TierSlug;
    const ui = tierUiConfig[slug] ?? tierUiConfig.free;
    const fallbackTier = fallbackBySlug[slug] ?? fallbackBySlug.free;
    const amount = tier.priceAmount ?? 0;
    const currency = tier.priceCurrency || "USD";
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100);

    return {
      slug,
      name: ui.name,
      price,
      period: formatPeriod(tier.interval, tier.intervalCount),
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
  pricing?: PublicPricingResponse | null,
  visibleSlugs: TierSlug[] = defaultVisibleSlugs,
): PricingTier[] => {
  const allowed = new Set(visibleSlugs);
  const tiers = pricing?.tiers?.length
    ? buildPricingTiersFromPricing(pricing)
    : tierOrder.map((slug) => fallbackBySlug[slug]);

  return tiers.filter((tier) => allowed.has(tier.slug));
};

type PricingCardsProps = {
  pricing?: PublicPricingResponse | null;
  visibleSlugs?: TierSlug[];
  renderCta?: (tier: PricingTier) => React.ReactNode;
  className?: string;
};

function PricingCard({
  tier,
  renderCta,
}: {
  tier: PricingTier;
  renderCta?: (tier: PricingTier) => React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm transition-colors duration-300",
        tier.highlighted
          ? "border-brand/60 bg-brand/5 shadow-brand"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold">{tier.name}</h3>
        {tier.badge && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              tier.badgeVariant === "popular"
                ? "border-brand/20 bg-brand/10 text-brand"
                : "border-border/60 bg-muted/60 text-muted-foreground",
            )}
          >
            {tier.badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-muted-foreground text-sm">{tier.description}</p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className={cn("text-4xl font-semibold", tier.highlighted && "text-brand")}>
          {tier.price}
        </span>
        <span className="text-muted-foreground text-sm">{tier.period}</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li className="flex items-start gap-2 text-sm" key={feature}>
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                tier.highlighted ? "text-brand" : "text-muted-foreground",
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {renderCta ? (
          renderCta(tier)
        ) : (
          <Button
            className={cn(
              "w-full",
              tier.highlighted && "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
            variant={tier.highlighted ? "default" : "outline"}
            asChild
          >
            <Link to="/signup">{tier.cta}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function PricingCards({
  pricing,
  visibleSlugs = defaultVisibleSlugs,
  renderCta,
  className,
}: PricingCardsProps) {
  const tiers = buildPricingTiers(pricing, visibleSlugs);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto items-stretch",
        className,
      )}
    >
      {tiers.map((tier) => (
        <PricingCard key={tier.slug} tier={tier} renderCta={renderCta} />
      ))}
    </div>
  );
}
