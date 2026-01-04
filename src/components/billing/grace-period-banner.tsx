import { AlertTriangle, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGracePeriod } from "@/hooks/use-grace-period";

export function GracePeriodBanner() {
  const { gracePeriod, isLoading } = useGracePeriod();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not in grace period, loading, or dismissed
  if (isLoading || !gracePeriod.inGracePeriod || isDismissed) {
    return null;
  }

  const formattedDeadline = gracePeriod.deadline
    ? gracePeriod.deadline.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  // Show expired state with stronger urgency
  if (gracePeriod.expired) {
    return (
      <div className="bg-destructive text-destructive-foreground">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Your grace period has expired. Your account is now in read-only mode. Please upgrade
              or reduce usage to restore full access.
            </p>
          </div>
          <Button
            asChild
            className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
            size="sm"
          >
            <Link to="/billing">View Plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Active grace period - show countdown
  const daysText =
    gracePeriod.daysRemaining === 1
      ? "1 day remaining"
      : `${gracePeriod.daysRemaining} days remaining`;

  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Your current usage exceeds your plan limits.</span> Please
            upgrade or reduce usage by {formattedDeadline} ({daysText}) to avoid read-only mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-amber-950 text-amber-50 hover:bg-amber-900" size="sm">
            <Link to="/billing">View Plans</Link>
          </Button>
          <Button
            aria-label="Dismiss banner"
            className="text-amber-950 hover:bg-amber-600"
            onClick={() => setIsDismissed(true)}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
