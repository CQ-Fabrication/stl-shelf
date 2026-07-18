import { Box, HardDrive, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsageStats } from "@/hooks/use-usage-stats";
import {
  formatPercentage,
  formatStorage,
  getTierDisplayName,
  getUsageColor,
  getUsageProgressColor,
} from "@/lib/billing/utils";
import { cn } from "@/lib/utils";

type OverviewRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage: number;
  progressValue: number;
  isUnlimited?: boolean;
};

function OverviewRow({
  icon,
  label,
  value,
  percentage,
  progressValue,
  isUnlimited,
}: OverviewRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className={isUnlimited ? "text-muted-foreground" : getUsageColor(percentage)}>
          {value}
        </span>
      </div>
      <Progress
        className={cn("h-2", isUnlimited && "bg-brand/20")}
        indicatorClassName={
          isUnlimited
            ? "bg-gradient-to-r from-brand/70 to-brand/35"
            : getUsageProgressColor(percentage)
        }
        value={progressValue}
      />
    </div>
  );
}

function StorageOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function StorageOverviewCard() {
  const { usage, isLoading: isUsageLoading } = useUsageStats();
  const { subscription, isLoading: isSubLoading } = useSubscription();

  if (isUsageLoading || isSubLoading) {
    return <StorageOverviewSkeleton />;
  }

  if (!usage) return null;

  const modelPercentage = usage.models.isUnlimited ? 0 : usage.models.percentage;
  const modelLimitLabel = usage.models.isUnlimited ? "Unlimited" : usage.models.limit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>Storage</CardTitle>
          <Badge variant="secondary">{getTierDisplayName(subscription?.tier)}</Badge>
        </div>
        <CardDescription>Your organization's usage against plan limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <OverviewRow
          icon={<HardDrive className="h-4 w-4 text-muted-foreground" />}
          label="Storage"
          value={`${formatStorage(usage.storage.used)} / ${formatStorage(usage.storage.limit)}`}
          percentage={usage.storage.percentage}
          progressValue={usage.storage.percentage}
        />
        <OverviewRow
          icon={<Box className="h-4 w-4 text-muted-foreground" />}
          label="Models"
          value={`${usage.models.used} / ${modelLimitLabel}`}
          percentage={modelPercentage}
          progressValue={usage.models.isUnlimited ? 42 : modelPercentage}
          isUnlimited={usage.models.isUnlimited}
        />
        <OverviewRow
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Members"
          value={`${usage.members.used} / ${usage.members.limit}`}
          percentage={usage.members.percentage}
          progressValue={usage.members.percentage}
        />
        <p className="text-muted-foreground text-xs">
          {formatPercentage(usage.storage.percentage)} of storage used
        </p>
      </CardContent>
    </Card>
  );
}
