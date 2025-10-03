import { Box, HardDrive, Loader2, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
        <CardDescription>
          Track your organization's current usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className={getUsageColor(usage.storage.percentage)}>
              {formatStorage(usage.storage.used)} /{" "}
              {formatStorage(usage.storage.limit)}
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
            <span className={getUsageColor(usage.models.percentage)}>
              {usage.models.used} / {usage.models.limit}
            </span>
          </div>
          <Progress
            className="h-2"
            indicatorClassName={getUsageProgressColor(usage.models.percentage)}
            value={usage.models.percentage}
          />
          <p className="text-muted-foreground text-xs">
            {formatPercentage(usage.models.percentage)} used
          </p>
        </div>

        {/* Members Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Team Members</span>
            </div>
            <span className={getUsageColor(usage.members.percentage)}>
              {usage.members.used} / {usage.members.limit}
            </span>
          </div>
          <Progress
            className="h-2"
            indicatorClassName={getUsageProgressColor(usage.members.percentage)}
            value={usage.members.percentage}
          />
          <p className="text-muted-foreground text-xs">
            {formatPercentage(usage.members.percentage)} used
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
