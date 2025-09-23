import { Link } from '@tanstack/react-router';
import { Calendar, Download, Eye, HardDrive, MoreVertical, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';
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
    <Card className="group relative cursor-pointer transition-shadow hover:shadow-md">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="relative z-20 opacity-0 transition-opacity group-hover:opacity-100"
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
      <CardContent>
        {/* Thumbnail preview placeholder */}
        <div className="mb-3">
          <div className="aspect-video overflow-hidden rounded-md bg-muted transition-colors group-hover:bg-muted/80">
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <HardDrive className="mx-auto mb-2 h-8 w-8" />
                <div className="text-sm">No Preview</div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {model.description && (
          <CardDescription className="mb-3 line-clamp-2">
            {model.description}
          </CardDescription>
        )}

        {/* Tags */}
        {model.tags && model.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {model.tags.slice(0, 3).map((tag) => (
              <Badge className="text-xs" key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {model.tags.length > 3 && (
              <Badge className="text-xs" variant="secondary">
                +{model.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* File info */}
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <span>
              {model.fileCount} file{model.fileCount !== 1 ? 's' : ''}
            </span>
            <span>• {model.currentVersion}</span>
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