import { Box, Download, HardDrive, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUsageStats } from "@/hooks/use-usage-stats";
import {
  formatPercentage,
  formatStorage,
  getUsageColor,
  getUsageProgressColor,
} from "@/lib/billing/utils";

export const UsageCard = () => {
  const { usage, isLoading } = useUsageStats();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const egressUsage = usage.egress;
  const modelLimitLabel = usage.models.isUnlimited ? "Unlimited" : usage.models.limit;
  const modelPercentage = usage.models.isUnlimited ? 0 : usage.models.percentage;
  const modelProgressValue = usage.models.isUnlimited ? 42 : modelPercentage;
  const egressWarning = egressUsage?.percentage >= 80;
  const egressCritical = egressUsage?.percentage >= 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
        <CardDescription>Track your organization's current usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {egressWarning && egressUsage && (
          <Alert className={egressCritical ? "border-red-500/40" : "border-yellow-500/40"}>
            <AlertTitle>
              {egressCritical ? "Bandwidth limit reached" : "Bandwidth warning"}
            </AlertTitle>
            <AlertDescription>
              {formatStorage(egressUsage.used)} of {formatStorage(egressUsage.limit)} used this
              month. Consider upgrading or adding storage to avoid download interruptions.
            </AlertDescription>
          </Alert>
        )}
        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className={getUsageColor(usage.storage.percentage)}>
              {formatStorage(usage.storage.used ?? 0)} / {formatStorage(usage.storage.limit ?? 0)}
            </span>
          </div>
          <Progress
            className="h-2"
            indicatorClassName={getUsageProgressColor(usage.storage.percentage)}
            value={usage.storage.percentage}
          />
          <p className="text-muted-foreground text-xs">
            {formatPercentage(usage.storage.percentage)} used
          </p>
        </div>

        {/* Models Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Models</span>
            </div>
            <span
              className={
                usage.models.isUnlimited ? "text-muted-foreground" : getUsageColor(modelPercentage)
              }
            >
              {usage.models.used} / {modelLimitLabel}
            </span>
          </div>
          <Progress
            className={usage.models.isUnlimited ? "h-2 bg-brand/20" : "h-2"}
            indicatorClassName={
              usage.models.isUnlimited
                ? "bg-gradient-to-r from-brand/70 to-brand/35"
                : getUsageProgressColor(modelPercentage)
            }
            value={modelProgressValue}
          />
          <p className="text-muted-foreground text-xs">
            {usage.models.isUnlimited
              ? "No cap on model count"
              : `${formatPercentage(modelPercentage)} used`}
          </p>
        </div>

        {/* Bandwidth Usage */}
        {egressUsage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Bandwidth</span>
              </div>
              <span className={getUsageColor(egressUsage.percentage)}>
                {formatStorage(egressUsage.used)} / {formatStorage(egressUsage.limit)}
              </span>
            </div>
            <Progress
              className="h-2"
              indicatorClassName={getUsageProgressColor(egressUsage.percentage)}
              value={egressUsage.percentage}
            />
            <p className="text-muted-foreground text-xs">
              {formatPercentage(egressUsage.percentage)} used • {egressUsage.downloads} downloads
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
