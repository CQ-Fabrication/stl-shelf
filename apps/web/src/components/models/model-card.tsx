import { Link } from '@tanstack/react-router';
import { Calendar, Download, Eye, HardDrive, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useDeleteModel } from '@/hooks/use-delete-model';

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
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) {
      return '0 B';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <Card className="group relative h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
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
            <CardTitle className="line-clamp-2 text-lg">
              {model.name}
            </CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(model.updatedAt)}
              <HardDrive className="ml-2 h-3 w-3" />
              {formatFileSize(model.totalSize)}
            </div>
          </div>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "relative z-20 transition-opacity",
                  dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
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
      <CardContent className="flex flex-col flex-grow">
        {/* Thumbnail preview placeholder */}
        <div className="mb-3">
          <div className="aspect-video overflow-hidden rounded-md bg-muted transition-all group-hover:bg-gradient-to-br group-hover:from-muted/80 group-hover:to-brand/5">
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <HardDrive className="mx-auto mb-2 h-8 w-8" />
                <div className="text-sm">No Preview</div>
              </div>
            </div>
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
        <div className="flex items-center justify-between gap-3 text-xs min-h-[24px] mt-auto">
          {/* Tags on left - with reserved space to prevent layout shifts */}
          <div className="flex items-center gap-1 min-w-0 flex-1 max-w-[60%]">
            {model.tags && model.tags.length > 0 ? (
              <TooltipProvider>
                {/* Desktop: show 2 tags */}
                <div className="hidden sm:flex items-center gap-1 min-w-0">
                  {model.tags.slice(0, 2).map((tag) => (
                    <Tooltip key={tag}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="max-w-24 truncate cursor-help text-xs hover:bg-secondary/80 transition-colors"
                          title={tag.length > 12 ? tag : undefined}
                        >
                          {tag}
                        </Badge>
                      </TooltipTrigger>
                      {tag.length > 12 && (
                        <TooltipContent side="top">
                          <p className="text-xs font-medium">{tag}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {model.tags.length > 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="cursor-help text-xs hover:bg-accent transition-colors min-w-[2rem] text-center"
                        >
                          +{model.tags.length - 2}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-medium mb-2 text-xs">Additional tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.tags.slice(2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Mobile: show 1 tag with improved touch targets */}
                <div className="flex sm:hidden items-center gap-1.5 min-w-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="max-w-20 truncate text-xs min-h-6 px-2 cursor-pointer"
                        title={model.tags[0].length > 8 ? model.tags[0] : undefined}
                      >
                        {model.tags[0]}
                      </Badge>
                    </TooltipTrigger>
                    {model.tags[0].length > 8 && (
                      <TooltipContent side="top">
                        <p className="text-xs font-medium">{model.tags[0]}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {model.tags.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-xs min-h-6 px-2 cursor-pointer min-w-[2.5rem] text-center"
                        >
                          +{model.tags.length - 1}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-medium mb-2 text-xs">All tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {model.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
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
          <div className="flex items-center text-muted-foreground shrink-0 min-w-[40%] justify-end">
            <span className="whitespace-nowrap">
              {model.fileCount} file{model.fileCount !== 1 ? 's' : ''}
            </span>
            <span className="mx-1.5 text-muted-foreground/60">•</span>
            <span className="whitespace-nowrap font-medium text-brand">
              {model.currentVersion}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{model.name}"?
              This action can be undone by contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteModel.mutate({ id: model.id });
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

ModelCard.displayName = 'ModelCard';

export { ModelCard };
export default ModelCard;