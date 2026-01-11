/**
 * OrcaSlicer 3MF Parser
 *
 * OrcaSlicer is a fork of Bambu Studio with very similar format.
 * Main differences are in the config markers and some field names.
 *
 * Stores settings in:
 * - Metadata/model_settings.config (XML with printer/material info)
 * - Metadata/plate_1.json (print time, filament usage)
 * - Metadata/plate_1.png (thumbnail)
 */

import type { PrintProfileMetadata } from "@/types/print-profiles";
import type { ParsedProfile, SlicerParser, ZipContents } from "./types";
import { normalizePrinterName, parseNumber, parseInt } from "./utils";

type OrcaPlateInfo = {
  prediction?: number; // print time in seconds
  weight?: number; // filament weight in grams
  filaments?: Array<{
    id: string;
    type: string;
    color: string;
    name?: string;
  }>;
  objects_cnt?: number;
};

export class OrcaParser implements SlicerParser {
  canParse(zipContents: ZipContents): boolean {
    // OrcaSlicer has model_settings.config with OrcaSlicer marker
    const modelSettings = zipContents.get("Metadata/model_settings.config");
    if (!modelSettings) return false;

    const content = modelSettings.toString("utf-8");
    // Check for OrcaSlicer-specific markers
    return content.includes("OrcaSlicer") || content.includes("orca_slicer");
  }

  async parse(zipContents: ZipContents): Promise<ParsedProfile> {
    const modelSettings = zipContents.get("Metadata/model_settings.config");
    if (!modelSettings) {
      throw new Error("Missing model_settings.config");
    }

    const settingsContent = modelSettings.toString("utf-8");
    const printerName = this.extractPrinterName(settingsContent);
    const printSettings = this.extractPrintSettings(settingsContent);

    // Parse plate info for print time and filament
    const plateJson = zipContents.get("Metadata/plate_1.json");
    const plateInfo = plateJson ? this.parsePlateInfo(plateJson.toString("utf-8")) : null;

    // Get thumbnail
    const thumbnail =
      zipContents.get("Metadata/plate_1.png") || zipContents.get("Metadata/thumbnail.png") || null;

    const metadata: PrintProfileMetadata = {
      printTime: plateInfo?.prediction ?? null,
      filamentSummary: this.buildFilamentSummary(plateInfo?.filaments),
      settings: printSettings,
      plateInfo: plateInfo?.objects_cnt
        ? {
            count: 1,
            copiesPerPlate: plateInfo.objects_cnt,
          }
        : null,
      filamentWeight: plateInfo?.weight ?? null,
    };

    return {
      printerName,
      printerNameNormalized: normalizePrinterName(printerName),
      thumbnail,
      slicerType: "orca",
      metadata,
    };
  }

  private extractPrinterName(content: string): string {
    // Look for printer_preset_name in the config
    const printerMatch = content.match(/printer_preset_name\s*=\s*"?([^"\n]+)"?/);
    if (printerMatch?.[1]) {
      return printerMatch[1].trim();
    }

    // Alternative: look for printer_model
    const modelMatch = content.match(/printer_model\s*=\s*"?([^"\n]+)"?/);
    if (modelMatch?.[1]) {
      return modelMatch[1].trim();
    }

    return "Unknown Printer";
  }

  private extractPrintSettings(content: string): PrintProfileMetadata["settings"] {
    const layerHeightMatch = content.match(/layer_height\s*=\s*"?([0-9.]+)"?/);
    const infillMatch = content.match(/(?:sparse_infill_density|infill_density)\s*=\s*"?([0-9.]+)"?/);
    const nozzleTempMatch = content.match(/(?:nozzle_temperature|temperature)\s*=\s*"?([0-9.]+)"?/);
    const bedTempMatch = content.match(/(?:bed_temperature|hot_plate_temp)\s*=\s*"?([0-9.]+)"?/);

    return {
      layerHeight: parseNumber(layerHeightMatch?.[1] ?? null),
      infill: parseInt(infillMatch?.[1] ?? null),
      nozzleTemp: parseInt(nozzleTempMatch?.[1] ?? null),
      bedTemp: parseInt(bedTempMatch?.[1] ?? null),
    };
  }

  private parsePlateInfo(jsonContent: string): OrcaPlateInfo | null {
    try {
      const data = JSON.parse(jsonContent);
      return {
        prediction: data.prediction,
        weight: data.weight,
        filaments: data.filaments,
        objects_cnt: data.objects_cnt,
      };
    } catch {
      return null;
    }
  }

  private buildFilamentSummary(
    filaments: OrcaPlateInfo["filaments"] | undefined,
  ): string | null {
    if (!filaments || filaments.length === 0) return null;

    if (filaments.length === 1) {
      const f = filaments[0];
      if (!f) return null;
      const color = this.formatColor(f.color);
      return color ? `${f.type} (${color})` : f.type;
    }

    // Group by type for multi-material
    const byType = new Map<string, string[]>();
    for (const filament of filaments) {
      if (!filament) continue;
      const colors = byType.get(filament.type) || [];
      const color = this.formatColor(filament.color);
      if (color) colors.push(color);
      byType.set(filament.type, colors);
    }

    const parts: string[] = [];
    for (const [type, colors] of byType) {
      if (colors.length > 1) {
        parts.push(`${colors.length}x ${type} (${colors.join(", ")})`);
      } else if (colors.length === 1) {
        parts.push(`${type} (${colors[0]})`);
      } else {
        parts.push(type);
      }
    }

    return parts.join(" + ");
  }

  private formatColor(hexColor: string | undefined): string | null {
    if (!hexColor) return null;
    return hexColor.toUpperCase();
  }
}
