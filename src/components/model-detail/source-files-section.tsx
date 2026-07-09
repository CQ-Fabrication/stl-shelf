/**
 * Source Files Section
 *
 * Displays source files (STL, OBJ, 3MF model files) for a model version.
 * Extracted from model-info-card for use within tabs.
 */

import { useMemo, useState } from "react";
import { Box, FileText, HardDrive, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type CompletenessCategory,
  type CompletenessOptions,
  COMPLETENESS_CATEGORY_INFO,
  canRemoveFile,
  formatGracePeriodRemaining,
  getCategoryFromExtension,
  getCompletenessStatus,
} from "@/lib/files/completeness";
import { formatFileSize } from "@/utils/formatters";
import { removeFileFromVersion } from "@/server/functions/files";
import { AddFilesSection } from "@/components/model-detail/add-files-section";
import { AddFileSheet } from "@/components/model-detail/add-file-sheet";

type FileData = {
  id: string;
  originalName: string;
  extension: string;
  size: number;
  createdAt: Date | string;
};

type SourceFilesSectionProps = {
  modelId: string;
  versionId: string;
  files: FileData[];
  hasThumbnail: boolean;
  onFilesChanged: () => void;
};

export const SourceFilesSection = ({
  modelId,
  versionId,
  files,
  hasThumbnail,
  onFilesChanged,
}: SourceFilesSectionProps) => {
  const queryClient = useQueryClient();
  const [addFileCategory, setAddFileCategory] = useState<CompletenessCategory | null>(null);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const completenessFiles = useMemo(() => {
    return files.map((f) => ({
      extension: f.extension,
      createdAt: f.createdAt,
    }));
  }, [files]);

  const completenessOptions: CompletenessOptions = useMemo(
    () => ({ hasThumbnail }),
    [hasThumbnail],
  );

  const completenessStatus = useMemo(
    () => getCompletenessStatus(completenessFiles, completenessOptions),
    [completenessFiles, completenessOptions],
  );

  const groupedFiles = useMemo(() => {
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
    onFilesChanged();
    // Adding a file can change the version thumbnail (viewer poster, completeness badge)
    queryClient.invalidateQueries({ queryKey: ["model", modelId, "versions"] });
    queryClient.invalidateQueries({ queryKey: ["models"] });
  };

  const handleRemoveFile = async (fileId: string) => {
    setRemovingFileId(fileId);
    try {
      await removeFileFromVersion({ data: { fileId } });
      toast.success("File removed successfully");
      onFilesChanged();
      // Removing a file recomputes the version thumbnail server-side
      queryClient.invalidateQueries({ queryKey: ["model", modelId, "versions"] });
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

  return (
    <div className="space-y-4">
      {/* Files by Category */}
      {files.length > 0 && (
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
                    const imageUrl =
                      category === "image"
                        ? `/api/download/file/${file.id}?disposition=inline`
                        : null;

                    return (
                      <div
                        className="group/file flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 transition-colors hover:bg-muted/80"
                        key={file.id}
                      >
                        {imageUrl ? (
                          <button
                            aria-label={`View ${file.originalName}`}
                            className="flex min-w-0 cursor-pointer items-center gap-2"
                            onClick={() =>
                              setPreviewImage({ url: imageUrl, name: file.originalName })
                            }
                            type="button"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="max-w-32 truncate text-sm" title={file.originalName}>
                              {file.originalName}
                            </span>
                          </button>
                        ) : (
                          <>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="max-w-32 truncate text-sm" title={file.originalName}>
                              {file.originalName}
                            </span>
                          </>
                        )}
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
                                Remove file ({formatGracePeriodRemaining(removal.hoursRemaining!)})
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
      <AddFilesSection
        completenessOptions={completenessOptions}
        files={completenessFiles}
        onAddFile={handleAddFile}
        status={completenessStatus}
      />

      {/* Add File Sheet */}
      {addFileCategory && (
        <AddFileSheet
          category={addFileCategory}
          onOpenChange={(open) => !open && setAddFileCategory(null)}
          onSuccess={handleAddFileSuccess}
          open={!!addFileCategory}
          versionId={versionId}
        />
      )}

      {/* Image Preview Lightbox */}
      <Dialog onOpenChange={(open) => !open && setPreviewImage(null)} open={!!previewImage}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              alt={previewImage.name}
              className="max-h-[80vh] w-full object-contain"
              src={previewImage.url}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
