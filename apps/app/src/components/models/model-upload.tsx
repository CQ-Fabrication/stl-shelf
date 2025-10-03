import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagCombobox } from "@/components/ui/tag-combobox";
import { orpc } from "@/utils/orpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

// Validation schema matching server expectations
const modelUploadSchema = z.object({
  name: z
    .string()
    .min(1, "Model name is required")
    .max(200, "Name must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .transform((val) => (val === "" ? undefined : val)),
  tags: z.array(z.string().min(1).max(64)).max(20, "Maximum 20 tags allowed"),
  files: z
    .array(z.instanceof(File))
    .min(1, "At least one file is required")
    .max(5, "Maximum 5 files allowed"),
  previewImage: z.union([z.instanceof(File), z.undefined()]),
});

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
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

export function ModelUpload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Fetch available tags for the organization
  const { data: availableTags = [] } = useQuery(
    orpc.models.getAllTags.queryOptions()
  );

  // Create model mutation using oRPC
  const createModelMutation = useMutation(
    orpc.models.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Successfully created model: ${data.slug}`);
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: orpc.models.getAllTags.key(),
        });
        // Navigate to the new model
        navigate({
          to: "/models/$modelId",
          params: { modelId: data.modelId },
        });
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
        // Update file states to error
        setUploadFiles((prev) =>
          prev.map((f) => ({ ...f, status: "error" as const }))
        );
      },
    })
  );

  // Form setup with TanStack Form
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      tags: [] as string[],
      files: [] as File[],
      previewImage: undefined as File | undefined,
    },
    validators: {
      onSubmit: modelUploadSchema,
    },
    onSubmit: ({ value }) => {
      // Update file states to uploading
      setUploadFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const }))
      );

      // Submit to oRPC mutation
      createModelMutation.mutate(value);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: "pending",
        progress: 0,
      }));

      setUploadFiles((prev) => [...prev, ...newFiles]);

      // Update form state with files
      const currentFiles = form.state.values.files || [];
      form.setFieldValue("files", [...currentFiles, ...acceptedFiles]);

      // Auto-set name from first file if not already set
      if (!form.state.values.name && acceptedFiles.length > 0) {
        const fileName = acceptedFiles[0].name;
        const nameWithoutExt = fileName.replace(FILE_EXTENSION_REGEX, "");
        form.setFieldValue("name", nameWithoutExt);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB max file size
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = uploadFiles.find((f) => f.id === fileId);
    if (!fileToRemove) return;

    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));

    // Update form state
    const currentFiles = form.state.values.files || [];
    const updatedFiles = currentFiles.filter((f) => f !== fileToRemove.file);
    form.setFieldValue("files", updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) {
      return "0 B";
    }
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

  const isUploading = createModelMutation.isPending;
  const previewImageInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setFieldValue("previewImage", file);
      const url = URL.createObjectURL(file);
      setPreviewImageUrl(url);
    }
  };

  const removePreviewImage = () => {
    form.setFieldValue("previewImage", undefined);
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
      setPreviewImageUrl(null);
    }
    if (previewImageInputRef.current) {
      previewImageInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 font-bold text-2xl">Upload New Model</h1>
        <p className="text-muted-foreground">
          Upload 3D model files and add metadata to your library.
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Model Details</CardTitle>
            <CardDescription>
              Provide information about your 3D model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name field */}
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Name <sup className="-ml-1 text-red-600">*</sup>
                  </Label>
                  <Input
                    disabled={isUploading}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter model name"
                    value={field.state.value}
                  />
                  {!field.state.meta.isValid && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Description field */}
            <form.Field name="description">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Input
                    disabled={isUploading}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optional description"
                    value={field.state.value || ""}
                  />
                  {!field.state.meta.isValid && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Tags field */}
            <form.Field name="tags">
              {(field) => (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagCombobox
                    allowCreate={true}
                    availableTags={availableTags}
                    disabled={isUploading}
                    onTagsChange={(tags) => field.handleChange(tags)}
                    placeholder="Select or create tags..."
                    selectedTags={field.state.value}
                  />
                  {!field.state.meta.isValid && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Preview Image field */}
            <div className="space-y-2">
              <Label>Preview Image</Label>
              <div className="space-y-3">
                {previewImageUrl ? (
                  <div className="relative">
                    <img
                      alt="Preview"
                      className="aspect-video w-full rounded-lg border object-cover"
                      height={360}
                      src={previewImageUrl}
                      width={640}
                    />
                    <Button
                      className="absolute top-2 right-2"
                      disabled={isUploading}
                      onClick={removePreviewImage}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-6 transition-colors hover:border-muted-foreground/50"
                    onClick={() => previewImageInputRef.current?.click()}
                    type="button"
                  >
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Click to add preview image
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      JPEG, PNG, or WebP (Optional)
                    </p>
                  </button>
                )}
                <input
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handlePreviewImageSelect}
                  ref={previewImageInputRef}
                  type="file"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Upload STL, OBJ, 3MF, or PLY files (max 100MB each)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-blue-600">Drop files here...</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Supports: {ACCEPTED_EXTENSIONS.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* File validation errors */}
            <form.Field name="files">
              {(field) =>
                !field.state.meta.isValid && (
                  <div className="mt-2 text-red-600 text-sm">
                    {field.state.meta.errors.join(", ")}
                  </div>
                )
              }
            </form.Field>

            {/* File list */}
            {uploadFiles.length > 0 && (
              <div className="mt-4 space-y-2">
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
                        disabled={isUploading}
                        onClick={() => removeFile(uploadFile.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit]) => (
            <div className="flex gap-4">
              <Button
                className="flex-1"
                disabled={!canSubmit || isUploading}
                type="submit"
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Model
                  </>
                )}
              </Button>
              <Button
                disabled={isUploading}
                onClick={() => navigate({ to: "/" })}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
