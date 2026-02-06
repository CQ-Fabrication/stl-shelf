import {
  AlertTriangle,
  Box,
  CreditCard,
  Crown,
  HardDrive,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsageStats } from "@/hooks/use-usage-stats";
import {
  formatStorage,
  getUsageColor,
  getUsageProgressColor,
  getTierDisplayName,
} from "@/lib/billing/utils";
import { cn } from "@/lib/utils";

type UsageRowProps = {
  icon: React.ReactNode;
  label: string;
  used: number | string;
  limit: number | string;
  percentage: number;
  formatValue?: (val: number) => string;
  isUnlimited?: boolean;
};

function UsageRow({
  icon,
  label,
  used,
  limit,
  percentage,
  formatValue,
  isUnlimited,
}: UsageRowProps) {
  const displayUsed = formatValue && typeof used === "number" ? formatValue(used) : used;
  const displayLimit = formatValue && typeof limit === "number" ? formatValue(limit) : limit;
  const isWarning = !isUnlimited && percentage >= 75;
  const isCritical = !isUnlimited && percentage >= 90;
  const progressValue = isUnlimited ? 42 : Math.min(percentage, 100);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={cn(
            "whitespace-nowrap font-medium tabular-nums",
            isUnlimited ? "text-muted-foreground" : getUsageColor(percentage),
          )}
        >
          {displayUsed} / {displayLimit}
          {isCritical && (
            <span className="ml-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
          {isWarning && !isCritical && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
          )}
        </span>
      </div>
      <Progress
        className={cn("h-1.5", isUnlimited && "bg-brand/20")}
        indicatorClassName={cn(
          isUnlimited
            ? "bg-gradient-to-r from-brand/70 to-brand/35"
            : getUsageProgressColor(percentage),
        )}
        value={progressValue}
      />
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type SubscriptionStatusCardProps = {
  className?: string;
};

export const SubscriptionStatusCard = ({ className }: SubscriptionStatusCardProps) => {
  const { subscription, isLoading: isSubLoading } = useSubscription();
  const { usage, isLoading: isUsageLoading } = useUsageStats();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();

  const isLoading = isSubLoading || isUsageLoading;

  if (isLoading) {
    return <SubscriptionSkeleton />;
  }

  if (!subscription || !usage) return null;

  const isActive = subscription.status === "active";
  const isFree = subscription.tier === "free";
  const isPro = subscription.tier === "pro";
  const isOwner = subscription.isOwner;
  const hasPaymentIssue = subscription.status === "past_due" || subscription.status === "unpaid";
  const isCancelScheduled = Boolean(subscription.cancelAtPeriodEnd);
  const hasTopBanner = hasPaymentIssue || isCancelScheduled;
  const periodEnd = subscription.periodEnd ? new Date(subscription.periodEnd) : null;
  const formattedPeriodEnd = periodEnd
    ? periodEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // Check if any resource is at warning level
  const modelPercentage = usage.models.isUnlimited ? 0 : usage.models.percentage;
  const modelLimitLabel = usage.models.isUnlimited ? "Unlimited" : usage.models.limit;
  const hasWarning = usage.storage.percentage >= 75 || modelPercentage >= 75;

  const statusLabel = hasPaymentIssue ? "Payment Issue" : subscription.status;

  return (
    <Card
      className={cn(
        hasPaymentIssue ? "border-red-500/50" : isPro ? "border-brand/50" : "",
        hasWarning && isFree ? "border-amber-500/30" : "",
        hasTopBanner ? "py-0 overflow-hidden" : "",
        className,
      )}
    >
      {/* Payment failure banner */}
      {hasPaymentIssue && isOwner && (
        <div className="rounded-t-lg border-b border-red-500/30 bg-red-50 px-6 py-3 dark:bg-red-950/30">
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 font-medium text-red-800 text-sm dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Payment failed. Update your payment method to avoid service interruption.</span>
            </p>
            <Button size="sm" variant="destructive" disabled={isPortalLoading} onClick={openPortal}>
              {isPortalLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Fix Now
            </Button>
          </div>
        </div>
      )}

      {isCancelScheduled && isOwner && (
        <div className="rounded-t-xl border-b border-amber-500/30 bg-amber-50 px-6 py-3 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 font-medium text-amber-800 text-sm dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Your subscription will end{" "}
              {formattedPeriodEnd ? `on ${formattedPeriodEnd}` : "at the end of the billing period"}
              . If your usage is above free limits, your account will enter read-only for 7 days and
              older files may be removed.
            </span>
          </p>
        </div>
      )}

      <CardHeader className={cn("pb-4", hasTopBanner ? "pt-6" : "")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPro && <Crown className="h-5 w-5 text-brand" />}
            <CardTitle className="text-xl">{getTierDisplayName(subscription.tier)} Plan</CardTitle>
            {statusLabel && (
              <Badge
                variant={isActive ? "default" : hasPaymentIssue ? "destructive" : "secondary"}
                className={isActive ? "bg-green-600 hover:bg-green-600" : ""}
              >
                {statusLabel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-6", hasTopBanner ? "pb-6" : "")}>
        {/* Usage Metrics - Horizontal Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          <UsageRow
            icon={<HardDrive className="h-4 w-4" />}
            label="Storage"
            used={usage.storage.used ?? 0}
            limit={usage.storage.limit ?? 0}
            percentage={usage.storage.percentage}
            formatValue={formatStorage}
          />
          <UsageRow
            icon={<Box className="h-4 w-4" />}
            label="Models"
            used={usage.models.used}
            limit={modelLimitLabel}
            percentage={modelPercentage}
            isUnlimited={usage.models.isUnlimited}
          />
          <UsageRow
            icon={<Users className="h-4 w-4" />}
            label="Seats"
            used={usage.members.used}
            limit={usage.members.limit}
            percentage={usage.members.percentage}
          />
        </div>

        {/* Upgrade prompt for free users approaching limits */}
        {isFree && hasWarning && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-3 dark:bg-amber-950/20">
            <p className="flex items-center gap-2 text-amber-800 text-sm dark:text-amber-200">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                You're approaching your plan limits. Check out the plans below for more capacity.
              </span>
            </p>
          </div>
        )}

        {/* Actions - Only for paid users */}
        {!isFree && isOwner && (
          <div className="space-y-2 border-t pt-4">
            <Button
              className="w-full sm:w-auto"
              disabled={isPortalLoading}
              onClick={openPortal}
              variant="outline"
            >
              {isPortalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Manage Subscription
            </Button>
            <p className="text-muted-foreground text-xs">
              Update payment method, view invoices, or cancel
            </p>
          </div>
        )}

        {!isFree && !isOwner && (
          <div className="border-t pt-4">
            <p className="text-center text-muted-foreground text-sm">
              Only the organization owner can manage billing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
