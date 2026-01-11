/**
 * PrusaSlicer 3MF Parser
 *
 * PrusaSlicer stores settings in:
 * - slic3r_pe.config (INI-style config at root)
 * - Metadata/Slic3r_PE.config (alternative location)
 * - Thumbnails/thumbnail.png or Metadata/thumbnail.png
 *
 * Config format is INI-style: key = value
 */

import type { PrintProfileMetadata } from "@/types/print-profiles";
import type { ParsedProfile, SlicerParser, ZipContents } from "./types";
import { normalizePrinterName, parseNumber, parseInt } from "./utils";

export class PrusaParser implements SlicerParser {
  canParse(zipContents: ZipContents): boolean {
    // PrusaSlicer has slic3r_pe.config or Slic3r_PE.config
    const hasRootConfig = zipContents.has("slic3r_pe.config");
    const hasMetadataConfig = zipContents.has("Metadata/Slic3r_PE.config");

    if (!hasRootConfig && !hasMetadataConfig) return false;

    const config =
      zipContents.get("slic3r_pe.config") || zipContents.get("Metadata/Slic3r_PE.config");

    if (!config) return false;

    const content = config.toString("utf-8");
    // Check for PrusaSlicer-specific markers
    return (
      content.includes("PrusaSlicer") ||
      content.includes("slic3r_pe") ||
      content.includes("printer_model")
    );
  }

  async parse(zipContents: ZipContents): Promise<ParsedProfile> {
    const config =
      zipContents.get("slic3r_pe.config") || zipContents.get("Metadata/Slic3r_PE.config");

    if (!config) {
      throw new Error("Missing slic3r_pe.config");
    }

    const configContent = config.toString("utf-8");
    const configMap = this.parseIniConfig(configContent);

    const printerName = this.extractPrinterName(configMap);
    const printSettings = this.extractPrintSettings(configMap);
    const filamentInfo = this.extractFilamentInfo(configMap);
    const printTime = this.extractPrintTime(configMap);

    // Get thumbnail
    const thumbnail =
      zipContents.get("Thumbnails/thumbnail.png") ||
      zipContents.get("Metadata/thumbnail.png") ||
      null;

    const metadata: PrintProfileMetadata = {
      printTime,
      filamentSummary: filamentInfo.summary,
      settings: printSettings,
      plateInfo: null, // PrusaSlicer doesn't have plate info in the same way
      filamentWeight: filamentInfo.weight,
    };

    return {
      printerName,
      printerNameNormalized: normalizePrinterName(printerName),
      thumbnail,
      slicerType: "prusa",
      metadata,
    };
  }

  private parseIniConfig(content: string): Map<string, string> {
    const config = new Map<string, string>();

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith(";") || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      config.set(key, value);
    }

    return config;
  }

  private extractPrinterName(config: Map<string, string>): string {
    // Try various printer name fields
    const printerSettingsId = config.get("printer_settings_id");
    if (printerSettingsId) {
      return printerSettingsId;
    }

    const printerModel = config.get("printer_model");
    if (printerModel) {
      return printerModel;
    }

    const printerNotes = config.get("printer_notes");
    if (printerNotes) {
      // Sometimes printer name is in notes
      const match = printerNotes.match(/^([^;]+)/);
      if (match?.[1]) return match[1].trim();
    }

    return "Unknown Printer";
  }

  private extractPrintSettings(config: Map<string, string>): PrintProfileMetadata["settings"] {
    return {
      layerHeight: parseNumber(config.get("layer_height") ?? null),
      infill: parseInt(config.get("fill_density")?.replace("%", "") ?? null),
      nozzleTemp: parseInt(config.get("temperature")?.split(",")[0] ?? null),
      bedTemp: parseInt(config.get("bed_temperature")?.split(",")[0] ?? null),
    };
  }

  private extractFilamentInfo(config: Map<string, string>): {
    summary: string | null;
    weight: number | null;
  } {
    const filamentType = config.get("filament_type");
    const filamentColor = config.get("filament_colour");

    let summary: string | null = null;

    if (filamentType) {
      // filament_type can be semicolon-separated for multi-extruder
      const types = filamentType.split(";").filter(Boolean);
      const colors = filamentColor?.split(";").filter(Boolean) || [];

      if (types.length === 1) {
        const firstType = types[0];
        const firstColor = colors[0];
        summary = firstColor ? `${firstType} (${firstColor})` : (firstType ?? null);
      } else if (types.length > 1) {
        // Multi-material
        const parts: string[] = [];
        const byType = new Map<string, string[]>();

        types.forEach((type, i) => {
          const typeColors = byType.get(type) || [];
          if (colors[i]) typeColors.push(colors[i]);
          byType.set(type, typeColors);
        });

        for (const [type, typeColors] of byType) {
          if (typeColors.length > 1) {
            parts.push(`${typeColors.length}x ${type} (${typeColors.join(", ")})`);
          } else if (typeColors.length === 1) {
            parts.push(`${type} (${typeColors[0]})`);
          } else {
            parts.push(type);
          }
        }

        summary = parts.join(" + ");
      }
    }

    // PrusaSlicer stores filament_used_g in some versions
    const filamentUsedG = config.get("filament_used_g");
    const weight = filamentUsedG ? parseNumber(filamentUsedG) : null;

    return { summary, weight };
  }

  private extractPrintTime(config: Map<string, string>): number | null {
    // PrusaSlicer stores estimated print time in various ways
    const estimatedTime = config.get("estimated_print_time");
    if (estimatedTime) {
      // Format can be "1h 30m 45s" or similar
      return this.parseTimeString(estimatedTime);
    }

    // Alternative: print_time field
    const printTime = config.get("print_time");
    if (printTime) {
      return this.parseTimeString(printTime);
    }

    return null;
  }

  private parseTimeString(timeStr: string): number | null {
    let totalSeconds = 0;
    let hasMatch = false;

    // Match hours
    const hoursMatch = timeStr.match(/(\d+)\s*h/i);
    if (hoursMatch?.[1]) {
      totalSeconds += Number.parseInt(hoursMatch[1], 10) * 3600;
      hasMatch = true;
    }

    // Match minutes
    const minutesMatch = timeStr.match(/(\d+)\s*m/i);
    if (minutesMatch?.[1]) {
      totalSeconds += Number.parseInt(minutesMatch[1], 10) * 60;
      hasMatch = true;
    }

    // Match seconds
    const secondsMatch = timeStr.match(/(\d+)\s*s/i);
    if (secondsMatch?.[1]) {
      totalSeconds += Number.parseInt(secondsMatch[1], 10);
      hasMatch = true;
    }

    return hasMatch ? totalSeconds : null;
  }
}
