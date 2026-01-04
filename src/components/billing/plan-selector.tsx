import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCheckout } from "@/hooks/use-checkout";
import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/lib/billing/config";
import { formatPrice } from "@/lib/billing/utils";

const formatStorage = (bytes: number): string => {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(0)} GB`;
  }
  return `${(bytes / 1_048_576).toFixed(0)} MB`;
};

export const PlanSelector = () => {
  const { startCheckout, loadingTier, isLoading: isCheckoutLoading } = useCheckout();
  const { subscription } = useSubscription();

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (tier === "free") return;
    if (!subscription?.isOwner) {
      toast.error("Only the organization owner can upgrade");
      return;
    }
    startCheckout(tier);
  };

  const isOwner = subscription?.isOwner ?? false;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => {
        const isCurrentPlan = subscription?.tier === tier;
        const isMostPopular = tier === "basic";
        const canUpgrade = isOwner || tier === "free";

        return (
          <Card
            className={`relative flex flex-col ${isMostPopular ? "border-orange-500" : ""}`}
            key={tier}
          >
            {isCurrentPlan && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary">Current Plan</Badge>
              </div>
            )}
            {isMostPopular && (
              <div className="-top-3 -translate-x-1/2 absolute left-1/2">
                <Badge className="bg-orange-500 text-white">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle>{config.name}</CardTitle>
              <CardDescription>
                <span className="font-bold text-3xl">{formatPrice(config.price)}</span>
                {config.price > 0 && <span className="text-muted-foreground">/month</span>}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-4">
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {config.maxMembers === 1 ? "1 user" : `Up to ${config.maxMembers} team members`}
                </p>
                <p className="text-muted-foreground">
                  {formatStorage(config.storageLimit)} storage
                </p>
                <p className="text-muted-foreground">
                  {config.modelCountLimit === -1
                    ? "Unlimited models"
                    : `${config.modelCountLimit} models`}
                </p>
              </div>

              <div className="flex-1 border-t pt-4">
                <ul className="space-y-2">
                  {config.features.map((feature) => (
                    <li className="flex items-center gap-2 text-sm" key={feature}>
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  className={`w-full ${isMostPopular && !isCurrentPlan ? "bg-orange-500 text-white hover:bg-orange-600" : ""}`}
                  disabled={isCurrentPlan || !canUpgrade || isCheckoutLoading}
                  onClick={() => handleSelectPlan(tier as SubscriptionTier)}
                  variant={isCurrentPlan ? "outline" : "default"}
                >
                  {loadingTier === tier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCurrentPlan
                    ? "Current Plan"
                    : tier === "free"
                      ? "Free Forever"
                      : canUpgrade
                        ? "Upgrade"
                        : "Owner Only"}
                </Button>

                {!isOwner && tier !== "free" && (
                  <p className="text-center text-muted-foreground text-xs">
                    Ask the organization owner to upgrade
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
