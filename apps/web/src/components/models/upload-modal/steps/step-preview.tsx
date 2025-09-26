import type { FormApi } from "@tanstack/react-form";
import { ImageIcon, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { uploadModalActions } from "@/stores/upload-modal.store";

type FormData = {
  name: string;
  description: string;
  tags: string[];
  files: File[];
  previewImage?: File;
  previewImageUrl?: string;
};

type StepPreviewProps = {
  form: FormApi<FormData>;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function StepPreview({
  form,
  onPrev,
  onSubmit,
  isSubmitting,
}: StepPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    const existingFile = form.state.values.previewImage;
    if (existingFile) {
      return URL.createObjectURL(existingFile);
    }
    return null;
  });

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });

  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        form.setFieldValue("previewImage", file);
        uploadModalActions.updateFormData("previewImage", file);
        uploadModalActions.updateFormData("previewImageUrl", url);
        setScale(1);
        setCrop({
          unit: "%",
          width: 90,
          height: 90,
          x: 5,
          y: 5,
        });
      }
    },
    [form]
  );

  const removePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    form.setFieldValue("previewImage", undefined);
    uploadModalActions.updateFormData("previewImage", undefined);
    uploadModalActions.updateFormData("previewImageUrl", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl, form]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
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
          uploadModalActions.updateFormData("previewImage", croppedFile);
        }
        resolve();
      }, "image/jpeg");
    });
  }, [completedCrop, form]);

  const handleSubmit = async () => {
    if (completedCrop && imgRef.current && previewCanvasRef.current) {
      await generateCroppedImage();
    }
    onSubmit();
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="overflow-hidden rounded-lg border bg-muted/20">
              <ReactCrop
                aspect={16 / 9}
                className="max-h-[400px]"
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  alt="Preview"
                  className="max-w-full"
                  ref={imgRef}
                  src={previewUrl}
                  style={{ transform: `scale(${scale})` }}
                />
              </ReactCrop>
            </div>
            <Button
              className="absolute top-2 right-2"
              disabled={isSubmitting}
              onClick={removePreview}
              size="sm"
              type="button"
              variant="secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              disabled={scale <= 0.5}
              onClick={handleZoomOut}
              size="sm"
              type="button"
              variant="outline"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <input
                className="w-32"
                max="3"
                min="0.5"
                onChange={(e) => setScale(Number.parseFloat(e.target.value))}
                step="0.1"
                type="range"
                value={scale}
              />
              <span className="text-muted-foreground text-sm">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <Button
              disabled={scale >= 3}
              onClick={handleZoomIn}
              size="sm"
              type="button"
              variant="outline"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <canvas
            className="hidden"
            height={225}
            ref={previewCanvasRef}
            width={400}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <button
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed p-8 transition-colors hover:border-muted-foreground/50"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <ImageIcon className="mb-2 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Click to add preview image
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              JPEG, PNG, or WebP (Optional)
            </p>
          </button>
          <input
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            disabled={isSubmitting}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
        </div>
      )}

      <p className="text-center text-muted-foreground text-sm">
        Preview image is optional and helps others discover your model
      </p>

      <div className="flex justify-between pt-4">
        <Button
          disabled={isSubmitting}
          onClick={onPrev}
          type="button"
          variant="outline"
        >
          Previous
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
          {isSubmitting ? (
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
      </div>
    </div>
  );
}
