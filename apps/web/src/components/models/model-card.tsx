import { Link } from '@tanstack/react-router';
import { Calendar, Download, Eye, HardDrive, MoreVertical } from 'lucide-react';
// Import types from server
import type { Model } from '../../../../server/src/types/model';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

type ModelCardProps = {
  model: Model;
};

export function ModelCard({ model }: ModelCardProps) {
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

  const getTotalSize = () => {
    return model.versions
      .at(-1)
      .files.reduce((sum, file) => sum + file.size, 0);
  };

  const latestVersion = model.versions.at(-1);
  const thumbnailUrl = latestVersion.thumbnailPath
    ? `${import.meta.env.VITE_SERVER_URL}/thumbnails/${model.id}/${latestVersion.version}`
    : null;

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-lg">
              {model.latestMetadata.name}
            </CardTitle>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(model.updatedAt)}
              <HardDrive className="ml-2 h-3 w-3" />
              {formatFileSize(getTotalSize())}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="opacity-0 transition-opacity group-hover:opacity-100"
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Thumbnail preview */}
        <div className="mb-3">
          <Link params={{ modelId: model.id }} to="/models/$modelId">
            <div className="aspect-video cursor-pointer overflow-hidden rounded-md bg-muted transition-colors hover:bg-muted/80">
              {thumbnailUrl ? (
                <img
                  alt={`${model.latestMetadata.name} preview`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  src={thumbnailUrl}
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
          </Link>
        </div>

        {/* Description */}
        {model.latestMetadata.description && (
          <CardDescription className="mb-3 line-clamp-2">
            {model.latestMetadata.description}
          </CardDescription>
        )}

        {/* Tags */}
        {model.latestMetadata.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {model.latestMetadata.tags.slice(0, 3).map((tag) => (
              <Badge className="text-xs" key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {model.latestMetadata.tags.length > 3 && (
              <Badge className="text-xs" variant="secondary">
                +{model.latestMetadata.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* File info */}
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <span>
              {latestVersion.files.length} file
              {latestVersion.files.length !== 1 ? 's' : ''}
            </span>
            {model.totalVersions > 1 && <span>• v{model.totalVersions}</span>}
          </div>
          <div className="flex gap-1">
            {latestVersion.files.slice(0, 2).map((file) => (
              <Badge className="text-xs" key={file.filename} variant="outline">
                {file.extension.slice(1).toUpperCase()}
              </Badge>
            ))}
            {latestVersion.files.length > 2 && (
              <Badge className="text-xs" variant="outline">
                +{latestVersion.files.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
