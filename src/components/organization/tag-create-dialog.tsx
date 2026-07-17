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
import { useCreateTag } from "@/hooks/use-org-tags";
import { isValidTagColor, randomTagColor, TagColorField } from "./tag-color-field";

type TagCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagCreateDialog({ open, onOpenChange }: TagCreateDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(randomTagColor);
  // Set when the chosen name already exists in the org; surfaced inline.
  const [takenName, setTakenName] = useState<string | null>(null);

  const createMutation = useCreateTag();
  const { client } = useOpenPanelClient();

  const reset = () => {
    setName("");
    // Fresh random color for the next open, so Create is never blocked on color.
    setColor(randomTagColor());
    setTakenName(null);
  };

  const close = () => {
    onOpenChange(false);
    reset();
  };

  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase();
  const normalizedColor = color.trim().toLowerCase();
  const isValidHex = isValidTagColor(color);

  const handleCreate = () => {
    setTakenName(null);
    createMutation.mutate(
      { name: trimmed, color: normalizedColor },
      {
        onSuccess: (result) => {
          if (result.status === "name_taken") {
            setTakenName(normalized);
            return;
          }
          trackTagManagerAction(client, { action: "create" });
          toast.success(`Created "${result.tag.name}"`);
          close();
        },
        onError: () => toast.error("Failed to create tag"),
      },
    );
  };

  const isDisabled = trimmed.length === 0 || !isValidHex || createMutation.isPending;

  return (
    <Dialog onOpenChange={(next) => (next ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
          <DialogDescription>
            Names are normalized to lowercase. Pick a color to help it stand out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="create-tag-input">Name</Label>
          <Input
            id="create-tag-input"
            onChange={(e) => {
              setName(e.target.value);
              setTakenName(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDisabled) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="e.g. calibration"
            value={name}
          />
        </div>

        <TagColorField id="create-tag-color" onChange={setColor} value={color} />

        {takenName && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            A tag named "{takenName}" already exists.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={createMutation.isPending}
            onClick={close}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isDisabled} onClick={handleCreate} type="button">
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
