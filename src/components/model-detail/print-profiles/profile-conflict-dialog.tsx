/**
 * Profile Conflict Dialog
 *
 * Batch conflict resolution dialog shown when uploading 3MF files
 * that have similar printer names to existing profiles.
 */

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type ConflictResolution = "replace" | "keep_both" | "skip";

export type ConflictInfo = {
  file: File;
  existingProfileId: string;
  existingPrinterName: string;
  newPrinterName: string;
};

type ProfileConflictDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictInfo[];
  onResolve: (resolutions: Map<string, ConflictResolution>) => void;
  isResolving?: boolean;
};

export const ProfileConflictDialog = ({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  isResolving,
}: ProfileConflictDialogProps) => {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(
    () => new Map(conflicts.map((c) => [c.existingProfileId, "replace" as ConflictResolution])),
  );

  const handleResolutionChange = (profileId: string, resolution: ConflictResolution) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(profileId, resolution);
      return next;
    });
  };

  const handleResolveAll = () => {
    onResolve(resolutions);
  };

  const handleSkipAll = () => {
    const skipAll = new Map(
      conflicts.map((c) => [c.existingProfileId, "skip" as ConflictResolution]),
    );
    onResolve(skipAll);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Similar Profiles Found
          </DialogTitle>
          <DialogDescription>
            {conflicts.length === 1
              ? "A profile for a similar printer already exists."
              : `${conflicts.length} profiles for similar printers already exist.`}{" "}
            Choose how to handle each conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-4 overflow-y-auto py-4">
          {conflicts.map((conflict) => (
            <div className="space-y-3 rounded-lg border p-4" key={conflict.existingProfileId}>
              <div className="space-y-1">
                <p className="font-medium text-sm">{conflict.file.name}</p>
                <p className="text-muted-foreground text-xs">
                  Similar to existing:{" "}
                  <span className="font-medium">{conflict.existingPrinterName}</span>
                </p>
              </div>

              <RadioGroup
                disabled={isResolving}
                onValueChange={(value) =>
                  handleResolutionChange(conflict.existingProfileId, value as ConflictResolution)
                }
                value={resolutions.get(conflict.existingProfileId) ?? "replace"}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id={`${conflict.existingProfileId}-replace`} value="replace" />
                  <Label
                    className="cursor-pointer text-sm"
                    htmlFor={`${conflict.existingProfileId}-replace`}
                  >
                    Replace existing profile
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id={`${conflict.existingProfileId}-keep`} value="keep_both" />
                  <Label
                    className="cursor-pointer text-sm"
                    htmlFor={`${conflict.existingProfileId}-keep`}
                  >
                    Keep both profiles
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id={`${conflict.existingProfileId}-skip`} value="skip" />
                  <Label
                    className="cursor-pointer text-sm"
                    htmlFor={`${conflict.existingProfileId}-skip`}
                  >
                    Skip this file
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button disabled={isResolving} onClick={handleSkipAll} variant="outline">
            Skip All
          </Button>
          <Button disabled={isResolving} onClick={handleResolveAll}>
            {isResolving ? "Resolving..." : "Resolve Conflicts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
