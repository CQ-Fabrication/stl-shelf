import type { FormApi } from "@tanstack/react-form";
import { AlertCircle, CheckCircle, FileText, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { uploadModalActions } from "@/stores/upload-modal.store";

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
};

type FormData = {
  name: string;
  description: string;
  tags: string[];
  files: File[];
  previewImage?: File;
  previewImageUrl?: string;
};

type StepFilesProps = {
  form: FormApi<FormData>;
  onNext: () => void;
  onPrev: () => void;
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
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

export function StepFiles({ form, onNext, onPrev }: StepFilesProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>(() => {
    const currentFiles = form.state.values.files || [];
    return currentFiles.map((file: File) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: "pending" as const,
      progress: 0,
    }));
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: "pending" as const,
        progress: 0,
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);

      const currentFiles = form.state.values.files || [];
      const updatedFiles = [...currentFiles, ...acceptedFiles];
      form.setFieldValue("files", updatedFiles);
      uploadModalActions.updateFormData("files", updatedFiles);

      if (!form.state.values.name && acceptedFiles.length > 0) {
        const fileName = acceptedFiles[0].name;
        const nameWithoutExt = fileName.replace(FILE_EXTENSION_REGEX, "");
        form.setFieldValue("name", nameWithoutExt);
        uploadModalActions.updateFormData("name", nameWithoutExt);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
    maxSize: 100 * 1024 * 1024,
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = uploadFiles.find((f) => f.id === fileId);
    if (!fileToRemove) return;

    setUploadFiles((prev) => prev.filter((f: UploadFile) => f.id !== fileId));

    const currentFiles = form.state.values.files || [];
    const updatedFiles = currentFiles.filter((f) => f !== fileToRemove.file);
    form.setFieldValue("files", updatedFiles);
    uploadModalActions.updateFormData("files", updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  const getFileIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading":
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleNext = () => {
    const files = form.state.values.files || [];

    if (files.length === 0) {
      form.setFieldMeta("files", (prev: any) => ({
        ...prev,
        errors: ["At least one file is required"],
        isValidating: false,
      }));
      return;
    }

    if (files.length > 5) {
      form.setFieldMeta("files", (prev: any) => ({
        ...prev,
        errors: ["Maximum 5 files allowed"],
        isValidating: false,
      }));
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
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
        {(field: any) =>
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
                {getFileIcon(uploadFile.status)}
                <div>
                  <div className="font-medium text-sm">
                    {uploadFile.file.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(uploadFile.file.size)}
                  </div>
                </div>
              </div>
              {uploadFile.status === "pending" && (
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

      <div className="flex justify-between pt-4">
        <Button onClick={onPrev} type="button" variant="outline">
          Previous
        </Button>
        <Button onClick={handleNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}
