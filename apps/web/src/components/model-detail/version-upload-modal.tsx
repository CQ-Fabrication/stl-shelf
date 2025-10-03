import { useForm } from "@tanstack/react-form";
import { Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UploadFile = {
  file: File;
  id: string;
};

type FormData = {
  changelog: string;
  files: File[];
};

type VersionUploadModalProps = {
  modelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  isSubmitting: boolean;
};

const ACCEPTED_FORMATS = {
  "model/stl": [".stl"],
  "application/sla": [".stl"],
  "text/plain": [".obj"],
  "model/obj": [".obj"],
  "application/x-3mf": [".3mf"],
  "model/3mf": [".3mf"],
  "application/x-ply": [".ply"],
  "model/ply": [".ply"],
};

const ACCEPTED_EXTENSIONS = [".stl", ".obj", ".3mf", ".ply"];

export function VersionUploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: VersionUploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const form = useForm<FormData>({
    defaultValues: {
      changelog: "",
      files: [],
    },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);

      const currentFiles = form.state.values.files || [];
      const updatedFiles = [...currentFiles, ...acceptedFiles];
      form.setFieldValue("files", updatedFiles);
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
    maxSize: 100 * 1024 * 1024,
    disabled: isSubmitting,
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = uploadFiles.find((f) => f.id === fileId);
    if (!fileToRemove) return;

    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));

    const currentFiles = form.state.values.files || [];
    const updatedFiles = currentFiles.filter((f) => f !== fileToRemove.file);
    form.setFieldValue("files", updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setUploadFiles([]);
      onClose();
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setUploadFiles([]);
    }
  }, [isOpen, form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = form.state.values.files || [];
    const changelog = form.state.values.changelog.trim();

    if (files.length === 0) {
      form.setFieldMeta("files", (prev) => ({
        ...prev,
        errors: ["At least one file is required"],
      }));
      return;
    }

    if (files.length > 5) {
      form.setFieldMeta("files", (prev) => ({
        ...prev,
        errors: ["Maximum 5 files allowed"],
      }));
      return;
    }

    if (!changelog) {
      form.setFieldMeta("changelog", (prev) => ({
        ...prev,
        errors: ["Changelog is required"],
      }));
      return;
    }

    form.handleSubmit();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open={isOpen}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* File Upload Area */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              } ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-blue-600">Drop files here...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Supports: {ACCEPTED_EXTENSIONS.join(", ")} (max 100MB each)
                  </p>
                </div>
              )}
            </div>

            <form.Field name="files">
              {(field) =>
                field.state.meta.errors.length > 0 && (
                  <div className="text-red-600 text-sm">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )
              }
            </form.Field>

            {uploadFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected Files</h4>
                {uploadFiles.map((uploadFile) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={uploadFile.id}
                  >
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {uploadFile.file.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatFileSize(uploadFile.file.size)}
                        </div>
                      </div>
                    </div>
                    {!isSubmitting && (
                      <Button
                        onClick={() => removeFile(uploadFile.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Changelog */}
          <div className="space-y-2">
            <form.Field name="changelog">
              {(field) => (
                <>
                  <Label htmlFor="changelog">
                    Changelog <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    disabled={isSubmitting}
                    id="changelog"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe what changed in this version..."
                    rows={4}
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </>
              )}
            </form.Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Version
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
