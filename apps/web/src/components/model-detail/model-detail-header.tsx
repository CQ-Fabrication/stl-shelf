import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";
import { SlicerActionsDropdown } from "./slicer-actions-dropdown";

type ModelDetailHeaderProps = {
  modelId: string;
  activeVersion?: string;
  onDeleteClick: () => void;
};

export const ModelDetailHeader = ({
  modelId,
  activeVersion,
  onDeleteClick,
}: ModelDetailHeaderProps) => {
  const { data: model, isLoading } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="mb-2 h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    );
  }

  if (!model) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-4">
        <Button
          asChild
          className="transition-colors hover:text-brand"
          size="sm"
          variant="ghost"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-4xl tracking-tight">{model.name}</h1>
          {model.description && (
            <p className="mt-3 text-muted-foreground">{model.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <SlicerActionsDropdown
            modelId={modelId}
            modelName={model.name}
            versionId={activeVersion}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDeleteClick}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Model
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
