import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackTagManagerAction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { useMergeTags, useRenameTag, type OrgTag } from "@/hooks/use-org-tags";

type TagRenameDialogProps = {
  tag: OrgTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagRenameDialog({ tag, open, onOpenChange }: TagRenameDialogProps) {
  const [name, setName] = useState(tag.name);
  // When a rename collides with an existing tag we hold its id here and offer a
  // merge instead of surfacing a raw unique-constraint failure.
  const [collisionTargetId, setCollisionTargetId] = useState<string | null>(null);

  const renameMutation = useRenameTag();
  const mergeMutation = useMergeTags();
  const { client } = useOpenPanelClient();

  const reset = () => {
    setName(tag.name);
    setCollisionTargetId(null);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const trimmed = name.trim();
  const collisionName = trimmed.toLowerCase();

  const handleRename = () => {
    setCollisionTargetId(null);
    renameMutation.mutate(
      { tagId: tag.id, newName: trimmed },
      {
        onSuccess: (result) => {
          if (result.status === "name_taken") {
            setCollisionTargetId(result.existingTagId ?? null);
            return;
          }
          if (result.status === "renamed") {
            trackTagManagerAction(client, { action: "rename" });
            toast.success(`Renamed to "${collisionName}"`);
          }
          close();
        },
        onError: () => toast.error("Failed to rename tag"),
      },
    );
  };

  const handleMerge = () => {
    if (!collisionTargetId) return;
    mergeMutation.mutate(
      { sourceTagId: tag.id, targetTagId: collisionTargetId },
      {
        onSuccess: (result) => {
          trackTagManagerAction(client, {
            action: "merge",
            modelsRelinked: result.modelsRelinked,
          });
          toast.success(
            `Merged into "${collisionName}" — ${result.modelsRelinked} model${
              result.modelsRelinked === 1 ? "" : "s"
            } moved`,
          );
          close();
        },
        onError: () => toast.error("Failed to merge tags"),
      },
    );
  };

  const isPending = renameMutation.isPending || mergeMutation.isPending;
  const isUnchanged = trimmed.length === 0 || collisionName === tag.name.toLowerCase();

  return (
    <Dialog onOpenChange={(next) => (next ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename tag</DialogTitle>
          <DialogDescription>
            Names are normalized to lowercase. Renaming updates the tag everywhere it's used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rename-tag-input">Name</Label>
          <Input
            id="rename-tag-input"
            onChange={(e) => {
              setName(e.target.value);
              setCollisionTargetId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isUnchanged && !collisionTargetId) {
                e.preventDefault();
                handleRename();
              }
            }}
            value={name}
          />
        </div>

        {collisionTargetId && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            A tag named "{collisionName}" already exists — merge into it instead? This moves this
            tag's {tag.usageCount} model{tag.usageCount === 1 ? "" : "s"} onto it and deletes "
            {tag.name}".
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button disabled={isPending} onClick={close} type="button" variant="outline">
            Cancel
          </Button>
          {collisionTargetId ? (
            <Button disabled={isPending} onClick={handleMerge} type="button">
              {mergeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Merge instead
            </Button>
          ) : (
            <Button disabled={isPending || isUnchanged} onClick={handleRename} type="button">
              {renameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
