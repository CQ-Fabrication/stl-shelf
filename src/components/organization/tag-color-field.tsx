import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
// nullable but we always send a color so tags are never colorless.
export function randomTagColor(): string {
  return hslToHex(Math.floor(Math.random() * 360), 65, 55);
}

export function isValidTagColor(color: string): boolean {
  return HEX_PATTERN.test(color.trim().toLowerCase());
}

type TagColorFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

// GitHub-labels-style color field: preview chip + #rrggbb hex input + random
// button. Shared by the create and edit dialogs; owns hex validation.
export function TagColorField({ id, value, onChange }: TagColorFieldProps) {
  const normalized = value.trim().toLowerCase();
  const isValidHex = HEX_PATTERN.test(normalized);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Color</Label>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-9 w-9 shrink-0 rounded-md border border-black/10"
          style={isValidHex ? { backgroundColor: normalized } : undefined}
        />
        <Input
          className="font-mono"
          id={id}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#rrggbb"
          value={value}
        />
        <Button
          aria-label="Random color"
          className="shrink-0"
          onClick={() => onChange(randomTagColor())}
          size="icon"
          type="button"
          variant="outline"
        >
          <Dices className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
