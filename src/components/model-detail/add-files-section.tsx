import { CheckCircle2, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type CompletenessCategory,
  type CompletenessOptions,
  type CompletenessStatus,
  COMPLETENESS_CATEGORY_INFO,
  canAddToCategory,
  type FileForCompleteness,
} from "@/lib/files/completeness";
import { cn } from "@/lib/utils";

type AddFilesSectionProps = {
  status: CompletenessStatus;
  files: FileForCompleteness[];
  onAddFile: (category: CompletenessCategory) => void;
  className?: string;
  completenessOptions?: CompletenessOptions;
};

export const AddFilesSection = ({
  status,
  files,
  onAddFile,
  className,
  completenessOptions,
}: AddFilesSectionProps) => {
  if (status.isComplete) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4",
          className,
        )}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        <p className="text-emerald-700 text-sm dark:text-emerald-400">
          Version complete with model, slicer, and images
        </p>
      </div>
    );
  }

  // Only show buttons for categories that are BOTH missing AND can be added
  const addableCategories = status.missingCategories.filter((category) => {
    const canAdd = canAddToCategory(files, category, completenessOptions);
    return canAdd.allowed;
  });

  if (addableCategories.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-amber-700 text-sm dark:text-amber-400">
          Add {status.missingCategories.length === 1 ? "a " : ""}
          {status.missingCategories
            .map((c) => COMPLETENESS_CATEGORY_INFO[c].singularLabel.toLowerCase())
            .join(" or ")}{" "}
          to complete this version
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {addableCategories.map((category) => {
          const info = COMPLETENESS_CATEGORY_INFO[category];
          return (
            <Button
              className="gap-1.5 transition-all hover:border-brand hover:text-brand"
              key={category}
              onClick={() => onAddFile(category)}
              size="sm"
              variant="outline"
            >
              <Plus className="h-3.5 w-3.5" />
              {info.addLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
