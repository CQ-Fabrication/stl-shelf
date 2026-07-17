import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { useDeleteTag, type OrgTag } from "@/hooks/use-org-tags";

type TagDeleteDialogProps = {
  tag: OrgTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagDeleteDialog({ tag, open, onOpenChange }: TagDeleteDialogProps) {
  const deleteMutation = useDeleteTag();
  const inUse = tag.usageCount > 0;

  const handleDelete = () => {
    deleteMutation.mutate(
      { tagId: tag.id },
      {
        onSuccess: (result) => {
          toast.success(
            result.affectedModels > 0
              ? `Deleted "${tag.name}" — removed from ${result.affectedModels} model${
                  result.affectedModels === 1 ? "" : "s"
                }`
              : `Deleted "${tag.name}"`,
          );
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to delete tag"),
      },
    );
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{tag.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {inUse ? (
              <>
                This tag is in use. It will be removed from {tag.usageCount} model
                {tag.usageCount === 1 ? "" : "s"}. This can't be undone.
              </>
            ) : (
              <>This tag isn't used by any models. This can't be undone.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
