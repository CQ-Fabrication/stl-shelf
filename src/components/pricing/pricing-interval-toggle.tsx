import type { BillingInterval } from "@/lib/billing/config";
import { cn } from "@/lib/utils";

const intervalOptions: Array<{ value: BillingInterval; label: string; badge?: string }> = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annual", badge: "Save 10%" },
];

type PricingIntervalToggleProps = {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
};

export function PricingIntervalToggle({ value, onChange, className }: PricingIntervalToggleProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div
        aria-label="Billing interval"
        className="inline-flex rounded-full border border-border/60 bg-muted/40 p-1"
        role="group"
      >
        {intervalOptions.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              {option.badge ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                    isActive
                      ? "border-brand/30 text-brand"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
