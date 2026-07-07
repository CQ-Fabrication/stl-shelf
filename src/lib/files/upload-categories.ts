import { getFileExtension } from "./limits";

/**
 * UI categories for the upload modals' file grouping.
 * Deliberately narrower than the server-side lists in limits.ts:
 * the modals only accept these extensions.
 * Size limits are derived from centralized config per extension.
 */
export const UPLOAD_FILE_CATEGORIES = {
  model: {
    label: "Model",
    extensions: ["stl", "obj", "ply"],
  },
  slicer: {
    label: "Project",
    extensions: ["3mf"],
  },
  image: {
    label: "Image",
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
} as const;

export type UploadCategoryKey = keyof typeof UPLOAD_FILE_CATEGORIES;

// Validated by extension only - browsers don't recognize 3D file MIME types
export const UPLOAD_ACCEPTED_EXTENSIONS = Object.values(UPLOAD_FILE_CATEGORIES).flatMap(
  (category) => category.extensions.map((extension) => `.${extension}`),
);

export function getUploadFileCategory(filename: string): UploadCategoryKey | null {
  const extension = getFileExtension(filename);
  for (const [key, category] of Object.entries(UPLOAD_FILE_CATEGORIES)) {
    if ((category.extensions as readonly string[]).includes(extension)) {
      return key as UploadCategoryKey;
    }
  }
  return null;
}
