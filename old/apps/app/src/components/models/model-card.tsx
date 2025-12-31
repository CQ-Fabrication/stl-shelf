import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Download,
  Eye,
  HardDrive,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { memo, useState } from "react";
import { useDeleteModel } from "@/hooks/use-delete-model";
import { cn } from "@stl-shelf/ui/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@stl-shelf/ui/components/alert-dialog";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@stl-shelf/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@stl-shelf/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@stl-shelf/ui/components/tooltip";

type ModelCardProps = {
  model: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    currentVersion: string;
    fileCount: number;
    totalSize: number;
    tags: string[];
    thumbnailUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

const ModelCard = memo(({ model }: ModelCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deleteModel = useDeleteModel();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) {
      return "0 B";
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <Card className="group relative flex h-full cursor-pointer flex-col transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
      {/* Stretched link to make the whole card clickable */}
      <Link
        aria-label={`View ${model.name}`}
        className="absolute inset-0 z-10"
        params={{ modelId: model.id }}
        to="/models/$modelId"
      >
        <span className="sr-only">View details</span>
      </Link>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-lg">{model.name}</CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(model.updatedAt)}
              <HardDrive className="ml-2 h-3 w-3" />
              {formatFileSize(model.totalSize)}
            </div>
          </div>
          <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "relative z-20 transition-opacity",
                  dropdownOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
                size="sm"
                variant="ghost"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link params={{ modelId: model.id }} to="/models/$modelId">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        {/* Thumbnail preview */}
        <div className="mb-3">
          <div className="aspect-video overflow-hidden rounded-md bg-muted transition-all group-hover:bg-gradient-to-br group-hover:from-muted/80 group-hover:to-brand/5">
            {model.thumbnailUrl ? (
              <img
                alt={`Preview of ${model.name}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                height={360}
                loading="lazy"
                src={model.thumbnailUrl}
                width={640}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <HardDrive className="mx-auto mb-2 h-8 w-8" />
                  <div className="text-sm">No Preview</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description with tooltip for full text */}
        {model.description ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative z-20">
                  <CardDescription className="mb-3 line-clamp-2 cursor-help">
                    {model.description}
                  </CardDescription>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{model.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          // Reserve space for missing description to maintain consistent layout
          <div className="mb-3 h-10" />
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow" />

        {/* Combined footer with tags and file info - always at bottom */}
        <div className="mt-auto flex min-h-[24px] items-center justify-between gap-3 text-xs">
          {/* Tags on left - with reserved space to prevent layout shifts */}
          <div className="flex min-w-0 max-w-[60%] flex-1 items-center gap-1">
            {model.tags && model.tags.length > 0 ? (
              <TooltipProvider>
                {/* Desktop: show 2 tags */}
                <div className="hidden min-w-0 items-center gap-1 sm:flex">
                  {model.tags.slice(0, 2).map((tag) => (
                    <Tooltip key={tag}>
                      <TooltipTrigger asChild>
                        <Badge
                          className="max-w-24 cursor-help truncate text-xs transition-colors hover:bg-secondary/80"
                          title={tag.length > 12 ? tag : undefined}
                          variant="secondary"
                        >
                          {tag}
                        </Badge>
                      </TooltipTrigger>
                      {tag.length > 12 && (
                        <TooltipContent side="top">
                          <p className="font-medium text-xs">{tag}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {model.tags.length > 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          className="min-w-[2rem] cursor-help text-center text-xs transition-colors hover:bg-accent"
                          variant="outline"
                        >
                          +{model.tags.length - 2}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" side="top">
                        <p className="mb-2 font-medium text-xs">
                          Additional tags:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {model.tags.slice(2).map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Mobile: show 1 tag with improved touch targets */}
                <div className="flex min-w-0 items-center gap-1.5 sm:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        className="min-h-6 max-w-20 cursor-pointer truncate px-2 text-xs"
                        title={
                          model.tags[0].length > 8 ? model.tags[0] : undefined
                        }
                        variant="secondary"
                      >
                        {model.tags[0]}
                      </Badge>
                    </TooltipTrigger>
                    {model.tags[0].length > 8 && (
                      <TooltipContent side="top">
                        <p className="font-medium text-xs">{model.tags[0]}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {model.tags.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          className="min-h-6 min-w-[2.5rem] cursor-pointer px-2 text-center text-xs"
                          variant="outline"
                        >
                          +{model.tags.length - 1}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs" side="top">
                        <p className="mb-2 font-medium text-xs">All tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.tags.map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            ) : (
              // Reserved space when no tags to prevent layout shifts
              <div className="h-6" />
            )}
          </div>

          {/* File info on right - guaranteed minimum space */}
          <div className="flex min-w-[40%] shrink-0 items-center justify-end text-muted-foreground">
            <span className="whitespace-nowrap">
              {model.fileCount} file{model.fileCount !== 1 ? "s" : ""}
            </span>
            <span className="mx-1.5 text-muted-foreground/60">•</span>
            <span className="whitespace-nowrap font-medium text-brand">
              {model.currentVersion}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{model.name}"? This action can be
              undone by contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteModel.mutate({ id: model.id });
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

ModelCard.displayName = "ModelCard";

export { ModelCard };
export default ModelCard;
