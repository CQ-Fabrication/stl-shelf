import { AlertCircle, Check, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCheckout } from "@/hooks/use-checkout";
import type { UploadLimitsResult } from "@/hooks/use-upload-limits";
import {
  SUBSCRIPTION_TIERS,
  getProductSlugForTier,
  getTierPrice,
  type BillingInterval,
  type SubscriptionTier,
} from "@/lib/billing/config";
import { formatStorage } from "@/lib/billing/utils";

type UploadBlockedStateProps = {
  limits: UploadLimitsResult;
  onClose: () => void;
};

const TIER_ORDER: SubscriptionTier[] = ["free", "basic", "pro"];

const getRecommendedTier = (currentTier: SubscriptionTier): SubscriptionTier => {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex < TIER_ORDER.length - 1) {
    // Safe access - we've already verified the index is in bounds
    return TIER_ORDER[currentIndex + 1] as SubscriptionTier;
  }
  return currentTier;
};

export function UploadBlockedState({ limits, onClose }: UploadBlockedStateProps) {
  const { startCheckout, loadingProductSlug, isLoading } = useCheckout();
  const recommendedTier = getRecommendedTier(limits.tier);
  const billingInterval: BillingInterval = "month";

  const blockMessage =
    limits.blockReason === "model_limit"
      ? `Model limit reached (${limits.models.current}/${limits.models.limit})`
      : `Storage limit reached (${formatStorage(limits.storage.current)}/${formatStorage(limits.storage.limit)})`;

  // Analytics placeholder
  console.log("limit_block_shown", {
    reason: limits.blockReason,
    tier: limits.tier,
  });

  const handleUpgradeClick = (tier: SubscriptionTier) => {
    console.log("limit_upgrade_clicked", { from: limits.tier, to: tier });
    const productSlug = getProductSlugForTier(tier, billingInterval);
    startCheckout(productSlug);
  };

  const handleDismiss = () => {
    console.log("limit_block_dismissed", {
      reason: limits.blockReason,
      tier: limits.tier,
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Block reason banner */}
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">{blockMessage}</p>
          <p className="text-muted-foreground text-sm">
            Upgrade your plan to continue uploading models.
          </p>
        </div>
      </div>

      {/* Plan comparison grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIER_ORDER.map((tierKey) => {
          const config = SUBSCRIPTION_TIERS[tierKey];
          const isCurrent = limits.tier === tierKey;
          const isRecommended = tierKey === recommendedTier && !isCurrent;
          const productSlug = getProductSlugForTier(tierKey, billingInterval);
          let actionLabel = `Upgrade to ${config.name}`;
          if (loadingProductSlug === productSlug) {
            actionLabel = "Loading...";
          } else if (isCurrent) {
            actionLabel = "Current Plan";
          }

          return (
            <Card
              key={tierKey}
              className={`relative ${isRecommended ? "ring-2 ring-orange-500/20 border-orange-500" : ""}`}
            >
              {isCurrent && (
                <Badge variant="secondary" className="absolute top-3 right-3">
                  Current
                </Badge>
              )}
              {isRecommended && (
                <Badge className="-top-2.5 -translate-x-1/2 absolute left-1/2 bg-orange-500">
                  Recommended
                </Badge>
              )}

              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{config.name}</CardTitle>
                <p className="font-bold text-2xl">
                  ${getTierPrice(tierKey, billingInterval)}
                  <span className="font-normal text-muted-foreground text-sm">/mo</span>
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {config.modelCountLimit === -1
                      ? "Unlimited models"
                      : `${config.modelCountLimit} models`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {formatStorage(config.storageLimit)} storage
                  </li>
                </ul>

                <Button
                  variant={isRecommended ? "default" : "outline"}
                  className={`w-full ${isRecommended ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                  disabled={isCurrent || tierKey === "free" || isLoading}
                  onClick={() => handleUpgradeClick(tierKey)}
                >
                  {actionLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary action - delete models */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trash2 className="h-4 w-4" />
          <span className="text-sm">Or free up space by deleting models</span>
        </div>
        <Button variant="outline" asChild onClick={handleDismiss}>
          <Link to="/library">Go to Library</Link>
        </Button>
      </div>
    </div>
  );
}
