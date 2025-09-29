import type { FormApi } from "@tanstack/react-form";
import { ImageIcon, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
  type PixelCrop,
} from "react-image-crop";
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

  const [crop, setCrop] = useState<Crop>();

  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        form.setFieldValue("previewImage", file);
        uploadModalActions.updateFormData("previewImage", file);
        uploadModalActions.updateFormData("previewImageUrl", url);
        setScale(1);
        setCrop(undefined);
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

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        16 / 9,
        width,
        height
      ),
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
    <div className="space-y-6">
      {previewUrl ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
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
            <Button
              className="absolute top-3 right-3 z-10 shadow-md"
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
            <div className="flex items-center gap-3">
              <input
                className="w-32"
                max="3"
                min="0.5"
                onChange={(e) => setScale(Number.parseFloat(e.target.value))}
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
              onClick={handleZoomIn}
              size="sm"
              type="button"
              variant="outline"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-muted-foreground text-sm">
            Adjust the crop area to select your preview image (16:9 ratio)
          </p>

          <canvas
            className="hidden"
            height={225}
            ref={previewCanvasRef}
            width={400}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="aspect-video w-full">
            <button
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed bg-muted/10 transition-colors hover:border-muted-foreground/50 hover:bg-muted/20"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <ImageIcon className="mb-3 h-16 w-16 text-muted-foreground" />
              <p className="text-base text-muted-foreground">
                Click to add preview image
              </p>
              <p className="mt-2 text-muted-foreground text-sm">
                JPEG, PNG, or WebP • 16:9 ratio recommended
              </p>
            </button>
          </div>
          <input
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            disabled={isSubmitting}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
          <p className="text-center text-muted-foreground text-sm">
            Preview image is optional and helps others discover your model
          </p>
        </div>
      )}

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
