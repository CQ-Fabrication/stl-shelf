import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  FileText,
  ImageIcon,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, {
  type Crop as CropType,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  getFileSizeLimit,
  getFileSizeLimitLabel,
} from "@/lib/files/limits";
import type { VersionUploadFormType } from "../../use-version-upload-form";

type UploadFile = {
  file: File;
  id: string;
  category: CategoryKey;
};

type StepFilesProps = {
  form: VersionUploadFormType;
  onNext: () => void;
};

/**
 * UI categories for file grouping
 * Size limits are derived from centralized config per extension
 */
const FILE_CATEGORIES = {
  model: {
    key: "model",
    label: "Model",
    extensions: ["stl", "obj", "ply"],
  },
  slicer: {
    key: "slicer",
    label: "Project",
    extensions: ["3mf"],
  },
  image: {
    key: "image",
    label: "Image",
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
} as const;

type CategoryKey = keyof typeof FILE_CATEGORIES;

// Validated by extension only - browsers don't recognize 3D file MIME types
const ALL_EXTENSIONS = [
  ".stl",
  ".obj",
  ".3mf",
  ".ply",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function getFileCategory(filename: string): CategoryKey | null {
  const ext = getFileExtension(filename);
  for (const [key, category] of Object.entries(FILE_CATEGORIES)) {
    if ((category.extensions as readonly string[]).includes(ext)) {
      return key as CategoryKey;
    }
  }
  return null;
}

function getCategoryStatus(files: UploadFile[], previewImage?: File) {
  const result: Record<CategoryKey, { hasFiles: boolean; files: UploadFile[] }> =
    {
      model: { hasFiles: false, files: [] },
      slicer: { hasFiles: false, files: [] },
      image: { hasFiles: false, files: [] },
    };

  for (const file of files) {
    result[file.category].hasFiles = true;
    result[file.category].files.push(file);
  }

  // Check for preview image separately (handled by form)
  if (previewImage) {
    result.image.hasFiles = true;
  }

  return {
    ...result,
    hasModelFile: result.model.hasFiles,
  };
}


export function StepFiles({ form, onNext }: StepFilesProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>(() => {
    const currentFiles = form.state.values.files || [];
    return currentFiles.map((file: File) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      category: getFileCategory(file.name) ?? "model",
    }));
  });

  // Image cropping state
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    const existingFile = form.state.values.previewImage;
    return existingFile ? URL.createObjectURL(existingFile) : null;
  });
  const [isCropExpanded, setIsCropExpanded] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const categoryStatus = useMemo(
    () => getCategoryStatus(uploadFiles, form.state.values.previewImage),
    [uploadFiles, form.state.values.previewImage]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const new3DFiles: UploadFile[] = [];
      let newImageFile: File | null = null;

      for (const file of acceptedFiles) {
        const category = getFileCategory(file.name);
        if (!category) continue;

        const extension = getFileExtension(file.name);
        const sizeLimit = getFileSizeLimit(extension);

        // Validate file size per extension
        if (file.size > sizeLimit) {
          toast.error(`File too large: ${file.name}`, {
            description: `${formatBytes(file.size)} exceeds the ${getFileSizeLimitLabel(extension)} limit for .${extension} files`,
          });
          continue;
        }

        if (category === "image") {
          // Handle image separately - only one allowed
          newImageFile = file;
        } else {
          new3DFiles.push({
            file,
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            category,
          });
        }
      }

      // Add 3D files
      if (new3DFiles.length > 0) {
        setUploadFiles((prev) => [...prev, ...new3DFiles]);

        const currentFiles = form.state.values.files || [];
        const updatedFiles = [
          ...currentFiles,
          ...new3DFiles.map((f) => f.file),
        ];
        form.setFieldValue("files", updatedFiles);
      }

      // Handle image file
      if (newImageFile) {
        const url = URL.createObjectURL(newImageFile);
        setPreviewUrl(url);
        form.setFieldValue("previewImage", newImageFile);
        setScale(1);
        setCrop(undefined);
        setCompletedCrop(null);
      }
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, fileRejections) => {
      // Show toast for rejected files (unsupported type)
      for (const rejection of fileRejections) {
        const ext = getFileExtension(rejection.file.name) || "unknown";
        toast.error(`Unsupported file type: ${rejection.file.name}`, {
          description: `".${ext}" files are not supported. Use ${ALL_EXTENSIONS.join(", ")}`,
        });
      }

      onDrop(acceptedFiles);
    },
    multiple: true,
    validator: (file) => {
      const ext = `.${getFileExtension(file.name)}`;
      if (!ALL_EXTENSIONS.includes(ext)) {
        return {
          code: "file-invalid-type",
          message: `File type not supported: ${ext}`,
        };
      }
      return null;
    },
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = uploadFiles.find((f) => f.id === fileId);
    if (!fileToRemove) return;

    setUploadFiles((prev) => prev.filter((f) => f.id !== fileId));

    const currentFiles = form.state.values.files || [];
    const updatedFiles = currentFiles.filter(
      (f: File) => f !== fileToRemove.file
    );
    form.setFieldValue("files", updatedFiles);
  };

  const removePreviewImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    form.setFieldValue("previewImage", undefined);
    setIsCropExpanded(false);
    setCrop(undefined);
    setCompletedCrop(null);
    setScale(1);
  }, [previewUrl, form]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, 16 / 9, width, height),
      width,
      height
    );
    setCrop(newCrop);
  };

  const generateCroppedImage = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!(completedCrop && imgRef.current && previewCanvasRef.current)) {
        resolve();
        return;
      }

      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve();
        return;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = completedCrop.width * pixelRatio * scaleX;
      canvas.height = completedCrop.height * pixelRatio * scaleY;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], "preview.jpg", {
            type: "image/jpeg",
          });
          form.setFieldValue("previewImage", croppedFile);
        }
        resolve();
      }, "image/jpeg");
    });
  }, [completedCrop, form]);

  const handleNext = async () => {
    const files = form.state.values.files || [];

    if (files.length === 0) {
      toast.error("No files selected", {
        description: "Please upload at least one 3D model file",
      });
      return;
    }

    if (files.length > 5) {
      toast.error("Too many files", {
        description: "Maximum 5 files allowed per version",
      });
      return;
    }

    // Generate cropped image if needed
    if (completedCrop && imgRef.current && previewCanvasRef.current) {
      await generateCroppedImage();
    }

    onNext();
  };

  return (
    <div className="space-y-4">
      {/* Category Badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(FILE_CATEGORIES).map(([key, category]) => {
          const status = categoryStatus[key as CategoryKey];
          const hasFiles = status.hasFiles;

          return (
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                hasFiles
                  ? "border-green-500/30 bg-green-50 dark:border-green-500/20 dark:bg-green-950/30"
                  : "border-dashed border-muted-foreground/30"
              }`}
              key={key}
            >
              {hasFiles ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
              )}
              <div>
                <span
                  className={
                    hasFiles
                      ? "font-medium text-green-700 dark:text-green-300"
                      : "text-muted-foreground"
                  }
                >
                  {category.label}
                </span>
                <span className="ml-1.5 text-muted-foreground">
                  .{category.extensions.join(" .")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Warning */}
      {!categoryStatus.hasModelFile && uploadFiles.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-xs">
            <p className="font-medium">No model file</p>
            <p className="text-amber-700 dark:text-amber-300">
              Upload an STL, OBJ, or PLY file to enable 3D preview
            </p>
          </div>
        </div>
      )}

      {/* Unified Dropzone */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-blue-600 text-sm">Drop files here...</p>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-sm">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              {ALL_EXTENSIONS.join(", ")}
            </p>
            <p className="text-muted-foreground text-xs">
              STL/OBJ/PLY: 100-150MB • 3MF: 250MB • Images: 10MB
            </p>
          </div>
        )}
      </div>

      {/* Grouped File Lists */}
      {(uploadFiles.length > 0 || previewUrl) && (
        <div className="space-y-4">
          {/* Model Files */}
          {categoryStatus.model.files.length > 0 && (
            <FileGroup
              files={categoryStatus.model.files}
              label="Model"
              onRemove={removeFile}
            />
          )}

          {/* Slicer Files */}
          {categoryStatus.slicer.files.length > 0 && (
            <FileGroup
              files={categoryStatus.slicer.files}
              label="Slicer"
              onRemove={removeFile}
            />
          )}

          {/* Image Section with Inline Cropping */}
          {previewUrl && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                Image
              </h4>

              <div className="rounded-lg border">
                {/* Image Header Row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">
                        {form.state.values.previewImage?.name ?? "preview.jpg"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {form.state.values.previewImage
                          ? formatBytes(form.state.values.previewImage.size)
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsCropExpanded(!isCropExpanded)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Crop className="mr-1 h-3.5 w-3.5" />
                      Crop
                      {isCropExpanded ? (
                        <ChevronUp className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      onClick={removePreviewImage}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expandable Crop Section */}
                {isCropExpanded && (
                  <div className="space-y-4 border-t p-4">
                    <div className="mx-auto flex aspect-video max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                      <ReactCrop
                        aspect={16 / 9}
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                      >
                        <img
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                          onLoad={onImageLoad}
                          ref={imgRef}
                          src={previewUrl}
                          style={{ transform: `scale(${scale})` }}
                        />
                      </ReactCrop>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        disabled={scale <= 0.5}
                        onClick={() =>
                          setScale((prev) => Math.max(prev - 0.1, 0.5))
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-3">
                        <input
                          className="w-24"
                          max="3"
                          min="0.5"
                          onChange={(e) =>
                            setScale(Number.parseFloat(e.target.value))
                          }
                          step="0.1"
                          type="range"
                          value={scale}
                        />
                        <span className="min-w-[3rem] text-right text-muted-foreground text-sm">
                          {Math.round(scale * 100)}%
                        </span>
                      </div>
                      <Button
                        disabled={scale >= 3}
                        onClick={() =>
                          setScale((prev) => Math.min(prev + 0.1, 3))
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-center text-muted-foreground text-xs">
                      Adjust the crop area (16:9 ratio)
                    </p>

                    <canvas
                      className="hidden"
                      height={225}
                      ref={previewCanvasRef}
                      width={400}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}

function FileGroup({
  label,
  files,
  onRemove,
}: {
  label: string;
  files: UploadFile[];
  onRemove: (fileId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </h4>
      {files.map((uploadFile) => (
        <div
          className="flex items-center justify-between rounded-lg border p-3"
          key={uploadFile.id}
        >
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium text-sm">{uploadFile.file.name}</div>
              <div className="text-muted-foreground text-xs">
                {formatBytes(uploadFile.file.size)}
              </div>
            </div>
          </div>
          <Button
            onClick={() => onRemove(uploadFile.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
