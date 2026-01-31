/**
 * File upload limits configuration
 * Based on 3D printing workflow requirements
 *
 * Rationale:
 * - 3MF: Container format with textures, print settings, multiple objects (250MB)
 * - STEP/STP: CAD interchange format, can be large for complex assemblies (250MB)
 * - STL: Mesh-only, typically smaller but can be detailed (100MB)
 * - OBJ: Can include materials/textures, mid-size (150MB)
 * - PLY: Point cloud/mesh, typically smaller (100MB)
 * - GCODE: Text-based, can be long for complex prints (50MB)
 * - Images: Preview/documentation images (10MB)
 */

const MB = 1024 * 1024;

/**
 * Per-extension file size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  // 3D Model Files
  stl: 100 * MB, // Mesh-only format
  obj: 150 * MB, // With materials/textures
  ply: 100 * MB, // Point cloud/mesh

  // Container/CAD Formats
  "3mf": 250 * MB, // Container with textures, settings, multi-object
  step: 250 * MB, // CAD interchange
  stp: 250 * MB, // STEP alias

  // Slicer Output
  gcode: 50 * MB, // Text-based, can be long

  // Images
  jpg: 10 * MB,
  jpeg: 10 * MB,
  png: 10 * MB,
  webp: 10 * MB,
  gif: 10 * MB,

  // Documentation
  pdf: 25 * MB,
} as const;

export type SupportedExtension = keyof typeof FILE_SIZE_LIMITS;

/**
 * Maximum total size for all images per model
 */
export const MAX_TOTAL_IMAGE_SIZE = 50 * MB;

/**
 * Maximum number of files per upload
 */
export const MAX_FILES_PER_UPLOAD = 10;

/**
 * File categories for UI grouping
 */
export const FILE_CATEGORIES = {
  model: {
    label: "Model",
    description: "3D printable model files",
    extensions: ["stl", "obj", "ply"] as const,
  },
  container: {
    label: "Project",
    description: "Container formats with print settings",
    extensions: ["3mf"] as const,
  },
  cad: {
    label: "CAD",
    description: "CAD interchange formats",
    extensions: ["step", "stp"] as const,
  },
  slicer: {
    label: "Slicer",
    description: "Slicer output files",
    extensions: ["gcode"] as const,
  },
  image: {
    label: "Image",
    description: "Preview and documentation images",
    extensions: ["jpg", "jpeg", "png", "webp", "gif"] as const,
  },
  document: {
    label: "Document",
    description: "Documentation files",
    extensions: ["pdf"] as const,
  },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

/**
 * All supported extensions for 3D files (non-image)
 */
export const MODEL_EXTENSIONS = ["stl", "obj", "ply", "3mf", "step", "stp", "gcode"] as const;

/**
 * Extensions that support 3D preview
 */
export const PREVIEW_EXTENSIONS = ["stl", "obj", "ply", "3mf"] as const;

/**
 * All supported extensions
 */
export const ALL_EXTENSIONS = [
  ...MODEL_EXTENSIONS,
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
] as const;

/**
 * Extensions allowed for model uploads in the UI/server flows.
 */
export const MODEL_UPLOAD_EXTENSIONS = [
  ...MODEL_EXTENSIONS,
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
] as const;

/**
 * Get the file size limit for a given extension
 */
export function getFileSizeLimit(extension: string): number {
  const ext = extension.toLowerCase().replace(".", "") as SupportedExtension;
  return FILE_SIZE_LIMITS[ext] ?? 10 * MB; // Default 10MB for unknown
}

/**
 * Check if a file exceeds its size limit
 */
export function isFileTooLarge(filename: string, fileSize: number): boolean {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const limit = getFileSizeLimit(extension);
  return fileSize > limit;
}

/**
 * Get human-readable size limit for an extension
 */
export function getFileSizeLimitLabel(extension: string): string {
  const limit = getFileSizeLimit(extension);
  return formatBytes(limit);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get file category from extension
 */
export function getFileCategory(filename: string): FileCategory | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";

  for (const [key, category] of Object.entries(FILE_CATEGORIES)) {
    if ((category.extensions as readonly string[]).includes(extension)) {
      return key as FileCategory;
    }
  }

  return null;
}

/**
 * Check if extension supports 3D preview
 */
export function supportsPreview(extension: string): boolean {
  const ext = extension.toLowerCase().replace(".", "");
  return (PREVIEW_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * MIME types for file extensions
 */
export const MIME_TYPES: Record<string, string> = {
  stl: "application/sla",
  "3mf": "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
  obj: "model/obj",
  ply: "application/x-ply",
  step: "model/step",
  stp: "model/step",
  gcode: "text/x.gcode",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};
