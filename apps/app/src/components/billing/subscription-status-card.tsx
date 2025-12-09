import { CreditCard, Crown, Loader2 } from "lucide-react";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@stl-shelf/ui/components/card";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { getTierDisplayName } from "@/lib/billing/utils";

export const SubscriptionStatusCard = () => {
  const { subscription, isLoading } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const isActive = subscription.status === "active";
  const isFree = subscription.tier === "free";
  const isOwner = subscription.isOwner;

  return (
    <Card className={subscription.tier === "pro" ? "border-blue-500" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {subscription.tier === "pro" && (
              <Crown className="h-5 w-5 text-blue-500" />
            )}
            <CardTitle>{getTierDisplayName(subscription.tier)} Plan</CardTitle>
            <Badge variant={isActive ? "default" : "secondary"}>
              {subscription.status}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {isFree
            ? "Upgrade to unlock team collaboration and more storage"
            : isOwner
              ? "Manage your subscription and view billing history"
              : "Contact the organization owner to upgrade"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 rounded-lg border p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-xs">Members</p>
              <p className="font-semibold">{subscription.memberLimit}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Models</p>
              <p className="font-semibold">{subscription.modelCountLimit}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Storage</p>
              <p className="font-semibold">
                {subscription.tier === "free"
                  ? `${(subscription.storageLimit / 1_048_576).toFixed(0)} MB`
                  : `${(subscription.storageLimit / 1_073_741_824).toFixed(0)} GB`}
              </p>
            </div>
          </div>
        </div>

        {!isFree && isOwner && (
          <Button
            className="w-full"
            disabled={isPortalLoading}
            onClick={openPortal}
            variant="outline"
          >
            {isPortalLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
        )}

        {!isOwner && (
          <p className="text-center text-muted-foreground text-sm">
            Only the organization owner can manage billing
          </p>
        )}
      </CardContent>
    </Card>
  );
};
