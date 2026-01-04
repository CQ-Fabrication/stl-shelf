import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Calendar, FileText, HardDrive, ImageIcon, PenLine, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddFilesSection } from "@/components/model-detail/add-files-section";
import { AddFileSheet } from "@/components/model-detail/add-file-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TagEditor } from "@/components/model-detail/tag-editor";
import {
  type CompletenessCategory,
  type CompletenessOptions,
  COMPLETENESS_CATEGORY_INFO,
  canRemoveFile,
  formatGracePeriodRemaining,
  getCompletenessStatus,
  getCategoryFromExtension,
} from "@/lib/files/completeness";
import { formatDate, formatFileSize } from "@/utils/formatters";
import {
  getModel,
  getModelStatistics,
  getModelTags,
  getModelFiles,
  getModelVersions,
} from "@/server/functions/models";
import { removeFileFromVersion } from "@/server/functions/files";

type ModelInfoCardProps = {
  modelId: string;
  versionId?: string;
};

export const ModelInfoCard = ({ modelId, versionId }: ModelInfoCardProps) => {
  const queryClient = useQueryClient();
  const [addFileCategory, setAddFileCategory] = useState<CompletenessCategory | null>(null);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);

  const { data: model } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });
  const { isLoading: statsLoading } = useQuery({
    queryKey: ["model", modelId, "statistics"],
    queryFn: () => getModelStatistics({ data: { id: modelId } }),
  });
  const { data: tags } = useQuery({
    queryKey: ["model", modelId, "tags"],
    queryFn: () => getModelTags({ data: { id: modelId } }),
  });
  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ["model", modelId, "files", versionId],
    queryFn: () => getModelFiles({ data: { modelId, versionId: versionId! } }),
    enabled: !!versionId,
  });
  const { data: versions } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });

  const activeVersion = versionId ? versions?.find((v) => v.id === versionId) : versions?.[0];

  const completenessFiles = useMemo(() => {
    if (!files) return [];
    return files.map((f) => ({
      extension: f.extension,
      createdAt: f.createdAt,
    }));
  }, [files]);

  const completenessOptions: CompletenessOptions = useMemo(
    () => ({ hasThumbnail: !!activeVersion?.thumbnailUrl }),
    [activeVersion?.thumbnailUrl],
  );

  const completenessStatus = useMemo(
    () => getCompletenessStatus(completenessFiles, completenessOptions),
    [completenessFiles, completenessOptions],
  );

  const groupedFiles = useMemo(() => {
    if (!files) return { model: [], slicer: [], image: [] };

    const groups: Record<CompletenessCategory, typeof files> = {
      model: [],
      slicer: [],
      image: [],
    };

    for (const file of files) {
      const category = getCategoryFromExtension(file.extension);
      if (category) {
        groups[category].push(file);
      }
    }

    return groups;
  }, [files]);

  const handleAddFile = (category: CompletenessCategory) => {
    setAddFileCategory(category);
  };

  const handleAddFileSuccess = () => {
    refetchFiles();
    queryClient.invalidateQueries({ queryKey: ["models"] });
  };

  const handleRemoveFile = async (fileId: string) => {
    setRemovingFileId(fileId);
    try {
      await removeFileFromVersion({ data: { fileId } });
      toast.success("File removed successfully");
      refetchFiles();
      queryClient.invalidateQueries({ queryKey: ["models"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove file";
      toast.error(message);
    } finally {
      setRemovingFileId(null);
    }
  };

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (["stl", "obj", "ply"].includes(ext)) return Box;
    if (ext === "3mf") return Box;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ImageIcon;
    return FileText;
  };

  const getFileTypeBadgeVariant = (
    extension: string,
  ): "default" | "secondary" | "outline" | "destructive" => {
    const ext = extension.toLowerCase();
    switch (ext) {
      case "stl":
        return "default";
      case "obj":
        return "secondary";
      case "3mf":
        return "outline";
      case "ply":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (statsLoading || !model) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Information</span>
          {activeVersion && (
            <Badge className="font-normal text-brand" variant="outline">
              {activeVersion.version}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Thumbnail Preview */}
        {activeVersion?.thumbnailUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Preview</span>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <img
                alt={`Preview of ${model.name}`}
                className="aspect-video w-full object-cover"
                height={360}
                loading="lazy"
                src={activeVersion.thumbnailUrl}
                width={640}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Version Created</div>
              <div className="text-muted-foreground">
                {activeVersion?.createdAt ? formatDate(new Date(activeVersion.createdAt)) : "N/A"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Version Size</div>
              <div className="text-muted-foreground">
                {activeVersion?.files
                  ? formatFileSize(activeVersion.files.reduce((sum, file) => sum + file.size, 0))
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Changelog */}
        {activeVersion?.description && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">What's New</span>
              <Badge className="text-xs" variant="outline">
                {activeVersion.version}
              </Badge>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                {activeVersion.description}
              </p>
            </div>
          </div>
        )}

        {/* Files by Category */}
        {files && files.length > 0 && (
          <div className="space-y-4">
            {(["model", "slicer", "image"] as const).map((category) => {
              const categoryFiles = groupedFiles[category];
              const categoryInfo = COMPLETENESS_CATEGORY_INFO[category];

              if (categoryFiles.length === 0) return null;

              return (
                <div key={category}>
                  <div className="mb-2 flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{categoryInfo.label}</span>
                    <span className="text-muted-foreground text-xs">({categoryFiles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryFiles.map((file) => {
                      const Icon = getFileIcon(file.extension);
                      const removal = canRemoveFile({
                        extension: file.extension,
                        createdAt: file.createdAt,
                      });

                      return (
                        <div
                          className="group/file flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 transition-colors hover:bg-muted/80"
                          key={file.id}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-32 truncate text-sm" title={file.originalName}>
                            {file.originalName}
                          </span>
                          <Badge
                            className="text-xs"
                            variant={getFileTypeBadgeVariant(file.extension)}
                          >
                            {file.extension.toUpperCase()}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {formatFileSize(file.size)}
                          </span>
                          {removal.allowed && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    className="h-5 w-5 opacity-0 transition-opacity group-hover/file:opacity-100"
                                    disabled={removingFileId === file.id}
                                    onClick={() => handleRemoveFile(file.id)}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs" side="top">
                                  Remove file ({formatGracePeriodRemaining(removal.hoursRemaining!)}
                                  )
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Files Section */}
        {versionId && (
          <AddFilesSection
            completenessOptions={completenessOptions}
            files={completenessFiles}
            onAddFile={handleAddFile}
            status={completenessStatus}
          />
        )}

        {/* Tags */}
        <TagEditor currentTags={tags ?? []} modelId={modelId} />
      </CardContent>

      {/* Add File Sheet */}
      {addFileCategory && versionId && (
        <AddFileSheet
          category={addFileCategory}
          onOpenChange={(open) => !open && setAddFileCategory(null)}
          onSuccess={handleAddFileSuccess}
          open={!!addFileCategory}
          versionId={versionId}
        />
      )}
    </Card>
  );
};
