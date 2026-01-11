/**
 * 3MF Parser types for multi-slicer support
 */

import type { PrintProfileMetadata, SlicerType } from "@/types/print-profiles";

export type ParsedProfile = {
  printerName: string;
  printerNameNormalized: string;
  thumbnail: Buffer | null;
  slicerType: SlicerType;
  metadata: PrintProfileMetadata;
};

export type Parse3MFResult =
  | { success: true; data: ParsedProfile }
  | { success: false; reason: "unknown_format" | "parse_error"; error?: string };

export type ZipContents = Map<string, Buffer>;

export type SlicerParser = {
  canParse(zipContents: ZipContents): boolean;
  parse(zipContents: ZipContents): Promise<ParsedProfile>;
};
