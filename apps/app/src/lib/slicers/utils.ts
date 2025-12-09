import type { SlicerId } from "./config";
import {
  MODEL_FILE_EXTENSIONS,
  PREFERRED_FILE_EXTENSION,
  SELECTABLE_FILE_EXTENSIONS,
  SLICER_CONFIG,
} from "./config";

export type ModelFile = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  storageKey: string;
  storageUrl: string | null;
  storageBucket: string;
};

export const filterModelFiles = (files: ModelFile[]): ModelFile[] =>
  files.filter((f) =>
    MODEL_FILE_EXTENSIONS.includes(
      f.extension.toLowerCase() as (typeof MODEL_FILE_EXTENSIONS)[number]
    )
  );

export const filterSelectableFiles = (files: ModelFile[]): ModelFile[] =>
  files.filter((f) =>
    SELECTABLE_FILE_EXTENSIONS.includes(
      f.extension.toLowerCase() as (typeof SELECTABLE_FILE_EXTENSIONS)[number]
    )
  );

export const selectOptimalFile = (files: ModelFile[]): ModelFile | null => {
  // Prefer 3MF files
  const preferredFile = files.find(
    (f) => f.extension.toLowerCase() === PREFERRED_FILE_EXTENSION
  );

  if (preferredFile) {
    return preferredFile;
  }

  // Otherwise return first selectable file (STL/OBJ)
  const selectableFiles = filterSelectableFiles(files);
  return selectableFiles[0] ?? null;
};

export const getSlicerUrl = (slicerId: SlicerId, fileUrl: string): string => {
  const config = SLICER_CONFIG[slicerId];
  return `${config.urlScheme}${encodeURIComponent(fileUrl)}`;
};
