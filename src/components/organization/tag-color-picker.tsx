import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PRESET_COLORS } from "./tag-colors";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

type TagColorPickerProps = {
  color: string | null;
  isSaving: boolean;
  onSelect: (color: string) => void;
};

// The color dot doubles as the popover trigger; the fallback dot is a muted ring.
export function TagColorPicker({ color, isSaving, onSelect }: TagColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(color ?? "#3b82f6");

  const trimmed = hex.trim();
  const isValidHex = HEX_PATTERN.test(trimmed);

  const apply = (next: string) => {
    if (next.toLowerCase() === (color ?? "").toLowerCase()) {
      setOpen(false);
      return;
    }
    onSelect(next);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label="Change tag color"
          className={cn(
            "h-4 w-4 shrink-0 rounded-full border transition-transform hover:scale-110",
            color ? "border-black/10" : "border-muted-foreground/40 border-dashed",
          )}
          style={color ? { backgroundColor: color } : undefined}
          type="button"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-3">
        <div className="grid grid-cols-8 gap-1.5">
          {PRESET_COLORS.map((preset) => (
            <button
              aria-label={`Set color ${preset}`}
              className={cn(
                "h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110",
                color?.toLowerCase() === preset && "ring-2 ring-ring ring-offset-1",
              )}
              key={preset}
              onClick={() => apply(preset)}
              style={{ backgroundColor: preset }}
              type="button"
            />
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="tag-hex">
            Custom hex
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-8 font-mono text-xs"
              id="tag-hex"
              maxLength={7}
              onChange={(e) => setHex(e.target.value)}
              placeholder="#rrggbb"
              value={hex}
            />
            <Button
              className="h-8"
              disabled={!isValidHex}
              onClick={() => apply(trimmed.toLowerCase())}
              size="sm"
            >
              Set
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
