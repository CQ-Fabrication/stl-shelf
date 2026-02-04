import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PricingTier } from "./pricing-utils";

type PricingCardProps = {
  tier: PricingTier;
  renderCta?: (tier: PricingTier) => React.ReactNode;
};

export function PricingCard({ tier, renderCta }: PricingCardProps) {
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
        {tier.badge ? (
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
        ) : null}
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
