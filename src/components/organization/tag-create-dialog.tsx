import { Dices, Loader2 } from "lucide-react";
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
import { useCreateTag } from "@/hooks/use-org-tags";

type TagCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// Random hue with fixed pleasant saturation/lightness keeps generated colors
// usable on both themes (no near-black or blown-out results). The column is
// nullable but we always send a color so new tags are never colorless.
function randomTagColor(): string {
  return hslToHex(Math.floor(Math.random() * 360), 65, 55);
}

export function TagCreateDialog({ open, onOpenChange }: TagCreateDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(randomTagColor);
  // Set when the chosen name already exists in the org; surfaced inline.
  const [takenName, setTakenName] = useState<string | null>(null);

  const createMutation = useCreateTag();

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
  const isValidHex = HEX_PATTERN.test(normalizedColor);

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

        <div className="space-y-2">
          <Label htmlFor="create-tag-color">Color</Label>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-9 w-9 shrink-0 rounded-md border border-black/10"
              style={isValidHex ? { backgroundColor: normalizedColor } : undefined}
            />
            <Input
              className="font-mono"
              id="create-tag-color"
              maxLength={7}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#rrggbb"
              value={color}
            />
            <Button
              aria-label="Random color"
              className="shrink-0"
              onClick={() => setColor(randomTagColor())}
              size="icon"
              type="button"
              variant="outline"
            >
              <Dices className="h-4 w-4" />
            </Button>
          </div>
        </div>

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
