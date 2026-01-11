/**
 * Print Profile types for multi-printer 3MF slicer file support
 */

export type SlicerType = "bambu" | "prusa" | "orca" | "unknown";

export type PrintProfileSettings = {
  layerHeight: number | null; // mm
  infill: number | null; // percentage (0-100)
  nozzleTemp: number | null; // celsius
  bedTemp: number | null; // celsius
};

export type PrintProfilePlateInfo = {
  count: number; // number of plates
  copiesPerPlate: number; // items per plate
};

export type PrintProfileMetadata = {
  printTime: number | null; // seconds
  filamentSummary: string | null; // "PLA (Red)" or "2x PLA (Red, Blue) + PETG"
  settings: PrintProfileSettings | null;
  plateInfo: PrintProfilePlateInfo | null;
  filamentWeight: number | null; // grams (total across all materials)
};

export type PrintProfile = {
  id: string;
  versionId: string;
  printerName: string;
  printerNameNormalized: string;
  fileId: string;
  thumbnailPath: string | null;
  slicerType: SlicerType | null;
  metadata: PrintProfileMetadata | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PrintProfileWithFile = PrintProfile & {
  file: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    storageKey: string;
  };
};

// Upload flow types
export type ProfileConflictInfo = {
  existingProfile: {
    id: string;
    printerName: string;
    createdAt: Date;
  };
  newProfile: {
    printerName: string;
    metadata: PrintProfileMetadata | null;
  };
};

export type ConflictResolution =
  | { action: "replace"; existingProfileId: string }
  | { action: "keep_both" } // Creates with auto-suffix
  | { action: "cancel" };

export type ProfileUploadResult =
  | { success: true; profile: PrintProfile }
  | { conflict: true } & ProfileConflictInfo
  | { success: false; reason: "unknown_format" | "parse_error"; error?: string };

export type BatchUploadResult = {
  successful: PrintProfile[];
  conflicts: ProfileConflictInfo[];
  failed: { filename: string; error: string }[];
};
