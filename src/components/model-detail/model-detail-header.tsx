import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, History, MoreVertical, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { FileCompleteness } from "@/components/model-detail/file-completeness";
import { InlineNameEditor } from "@/components/model-detail/inline-name-editor";
import { useModelFiles } from "@/hooks/use-model-files";
import { useZipDownload } from "@/hooks/use-zip-download";
import { type CompletenessOptions, getCompletenessStatus } from "@/lib/files/completeness";
import { getModel } from "@/server/functions/models";

type ModelDetailHeaderProps = {
  modelId: string;
  activeVersion?: string;
  onDeleteClick: () => void;
  onUploadVersionClick: () => void;
  onChangelogClick: () => void;
};

export const ModelDetailHeader = ({
  modelId,
  activeVersion,
  onDeleteClick,
  onUploadVersionClick,
  onChangelogClick,
}: ModelDetailHeaderProps) => {
  const [isEditingName, setIsEditingName] = useState(false);

  const { data: model, isLoading } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });

  const {
    files,
    modelFiles,
    activeVersion: version,
  } = useModelFiles({
    modelId,
    versionId: activeVersion,
  });

  const { handleDownloadZip, isDownloading } = useZipDownload({
    modelName: model?.name ?? "model",
    activeVersion: version,
  });

  const completenessOptions: CompletenessOptions = useMemo(
    () => ({ hasThumbnail: !!version?.thumbnailUrl }),
    [version?.thumbnailUrl],
  );

  const completenessStatus = useMemo(() => {
    if (!files) return null;
    return getCompletenessStatus(
      files.map((f) => ({
        extension: f.extension,
        createdAt: f.createdAt,
      })),
      completenessOptions,
    );
  }, [files, completenessOptions]);

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/library">
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
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <InlineNameEditor
            modelId={modelId}
            name={model.name}
            onEditEnd={() => setIsEditingName(false)}
            onEditStart={() => setIsEditingName(true)}
          />
          {model.description && <p className="mt-3 text-muted-foreground">{model.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <GradientAvatar
                      className="ring-1 ring-border/50"
                      id={model.owner.id}
                      name={model.owner.name}
                      size="xs"
                      src={model.owner.image}
                    />
                    <span>
                      Uploaded by{" "}
                      <span className="font-medium text-foreground">{model.owner.name}</span>
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Model owner</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {completenessStatus && <FileCompleteness status={completenessStatus} variant="badge" />}
          </div>
        </div>
        {!isEditingName && (
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={isDownloading || !modelFiles?.length}
              onClick={handleDownloadZip}
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onUploadVersionClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Version
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onChangelogClick}>
                  <History className="mr-2 h-4 w-4" />
                  Version History
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onDeleteClick}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Model
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};
