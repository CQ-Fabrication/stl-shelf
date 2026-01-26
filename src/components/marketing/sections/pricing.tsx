import { Check, Sparkles, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";
import type { PublicPricingResponse } from "@/server/functions/pricing";

type PricingTier = {
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

type PricingProps = {
  pricing?: PublicPricingResponse | null;
};

type TierUiConfig = {
  name: string;
  description: string;
  badge: string;
  cta: string;
  badgeVariant?: "default" | "popular";
  highlighted?: boolean;
};

const tierUiConfig: Record<"free" | "pro", TierUiConfig> = {
  free: {
    name: "Free",
    description: "Perfect for getting started",
    badge: "Free Forever",
    cta: "Get Started",
  },
  pro: {
    name: "Pro",
    description: "For serious collections and teams",
    badge: "Best Value",
    badgeVariant: "popular" as const,
    highlighted: true,
    cta: "Upgrade to Pro",
  },
};

const fallbackTiers: PricingTier[] = [
  {
    name: tierUiConfig.free.name,
    price: "€0",
    period: "forever",
    description: tierUiConfig.free.description,
    badge: tierUiConfig.free.badge,
    features: ["1 user", "200 MB storage", "10 models", "3D model preview"],
    cta: tierUiConfig.free.cta,
  },
  {
    name: tierUiConfig.pro.name,
    price: "€6.99",
    period: "/month",
    description: tierUiConfig.pro.description,
    badge: tierUiConfig.pro.badge,
    badgeVariant: tierUiConfig.pro.badgeVariant,
    highlighted: tierUiConfig.pro.highlighted,
    features: [
      "10 GB storage included",
      "Unlimited models",
      "Team access",
      "Version history",
      "Priority support",
      "Expandable storage",
    ],
    cta: tierUiConfig.pro.cta,
  },
];

const formatPeriod = (interval: string | null, intervalCount: number | null) => {
  if (!interval) return "forever";
  if (intervalCount && intervalCount > 1) {
    return `/${intervalCount} ${interval}s`;
  }
  return `/${interval}`;
};

const fallbackBySlug: Record<"free" | "pro", PricingTier> = {
  free: fallbackTiers[0]!,
  pro: fallbackTiers[1]!,
};

const buildPricingTiers = (pricing?: PublicPricingResponse | null): PricingTier[] => {
  if (!pricing?.tiers?.length) return fallbackTiers;

  const isDisplayTier = (
    tier: PublicPricingResponse["tiers"][number],
  ): tier is PublicPricingResponse["tiers"][number] & { slug: "free" | "pro" } =>
    tier.slug === "free" || tier.slug === "pro";

  return pricing.tiers.filter(isDisplayTier).map((tier) => {
    const ui = tierUiConfig[tier.slug];
    const fallbackTier = fallbackBySlug[tier.slug];
    const amount = tier.priceAmount ?? 0;
    const currency = tier.priceCurrency || "USD";
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100);

    return {
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

function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  return (
    <div
      className={cn(
        "animate-fade-in-up relative flex flex-col rounded-2xl border bg-card/80 backdrop-blur-sm p-6 transition-all duration-500",
        tier.highlighted
          ? "border-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.15)] scale-105 z-10"
          : "border-border/50 hover:border-orange-500/30",
      )}
      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
    >
      {tier.badge && (
        <div
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold",
            tier.badgeVariant === "popular"
              ? "bg-orange-500 text-white"
              : "bg-muted border border-border text-muted-foreground",
          )}
        >
          {tier.badge}
        </div>
      )}

      <div className="text-center mb-6 pt-2">
        <h3 className="text-lg font-semibold mb-2">{tier.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={cn(
              "text-4xl font-bold tracking-tight",
              tier.highlighted && "text-orange-500",
            )}
          >
            {tier.price}
          </span>
          <span className="text-muted-foreground text-sm">{tier.period}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                tier.highlighted ? "text-orange-500" : "text-emerald-500",
              )}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {tier.highlighted ? (
        <Link to="/signup" className="w-full">
          <ShimmerButton className="w-full shadow-lg">
            <span className="flex items-center justify-center gap-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" />
              {tier.cta}
            </span>
          </ShimmerButton>
        </Link>
      ) : (
        <Button variant={tier.name === "Pro" ? "default" : "outline"} className="w-full" asChild>
          <Link to="/signup">
            {tier.name === "Pro" && <Zap className="h-4 w-4 mr-2" />}
            {tier.cta}
          </Link>
        </Button>
      )}
    </div>
  );
}

export function Pricing({ pricing }: PricingProps) {
  const tiers = buildPricingTiers(pricing);

  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            Pricing
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple, <span className="text-orange-500">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-start">
          {tiers.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} index={index} />
          ))}
        </div>

        <div className="animate-fade-in-up text-center mt-12 text-sm text-muted-foreground space-y-3">
          <div>All plans include 3D model preview, file organization, and secure storage.</div>
          <div>Fair‑use bandwidth included (up to 3× stored data per month).</div>
        </div>
      </div>
    </section>
  );
}
