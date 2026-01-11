/**
 * Print Profile Card
 *
 * Displays a single print profile with:
 * - Printer name and filament summary (primary)
 * - Print time, weight, copies (secondary)
 * - Settings details (tertiary)
 * - Download/Delete actions
 */

import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnknownSlicerForm } from "./unknown-slicer-form";
import { formatFileSize } from "@/utils/formatters";
import type { PrintProfileMetadata } from "@/types/print-profiles";

type PrintProfileCardProps = {
  profile: {
    id: string;
    printerName: string;
    thumbnailUrl: string | null;
    slicerType: string | null;
    metadata: PrintProfileMetadata | null;
    file: {
      id: string;
      filename: string;
      originalName: string;
      size: number;
    };
  };
  onDownload: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format a decimal number to remove floating point precision issues
 * 0.20000000298023224 -> "0.2"
 */
const formatDecimal = (value: number): string => {
  // Round to 2 decimal places and remove trailing zeros
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
};

const SLICER_LABELS: Record<string, string> = {
  bambu: "Bambu Studio",
  orca: "OrcaSlicer",
  prusa: "PrusaSlicer",
  unknown: "Unknown",
};

export const PrintProfileCard = ({
  profile,
  onDownload,
  onDelete,
  isDeleting,
}: PrintProfileCardProps) => {
  const { metadata, slicerType } = profile;

  return (
    <div className="flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      {/* Thumbnail (if exists) */}
      {profile.thumbnailUrl && (
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded">
          <img
            alt={`${profile.printerName} preview`}
            className="h-full w-full object-cover"
            loading="lazy"
            src={profile.thumbnailUrl}
          />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Primary: Printer + Slicer badge */}
        <div className="flex items-center gap-2">
          <h4 className="truncate font-medium">{profile.printerName}</h4>
          {slicerType && slicerType !== "unknown" && (
            <Badge className="flex-shrink-0 text-xs" variant="outline">
              {SLICER_LABELS[slicerType] || slicerType}
            </Badge>
          )}
        </div>

        {/* Filament summary */}
        {metadata?.filamentSummary && (
          <p className="truncate text-muted-foreground text-sm">{metadata.filamentSummary}</p>
        )}

        {/* Secondary: Time + Weight + Copies */}
        {metadata && (
          <p className="text-muted-foreground text-sm">
            {metadata.printTime && <span>{formatDuration(metadata.printTime)}</span>}
            {metadata.filamentWeight && (
              <span>
                {metadata.printTime && " · "}
                {metadata.filamentWeight}g
              </span>
            )}
            {metadata.plateInfo && metadata.plateInfo.copiesPerPlate > 1 && (
              <span> · {metadata.plateInfo.copiesPerPlate} copies</span>
            )}
          </p>
        )}

        {/* Tertiary: Settings */}
        {metadata?.settings && (
          <p className="text-muted-foreground text-xs">
            {metadata.settings.layerHeight && (
              <span>{formatDecimal(metadata.settings.layerHeight)}mm</span>
            )}
            {metadata.settings.infill && (
              <span>
                {metadata.settings.layerHeight && " · "}
                {metadata.settings.infill}% infill
              </span>
            )}
            {metadata.settings.nozzleTemp && (
              <span>
                {" · "}
                {metadata.settings.nozzleTemp}/{metadata.settings.bedTemp || "?"}°C
              </span>
            )}
          </p>
        )}

        {/* File info */}
        <p className="text-muted-foreground text-xs">
          {profile.file.originalName} ({formatFileSize(profile.file.size)})
        </p>

        {/* Unknown slicer feedback form */}
        {slicerType === "unknown" && <UnknownSlicerForm profileId={profile.id} />}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-start gap-1">
        <Button onClick={onDownload} size="icon" variant="ghost">
          <Download className="h-4 w-4" />
        </Button>
        <Button disabled={isDeleting} onClick={onDelete} size="icon" variant="ghost">
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
};
