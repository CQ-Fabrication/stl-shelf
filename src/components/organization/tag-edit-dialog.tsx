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
import { useMergeTags, useRenameTag, useUpdateTagColor, type OrgTag } from "@/hooks/use-org-tags";
import { isValidTagColor, randomTagColor, TagColorField } from "./tag-color-field";

type TagEditDialogProps = {
  tag: OrgTag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagEditDialog({ tag, open, onOpenChange }: TagEditDialogProps) {
  const [name, setName] = useState(tag.name);
  // Colorless tags get a random suggestion so the field is always actionable.
  const [color, setColor] = useState<string>(tag.color ?? randomTagColor());
  // When a rename collides with an existing tag we hold its id here and offer a
  // merge instead of surfacing a raw unique-constraint failure.
  const [collisionTargetId, setCollisionTargetId] = useState<string | null>(null);

  const renameMutation = useRenameTag();
  const colorMutation = useUpdateTagColor();
  const mergeMutation = useMergeTags();
  const { client } = useOpenPanelClient();

  const reset = () => {
    setName(tag.name);
    setColor(tag.color ?? randomTagColor());
    setCollisionTargetId(null);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const trimmed = name.trim();
  const normalizedName = trimmed.toLowerCase();
  const normalizedColor = color.trim().toLowerCase();
  const isValidHex = isValidTagColor(color);

  const nameChanged = trimmed.length > 0 && normalizedName !== tag.name.toLowerCase();
  const colorChanged = normalizedColor !== (tag.color ?? "").toLowerCase();

  const isPending = renameMutation.isPending || colorMutation.isPending || mergeMutation.isPending;
  const isDisabled =
    trimmed.length === 0 || (!nameChanged && !colorChanged) || !isValidHex || isPending;

  const applyColorOnly = () => {
    colorMutation.mutate(
      { tagId: tag.id, color: normalizedColor },
      {
        onSuccess: () => {
          trackTagManagerAction(client, { action: "recolor" });
          toast.success("Tag color updated");
          close();
        },
        onError: () => toast.error("Failed to update tag color"),
      },
    );
  };

  const handleSave = () => {
    setCollisionTargetId(null);

    if (!nameChanged && colorChanged) {
      applyColorOnly();
      return;
    }

    renameMutation.mutate(
      { tagId: tag.id, newName: trimmed },
      {
        onSuccess: (result) => {
          if (result.status === "name_taken") {
            setCollisionTargetId(result.existingTagId ?? null);
            return;
          }
          if (result.status !== "renamed") {
            close();
            return;
          }

          trackTagManagerAction(client, { action: "rename" });

          if (colorChanged) {
            colorMutation.mutate(
              { tagId: tag.id, color: normalizedColor },
              {
                onSuccess: () => {
                  trackTagManagerAction(client, { action: "recolor" });
                  toast.success(`Renamed to "${normalizedName}" and recolored`);
                  close();
                },
                onError: () => {
                  toast.error("Renamed, but failed to update color");
                  close();
                },
              },
            );
            return;
          }

          toast.success(`Renamed to "${normalizedName}"`);
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
            `Merged into "${normalizedName}" — ${result.modelsRelinked} model${
              result.modelsRelinked === 1 ? "" : "s"
            } moved`,
          );
          close();
        },
        onError: () => toast.error("Failed to merge tags"),
      },
    );
  };

  return (
    <Dialog onOpenChange={(next) => (next ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit tag</DialogTitle>
          <DialogDescription>
            Names are normalized to lowercase. Renaming updates the tag everywhere it's used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="edit-tag-input">Name</Label>
          <Input
            id="edit-tag-input"
            onChange={(e) => {
              setName(e.target.value);
              setCollisionTargetId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDisabled && !collisionTargetId) {
                e.preventDefault();
                handleSave();
              }
            }}
            value={name}
          />
        </div>

        <TagColorField id="edit-tag-color" onChange={setColor} value={color} />

        {collisionTargetId && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            A tag named "{normalizedName}" already exists — merge into it instead? This moves this
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
            <Button disabled={isDisabled} onClick={handleSave} type="button">
              {(renameMutation.isPending || colorMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
