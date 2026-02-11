import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/use-checkout";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
import {
  getProductSlugForTier,
  type BillingInterval,
  type SubscriptionTier,
} from "@/lib/billing/config";
import { trackPlanSelected, trackPricingInteraction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { PricingCards } from "@/components/pricing/pricing-cards";
import type { TierSlug } from "@/components/pricing/pricing-utils";
import type { PublicPricingResponse } from "@/server/functions/pricing";
import { cn } from "@/lib/utils";

type PlanSelectorProps = {
  pricing?: PublicPricingResponse | null;
  className?: string;
};

const tierRank: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

const getActionLabel = ({
  isCurrentPlan,
  isOwner,
  isFreeTier,
  isDowngrade,
  tierName,
}: {
  isCurrentPlan: boolean;
  isOwner: boolean;
  isFreeTier: boolean;
  isDowngrade: boolean;
  tierName: string;
}) => {
  if (isCurrentPlan) return "Current Plan";
  if (!isOwner) return "Owner Only";
  if (isDowngrade && isFreeTier) return "Downgrade to Free";
  if (isDowngrade) return "Downgrade in Portal";
  return `Upgrade to ${tierName}`;
};

export const PlanSelector = ({ pricing, className }: PlanSelectorProps) => {
  const { startCheckout, loadingProductSlug, isLoading: isCheckoutLoading } = useCheckout();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();
  const { subscription } = useSubscription();
  const { client } = useOpenPanelClient();
  const currentTier = subscription?.tier ?? "free";
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const visibleSlugs: TierSlug[] = ["free", "basic", "pro"];

  const handleSelectPlan = (tier: SubscriptionTier) => {
    trackPlanSelected(client, tier);
    const isOwner = subscription?.isOwner ?? false;
    const isDowngrade = tierRank[tier] < tierRank[currentTier];

    if (!isOwner) {
      trackPricingInteraction(client, "plan_select_blocked_owner_only");
      toast.error("Only the organization owner can upgrade");
      return;
    }

    if (isDowngrade) {
      trackPricingInteraction(client, `downgrade_open_portal_${tier}`);
      openPortal();
      return;
    }

    if (tier === currentTier) {
      trackPricingInteraction(client, "plan_select_current_tier");
      return;
    }

    const productSlug = getProductSlugForTier(tier, billingInterval);
    trackPricingInteraction(client, `checkout_requested_${productSlug}`);
    startCheckout(productSlug);
  };

  return (
    <PricingCards
      pricing={pricing}
      visibleSlugs={visibleSlugs}
      billingInterval={billingInterval}
      onIntervalChange={setBillingInterval}
      className={className}
      renderCta={(tier) => {
        const slug = tier.slug as SubscriptionTier;
        const productSlug = getProductSlugForTier(slug, billingInterval);
        const isCurrentPlan = subscription?.tier === slug;
        const isOwner = subscription?.isOwner ?? false;
        const isFreeTier = slug === "free";
        const isDowngrade = isOwner && tierRank[slug] < tierRank[currentTier];
        const isBusy =
          (isCheckoutLoading && loadingProductSlug === productSlug) ||
          (isPortalLoading && isDowngrade);

        const label = getActionLabel({
          isCurrentPlan,
          isOwner,
          isFreeTier,
          isDowngrade,
          tierName: tier.name,
        });

        const disabled = isCurrentPlan || !isOwner || isCheckoutLoading || isPortalLoading;

        const handleClick = () => handleSelectPlan(slug);

        return (
          <div className="space-y-2">
            <Button
              className={cn(
                "w-full",
                tier.highlighted &&
                  !isCurrentPlan &&
                  "bg-brand text-brand-foreground hover:bg-brand/90",
              )}
              disabled={disabled}
              onClick={handleClick}
              variant={isCurrentPlan ? "outline" : "default"}
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {label}
            </Button>

            {!isOwner && !isCurrentPlan && (
              <p className="text-center text-muted-foreground text-xs">
                Ask the organization owner to make billing changes
              </p>
            )}
            {isDowngrade && (
              <p className="text-center text-muted-foreground text-xs">
                Downgrades are confirmed in the billing portal.
              </p>
            )}
          </div>
        );
      }}
    />
  );
};
