import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CompletenessCategory,
  type CompletenessStatus,
  COMPLETENESS_CATEGORY_INFO,
} from "@/lib/files/completeness";
import { cn } from "@/lib/utils";

type FileCompletenessProps = {
  status: CompletenessStatus;
  variant: "dots" | "badge" | "detailed";
  className?: string;
};

const CATEGORY_ORDER: CompletenessCategory[] = ["model", "slicer", "image"];

const getCategoryColor = (category: CompletenessCategory, isFilled: boolean): string => {
  if (!isFilled) return "text-muted-foreground/40";

  switch (category) {
    case "model":
      return "text-emerald-500";
    case "slicer":
      return "text-amber-500";
    case "image":
      return "text-sky-500";
  }
};

const getCategoryLabel = (category: CompletenessCategory): string => {
  return COMPLETENESS_CATEGORY_INFO[category].singularLabel;
};

const DotsVariant = ({ status, className }: { status: CompletenessStatus; className?: string }) => {
  const categoryStatus: Record<CompletenessCategory, boolean> = {
    model: status.hasModel,
    slicer: status.hasSlicer,
    image: status.hasImage,
  };

  const missingLabels = status.missingCategories.map(getCategoryLabel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            {CATEGORY_ORDER.map((category) => {
              const isFilled = categoryStatus[category];
              return (
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                    isFilled
                      ? getCategoryColor(category, true).replace("text-", "bg-")
                      : "bg-muted-foreground/30",
                  )}
                  key={category}
                />
              );
            })}
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="top">
          {status.isComplete ? (
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Complete version
            </p>
          ) : (
            <p>Missing: {missingLabels.join(", ")}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const BadgeVariant = ({
  status,
  className,
}: {
  status: CompletenessStatus;
  className?: string;
}) => {
  if (status.isComplete) {
    return (
      <Badge
        className={cn(
          "gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-all hover:bg-emerald-500/20 dark:text-emerald-400",
          className,
        )}
        variant="outline"
      >
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </Badge>
    );
  }

  const missingCount = status.missingCategories.length;
  const missingLabels = status.missingCategories.map(getCategoryLabel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              "gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 transition-all hover:bg-amber-500/20 dark:text-amber-400",
              className,
            )}
            variant="outline"
          >
            <Circle className="h-3 w-3" />
            {missingCount} missing
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="bottom">
          <p>Missing: {missingLabels.join(", ")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DetailedVariant = ({
  status,
  className,
}: {
  status: CompletenessStatus;
  className?: string;
}) => {
  const categoryStatus: Record<CompletenessCategory, boolean> = {
    model: status.hasModel,
    slicer: status.hasSlicer,
    image: status.hasImage,
  };

  return (
    <div className={cn("space-y-2", className)}>
      {CATEGORY_ORDER.map((category) => {
        const isFilled = categoryStatus[category];
        const info = COMPLETENESS_CATEGORY_INFO[category];
        const count = status.counts[category];

        return (
          <div className="flex items-center justify-between text-sm" key={category}>
            <div className="flex items-center gap-2">
              {isFilled ? (
                <CheckCircle2 className={cn("h-4 w-4", getCategoryColor(category, true))} />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              <span className={cn(!isFilled && "text-muted-foreground")}>{info.label}</span>
            </div>
            <span className="text-muted-foreground text-xs">
              {count > 0 ? `${count} file${count !== 1 ? "s" : ""}` : "None"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const FileCompleteness = ({ status, variant, className }: FileCompletenessProps) => {
  switch (variant) {
    case "dots":
      return <DotsVariant className={className} status={status} />;
    case "badge":
      return <BadgeVariant className={className} status={status} />;
    case "detailed":
      return <DetailedVariant className={className} status={status} />;
  }
};
