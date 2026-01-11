/**
 * Shared utilities for 3MF parsing
 * - ZIP extraction with security allowlist
 * - Printer name normalization
 * - Similarity matching for conflict detection
 */

import JSZip from "jszip";
import { distance } from "fastest-levenshtein";
import type { ZipContents } from "./types";

/**
 * Security: Only extract these paths from 3MF archives
 * Prevents path traversal attacks and limits extraction scope
 */
const ALLOWED_PATHS = [
  // Bambu Studio / OrcaSlicer
  "Metadata/model_settings.config",
  "Metadata/project_settings.config",
  "Metadata/plate_1.json",
  "Metadata/plate_1.png",
  "Metadata/thumbnail.png",
  "Metadata/slice_info.config",
  // PrusaSlicer
  "slic3r_pe.config",
  "Metadata/Slic3r_PE.config",
  "Metadata/thumbnail.png",
  "Thumbnails/thumbnail.png",
  // Common 3MF
  "3D/3dmodel.model",
  "[Content_Types].xml",
];

/**
 * Check if a path is safe to extract
 * Prevents path traversal and ensures only allowlisted paths
 */
function isAllowedPath(path: string): boolean {
  // Reject path traversal attempts
  if (path.includes("..") || path.startsWith("/")) {
    return false;
  }

  // Check against allowlist
  return ALLOWED_PATHS.some((allowed) => path === allowed || path.startsWith(allowed));
}

/**
 * Extract allowed files from a 3MF buffer
 * Returns a map of path -> content for security-approved files only
 */
export async function extractAllowedFiles(buffer: Buffer): Promise<ZipContents> {
  const zip = await JSZip.loadAsync(buffer);
  const contents: ZipContents = new Map();

  const extractPromises: Promise<void>[] = [];

  zip.forEach((relativePath, file) => {
    if (!file.dir && isAllowedPath(relativePath)) {
      extractPromises.push(
        file.async("nodebuffer").then((content) => {
          contents.set(relativePath, content);
        }),
      );
    }
  });

  await Promise.all(extractPromises);
  return contents;
}

/**
 * Normalize printer name for consistent matching
 * Removes spaces, special characters, and converts to lowercase
 */
export function normalizePrinterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "") // Remove spaces
    .replace(/[^a-z0-9]/g, ""); // Remove special chars
}

/**
 * Calculate similarity between two strings as a percentage (0-1)
 * Uses Levenshtein distance
 */
export function calculateSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance(a, b) / maxLength;
}

/**
 * Check if two printer names conflict
 * Uses fuzzy matching at 80% similarity threshold
 */
export function isConflict(name1: string, name2: string): boolean {
  const normalized1 = normalizePrinterName(name1);
  const normalized2 = normalizePrinterName(name2);
  return calculateSimilarity(normalized1, normalized2) >= 0.8;
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Parse an XML/config value as a number, returning null if invalid
 */
export function parseNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Parse an XML/config value as an integer, returning null if invalid
 */
export function parseInt(value: string | undefined | null): number | null {
  if (!value) return null;
  const num = Number.parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Thumbnail paths in order of preference
 * plate_1.png is typically higher quality (rendered preview)
 * thumbnail.png is a simpler preview
 */
const THUMBNAIL_PATHS = [
  "Metadata/plate_1.png",
  "Metadata/thumbnail.png",
  "Thumbnails/thumbnail.png",
];

/**
 * Extract just the thumbnail from a 3MF buffer
 * Returns the thumbnail as a Buffer, or null if none found
 */
export async function extractThumbnailFrom3MF(buffer: Buffer): Promise<Buffer | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    for (const path of THUMBNAIL_PATHS) {
      const file = zip.file(path);
      if (file) {
        return await file.async("nodebuffer");
      }
    }

    return null;
  } catch {
    return null;
  }
}
