import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarketingConsent } from "@/hooks/use-marketing-consent";
import { cn } from "@/lib/utils";

/**
 * Non-blocking marketing consent banner that slides up from the bottom.
 * Shows after 10 seconds on first login or when user hasn't made a decision.
 *
 * Actions:
 * - Accept: Records consent, dismisses banner
 * - Maybe Later: Re-prompts after 7 days
 * - X (close): Permanent decline, never re-prompts
 */
export function MarketingConsentBanner() {
  const { isBannerVisible, isPending, handleAccept, handleDecline, handleDefer } =
    useMarketingConsent();

  if (!isBannerVisible) {
    return null;
  }

  return (
    <div
      aria-label="Marketing preferences"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40",
        "animate-in slide-in-from-bottom duration-300",
        "bg-card border-t shadow-lg",
      )}
      role="region"
    >
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Content */}
          <p className="text-sm text-foreground sm:text-base">
            Stay in the loop with product updates &amp; tips?
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              className="flex-1 sm:flex-none"
              disabled={isPending}
              onClick={handleAccept}
              size="sm"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
            </Button>

            <Button
              className="flex-1 sm:flex-none"
              disabled={isPending}
              onClick={handleDefer}
              size="sm"
              variant="outline"
            >
              Maybe Later
            </Button>

            <Button
              aria-label="Decline marketing communications"
              className="h-8 w-8 shrink-0"
              disabled={isPending}
              onClick={handleDecline}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
