import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCheckout } from "@/hooks/use-checkout";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
import type { SubscriptionTier } from "@/lib/billing/config";
import { PricingCards, type TierSlug } from "@/components/pricing/pricing-cards";
import type { PublicPricingResponse } from "@/server/functions/pricing";
import { cn } from "@/lib/utils";

type PlanSelectorProps = {
  pricing?: PublicPricingResponse | null;
  className?: string;
};

export const PlanSelector = ({ pricing, className }: PlanSelectorProps) => {
  const { startCheckout, loadingTier, isLoading: isCheckoutLoading } = useCheckout();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();
  const { subscription } = useSubscription();
  const currentTier = subscription?.tier ?? "free";
  const visibleSlugs: TierSlug[] =
    currentTier === "basic" ? ["free", "basic", "pro"] : ["free", "pro"];

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (tier === "free") {
      if (subscription?.isOwner && currentTier !== "free") {
        openPortal();
      }
      return;
    }
    if (!subscription?.isOwner) {
      toast.error("Only the organization owner can upgrade");
      return;
    }
    startCheckout(tier);
  };

  return (
    <PricingCards
      pricing={pricing}
      visibleSlugs={visibleSlugs}
      className={className}
      renderCta={(tier) => {
        const slug = tier.slug as SubscriptionTier;
        const isCurrentPlan = subscription?.tier === slug;
        const isOwner = subscription?.isOwner ?? false;
        const isFreeTier = slug === "free";
        const isDowngrade = isOwner && isFreeTier && currentTier !== "free";
        const isBusy =
          (isCheckoutLoading && loadingTier === slug) || (isPortalLoading && isDowngrade);

        const label = isCurrentPlan
          ? "Current Plan"
          : !isOwner
            ? "Owner Only"
            : isFreeTier
              ? "Downgrade to Free"
              : "Upgrade to Pro";

        const disabled =
          isCurrentPlan ||
          !isOwner ||
          isCheckoutLoading ||
          (isFreeTier && !isDowngrade) ||
          isPortalLoading;

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
