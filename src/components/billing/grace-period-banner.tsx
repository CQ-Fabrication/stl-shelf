import { AlertTriangle, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGracePeriod } from "@/hooks/use-grace-period";

export function GracePeriodBanner() {
  const { gracePeriod, isLoading } = useGracePeriod();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not in grace period, loading, or dismissed
  if (isLoading || gracePeriod.status === "none" || isDismissed) {
    return null;
  }

  const formatDate = (date: Date | null) =>
    date
      ? date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

  const formattedGraceDeadline = formatDate(gracePeriod.graceDeadline);
  const formattedRetentionDeadline = formatDate(gracePeriod.retentionDeadline);

  // Cleanup overdue
  if (gracePeriod.status === "expired") {
    return (
      <div className="bg-destructive text-destructive-foreground">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              We are finalizing automatic cleanup. Your account remains in read-only mode until the
              cleanup completes. Upgrade to restore full access immediately.
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

  const daysText =
    gracePeriod.daysRemaining === 1
      ? "1 day remaining"
      : `${gracePeriod.daysRemaining} days remaining`;

  // Cleanup window
  if (gracePeriod.status === "retention") {
    return (
      <div className="bg-destructive text-destructive-foreground">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Cleanup window active. Older files will be removed to reach free limits by{" "}
              {formattedRetentionDeadline} ({daysText}). Upgrade to stop deletion.
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

  return (
    <div className="bg-amber-500 text-amber-950">
      <div className="container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">
              Your usage exceeds free limits, so your account is in read-only mode.
            </span>{" "}
            Upgrade by {formattedGraceDeadline} ({daysText}) to keep all files. Older files will be
            removed after {formattedGraceDeadline} and no later than {formattedRetentionDeadline}.
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
