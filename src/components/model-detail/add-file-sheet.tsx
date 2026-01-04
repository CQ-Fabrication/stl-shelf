import { Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type CompletenessCategory,
  COMPLETENESS_CATEGORY_INFO,
  getAcceptedTypesForCategory,
} from "@/lib/files/completeness";
import { formatBytes, getFileSizeLimit } from "@/lib/files/limits";
import { cn } from "@/lib/utils";
import { addFileToVersion } from "@/server/functions/files";

type AddFileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: string;
  category: CompletenessCategory;
  onSuccess: () => void;
};

export const AddFileSheet = ({
  open,
  onOpenChange,
  versionId,
  category,
  onSuccess,
}: AddFileSheetProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const categoryInfo = COMPLETENESS_CATEGORY_INFO[category];
  const acceptedTypes = getAcceptedTypesForCategory(category);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const maxSize = getFileSizeLimit(extension);

    if (file.size > maxSize) {
      toast.error(
        `File too large. ${formatBytes(file.size)} exceeds the ${formatBytes(maxSize)} limit for .${extension} files`,
      );
      return;
    }

    setSelectedFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.split(",").reduce(
      (acc, ext) => {
        acc[`application/${ext.replace(".", "")}`] = [ext];
        return acc;
      },
      {} as Record<string, string[]>,
    ),
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("versionId", versionId);
      formData.append("file", selectedFile);

      setUploadProgress(30);

      const result = await addFileToVersion({ data: formData });

      setUploadProgress(100);

      if (result.success) {
        toast.success(`${categoryInfo.singularLabel} added successfully`, {
          description: "You can remove this file within 24 hours if needed.",
        });
        onSuccess();
        handleClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload file";
      toast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <Sheet onOpenChange={handleClose} open={open}>
      <SheetContent className="flex flex-col sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>{categoryInfo.addLabel}</SheetTitle>
          <SheetDescription>{categoryInfo.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                isDragActive
                  ? "border-brand bg-brand/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
              )}
            >
              <input {...getInputProps()} />
              <Upload
                className={cn(
                  "mb-4 h-10 w-10",
                  isDragActive ? "text-brand" : "text-muted-foreground",
                )}
              />
              {isDragActive ? (
                <p className="font-medium text-brand">Drop the file here</p>
              ) : (
                <>
                  <p className="font-medium text-foreground">Drop a file here or click to browse</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Accepted: {categoryInfo.extensions.join(", ")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">{formatBytes(selectedFile.size)}</p>
                </div>
                <Button
                  disabled={isUploading}
                  onClick={handleRemoveFile}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress className="h-2" value={uploadProgress} />
                  <p className="text-center text-muted-foreground text-sm">Uploading...</p>
                </div>
              )}

              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <p className="text-sky-700 text-sm dark:text-sky-400">
                  You can remove this file within 24 hours if needed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button className="flex-1" disabled={isUploading} onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button className="flex-1" disabled={!selectedFile || isUploading} onClick={handleUpload}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
