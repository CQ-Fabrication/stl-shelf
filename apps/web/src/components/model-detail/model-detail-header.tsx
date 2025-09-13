import { Link } from '@tanstack/react-router';
import { ArrowLeft, Download, Edit, MoreVertical, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Model } from '../../../../server/src/types/model';

type ModelDetailHeaderProps = {
  model: Model;
  onUploadClick: () => void;
  onEditClick: () => void;
  onDownloadClick: () => void;
  onDeleteClick: () => void;
};

export const ModelDetailHeader = ({
  model,
  onUploadClick,
  onEditClick,
  onDownloadClick,
  onDeleteClick,
}: ModelDetailHeaderProps) => {
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
          <h1 className="mb-2 font-bold text-3xl">
            {model.latestMetadata.name}
          </h1>
          {model.latestMetadata.description && (
            <p className="text-muted-foreground">
              {model.latestMetadata.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={onUploadClick} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            New Version
          </Button>
          <Button onClick={onEditClick} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={onDownloadClick}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
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
