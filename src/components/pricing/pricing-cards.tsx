import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BILLING_INTERVALS, type BillingInterval } from "@/lib/billing/config";
import { cn } from "@/lib/utils";
import type { PublicPricingResponse } from "@/server/functions/pricing";
import { PricingCard } from "./pricing-card";
import { PricingIntervalToggle } from "./pricing-interval-toggle";
import { PricingUnavailable } from "./pricing-unavailable";
import {
  buildPricingDisplay,
  defaultVisibleSlugs,
  type PricingTier,
  type TierSlug,
} from "./pricing-utils";

type PricingCardsProps = {
  pricing?: PublicPricingResponse | null;
  visibleSlugs?: TierSlug[];
  billingInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  renderCta?: (tier: PricingTier) => React.ReactNode;
  className?: string;
};

export function PricingCards({
  pricing,
  visibleSlugs = defaultVisibleSlugs,
  billingInterval,
  onIntervalChange,
  renderCta,
  className,
}: PricingCardsProps) {
  const router = useRouter();
  const [internalInterval, setInternalInterval] = useState<BillingInterval>(BILLING_INTERVALS[0]);
  const resolvedInterval = billingInterval ?? internalInterval;
  const handleIntervalChange = onIntervalChange ?? setInternalInterval;
  const { tiers, paidUnavailable } = useMemo(
    () => buildPricingDisplay(pricing, visibleSlugs, resolvedInterval),
    [pricing, resolvedInterval, visibleSlugs],
  );

  return (
    <div className="space-y-8">
      <PricingIntervalToggle value={resolvedInterval} onChange={handleIntervalChange} />

      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto items-stretch",
          className,
        )}
      >
        {tiers.map((tier) => (
          <PricingCard key={tier.slug} tier={tier} renderCta={renderCta} />
        ))}
        {paidUnavailable && (
          <PricingUnavailable
            className="md:col-span-1 lg:col-span-2"
            onRetry={() => router.invalidate()}
          />
        )}
      </div>
    </div>
  );
}
