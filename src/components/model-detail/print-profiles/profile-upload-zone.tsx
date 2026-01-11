/**
 * Profile Upload Zone
 *
 * Drag-and-drop zone for uploading 3MF print profiles.
 * Supports multi-file upload with batch processing.
 */

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileUploadZoneProps = {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  className?: string;
};

export const ProfileUploadZone = ({
  onFilesSelected,
  isUploading,
  className,
}: ProfileUploadZoneProps) => {
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { file: File }[]) => {
      setRejectedFiles(fileRejections.map((r) => r.file.name));

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-package.3dmanufacturing-3dmodel+xml": [".3mf"],
      "application/octet-stream": [".3mf"],
    },
    disabled: isUploading,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          "cursor-default rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragActive && "border-brand bg-brand/5",
          isUploading && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">
              {isDragActive ? "Drop 3MF files here" : "Drag & drop 3MF files here"}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Supports Bambu Studio, PrusaSlicer, and OrcaSlicer
            </p>
          </div>
          <Button disabled={isUploading} onClick={open} size="sm" variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </div>
      </div>

      {/* Rejected files warning */}
      {rejectedFiles.length > 0 && (
        <div className="mt-2 flex items-start gap-2 text-amber-600 text-xs">
          <FileWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Some files were rejected:</p>
            <ul className="list-inside list-disc">
              {rejectedFiles.map((name) => (
                <li key={name}>{name} (not a .3mf file)</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
