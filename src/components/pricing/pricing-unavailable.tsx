import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PricingUnavailableProps = {
  onRetry?: () => void;
  className?: string;
};

export const PricingUnavailable = ({ onRetry, className }: PricingUnavailableProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center",
      className,
    )}
  >
    <p className="text-lg font-semibold">Our price list is still printing</p>
    <p className="max-w-sm text-sm text-muted-foreground">
      We couldn't load current prices. Give it a minute and refresh — the plans will be right back.
    </p>
    {onRetry && (
      <Button onClick={onRetry} size="sm" variant="outline">
        Retry
      </Button>
    )}
  </div>
);
