/**
 * 3MF Parser - Main Entry Point
 *
 * Orchestrates multiple slicer parsers to extract metadata from 3MF files.
 * Supports: Bambu Studio, OrcaSlicer, PrusaSlicer
 *
 * Usage:
 *   const result = await parse3MFFromBuffer(buffer);
 *   if (result.success) {
 *     console.log(result.data.printerName);
 *   }
 */

import { BambuParser } from "./bambu-parser";
import { OrcaParser } from "./orca-parser";
import { PrusaParser } from "./prusa-parser";
import type { Parse3MFResult, SlicerParser } from "./types";
import { extractAllowedFiles } from "./utils";

// Export types for external use
export type { Parse3MFResult, ParsedProfile, ZipContents } from "./types";

// Export utilities for external use
export {
  isConflict,
  normalizePrinterName,
  calculateSimilarity,
  formatDuration,
  extractThumbnailFrom3MF,
} from "./utils";

/**
 * Registered parsers in priority order
 *
 * Note: OrcaSlicer must come after Bambu because they share similar format
 * but OrcaSlicer has distinct markers. We check Bambu first because it's
 * more specific.
 */
const parsers: SlicerParser[] = [
  new BambuParser(),
  new OrcaParser(), // Must come after Bambu (similar format)
  new PrusaParser(),
];

/**
 * Parse a 3MF file from a Buffer
 *
 * @param buffer - The raw 3MF file content
 * @returns Parse result with extracted metadata or failure reason
 */
export async function parse3MFFromBuffer(buffer: Buffer): Promise<Parse3MFResult> {
  let zipContents;

  try {
    zipContents = await extractAllowedFiles(buffer);
  } catch (error) {
    return {
      success: false,
      reason: "parse_error",
      error: `Failed to read 3MF archive: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Try each parser in order
  for (const parser of parsers) {
    if (parser.canParse(zipContents)) {
      try {
        const data = await parser.parse(zipContents);
        return { success: true, data };
      } catch {
        // Parser matched but failed to parse, try next parser
        continue;
      }
    }
  }

  // No parser could handle this format
  return { success: false, reason: "unknown_format" };
}

/**
 * Check if a file is a 3MF file based on extension
 */
export function is3MFFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".3mf");
}
