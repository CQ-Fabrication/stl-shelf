import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Download, Eye, HardDrive, MoreVertical, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { useDeleteModel } from "@/hooks/use-delete-model";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ModelCardProps = {
  searchQuery?: string;
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
    owner: {
      id: string;
      name: string;
      image: string | null;
    };
    createdAt: string;
    updatedAt: string;
    completeness: {
      hasModel: boolean;
      hasSlicer: boolean;
      hasImage: boolean;
      isComplete: boolean;
    };
  };
};

export const buildLibraryTagSearch = (tag: string, searchQuery?: string) => ({
  q: searchQuery || undefined,
  tags: tag,
});

const ModelCard = memo(({ model, searchQuery }: ModelCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deleteModel = useDeleteModel();
  const navigate = useNavigate();

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigate({ to: "/library", search: buildLibraryTagSearch(tag, searchQuery) });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) {
      return "0 B";
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  const viewModelLabel = "View " + model.name;

  return (
    <Card className="group relative flex h-full cursor-pointer flex-col transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
      {/* Stretched link to make the whole card clickable */}
      <Link
        aria-label={viewModelLabel}
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
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              {/* User Avatar */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative z-20">
                      <GradientAvatar
                        className="ring-1 ring-border/50"
                        id={model.owner.id}
                        name={model.owner.name}
                        size="xs"
                        src={model.owner.image}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{model.owner.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-muted-foreground/30">·</span>

              {/* File size group */}
              <div className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                <span>{formatFileSize(model.totalSize)}</span>
              </div>

              <span className="text-muted-foreground/30">·</span>

              <span>
                {model.fileCount} file{model.fileCount !== 1 ? "s" : ""}
              </span>

              <span className="text-muted-foreground/30">·</span>

              {/* Version badge */}
              <Badge
                className="h-4 border-brand/30 bg-brand/5 px-1.5 py-0 font-medium text-brand text-[10px]"
                variant="outline"
              >
                {model.currentVersion}
              </Badge>
            </div>
          </div>
          <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "relative z-20 transition-opacity",
                  dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
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
        {/* Thumbnail preview - clean, no overlays */}
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

        {/* Tags footer - always at bottom */}
        {Array.isArray(model.tags) && model.tags.length > 0 && (
          <div className="mt-auto flex min-h-[24px] items-center gap-1.5 text-xs">
            {/* Desktop: show 2 tags */}
            <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
              {model.tags.slice(0, 2).map((tag) => {
                const filterLabel = "Filter by " + tag;
                return (
                  <button
                    aria-label={filterLabel}
                    className="relative z-20 min-w-0 cursor-pointer"
                    key={tag}
                    onClick={(e) => handleTagClick(tag, e)}
                    type="button"
                  >
                    <Badge
                      className="max-w-full whitespace-normal break-words text-left text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                      variant="secondary"
                    >
                      {tag}
                    </Badge>
                  </button>
                );
              })}
              {model.tags.length > 2 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      className="relative z-20 flex cursor-pointer items-center gap-0.5 border border-border/50 bg-muted/50 text-xs hover:bg-muted"
                      variant="secondary"
                    >
                      +{model.tags.length - 2}
                      <ChevronDown className="h-3 w-3" />
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-3" side="top">
                    <p className="mb-2 font-medium text-muted-foreground text-xs">
                      All tags ({model.tags.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {model.tags.map((tag) => {
                        const filterLabel = "Filter by " + tag;
                        return (
                          <button
                            aria-label={filterLabel}
                            className="cursor-pointer"
                            key={tag}
                            onClick={(e) => handleTagClick(tag, e)}
                            type="button"
                          >
                            <Badge
                              className="text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Mobile: show 1 tag */}
            <div className="flex min-w-0 items-center gap-1.5 sm:hidden">
              {model.tags.slice(0, 1).map((tag) => {
                const filterLabel = "Filter by " + tag;
                return (
                  <button
                    aria-label={filterLabel}
                    className="relative z-20 min-w-0 cursor-pointer"
                    key={tag}
                    onClick={(e) => handleTagClick(tag, e)}
                    type="button"
                  >
                    <Badge
                      className="max-w-full whitespace-normal break-words text-left text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                      variant="secondary"
                    >
                      {tag}
                    </Badge>
                  </button>
                );
              })}
              {model.tags.length > 1 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      className="relative z-20 flex cursor-pointer items-center gap-0.5 border border-border/50 bg-muted/50 text-xs hover:bg-muted"
                      variant="secondary"
                    >
                      +{model.tags.length - 1}
                      <ChevronDown className="h-3 w-3" />
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="w-[calc(100vw-2rem)] max-w-xs p-3"
                    side="top"
                  >
                    <p className="mb-2 font-medium text-muted-foreground text-xs">
                      All tags ({model.tags.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {model.tags.map((tag) => {
                        const filterLabel = "Filter by " + tag;
                        return (
                          <button
                            aria-label={filterLabel}
                            className="cursor-pointer"
                            key={tag}
                            onClick={(e) => handleTagClick(tag, e)}
                            type="button"
                          >
                            <Badge
                              className="text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{model.name}"? This action can be undone by
              contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteModel.mutate(model.id);
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
