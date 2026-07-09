import { useRef, useState } from "react";
import { ImagePlus, Loader2, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes } from "@/lib/files/limits";
import { removeVersionThumbnail, replaceVersionThumbnail } from "@/server/functions/files";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_IMAGE_ATTR = "image/jpeg,image/png,image/webp";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type PreviewImageManagerProps = {
  modelId: string;
  versionId: string;
  modelName: string;
  thumbnailUrl: string | null;
};

export const PreviewImageManager = ({
  modelId,
  versionId,
  modelName,
  thumbnailUrl,
}: PreviewImageManagerProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const isBusy = isReplacing || isRemoving;

  const refreshAfterChange = () => {
    queryClient.invalidateQueries({ queryKey: ["model", modelId, "versions"] });
    queryClient.invalidateQueries({ queryKey: ["models"] });
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again re-triggers change.
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error("Preview image must be a JPG, PNG or WebP file");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(
        `Image too large. ${formatBytes(file.size)} exceeds the ${formatBytes(MAX_IMAGE_SIZE_BYTES)} limit`,
      );
      return;
    }

    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append("versionId", versionId);
      formData.append("image", file);

      await replaceVersionThumbnail({ data: formData });
      toast.success("Preview image updated");
      refreshAfterChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update preview image";
      toast.error(message);
    } finally {
      setIsReplacing(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeVersionThumbnail({ data: { versionId } });
      toast.success("Preview image removed");
      refreshAfterChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove preview image";
      toast.error(message);
    } finally {
      setIsRemoving(false);
      setConfirmRemoveOpen(false);
    }
  };

  return (
    <>
      <input
        accept={ACCEPTED_IMAGE_ATTR}
        className="hidden"
        onChange={handleFileSelected}
        ref={fileInputRef}
        type="file"
      />

      {thumbnailUrl ? (
        <div className="group/preview relative overflow-hidden rounded-lg border">
          <button
            aria-label="View preview image"
            className="block w-full"
            disabled={isBusy}
            onClick={() => setLightboxOpen(true)}
            type="button"
          >
            <img
              alt={`Preview of ${modelName}`}
              className="aspect-video w-full object-cover"
              height={360}
              loading="lazy"
              src={thumbnailUrl}
              width={640}
            />
          </button>

          {isBusy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Preview image options"
                className="absolute top-2 right-2 h-8 w-8 bg-background/80 opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover/preview:opacity-100"
                disabled={isBusy}
                size="icon"
                variant="secondary"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={openFilePicker}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Replace image…
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmRemoveOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <button
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted-foreground/25 border-dashed text-muted-foreground text-sm transition-colors hover:border-muted-foreground/50 hover:bg-muted/50 disabled:opacity-60"
          disabled={isBusy}
          onClick={openFilePicker}
          type="button"
        >
          {isReplacing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="font-medium">Add preview image…</span>
            </>
          )}
        </button>
      )}

      <Dialog onOpenChange={setLightboxOpen} open={lightboxOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Preview of {modelName}</DialogTitle>
          {thumbnailUrl && (
            <img
              alt={`Preview of ${modelName}`}
              className="h-auto max-h-[80vh] w-full rounded-md object-contain"
              src={thumbnailUrl}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setConfirmRemoveOpen} open={confirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove preview image?</AlertDialogTitle>
            <AlertDialogDescription>
              This preview will fall back to an attached image or 3MF preview if one exists, or be
              regenerated from the 3D view on the next visit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRemoving}
              onClick={(event) => {
                event.preventDefault();
                handleRemove();
              }}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
