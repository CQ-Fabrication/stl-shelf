/**
 * Bambu Studio 3MF Parser
 *
 * Bambu Studio stores settings in:
 * - Metadata/model_settings.config (XML with printer/material info)
 * - Metadata/plate_1.json (print time, filament usage)
 * - Metadata/plate_1.png (thumbnail)
 */

import type { PrintProfileMetadata } from "@/types/print-profiles";
import type { ParsedProfile, SlicerParser, ZipContents } from "./types";
import { normalizePrinterName, parseNumber, parseInt } from "./utils";

type BambuPlateInfo = {
  prediction?: number; // print time in seconds
  weight?: number; // filament weight in grams
  filaments?: Array<{
    id: string;
    type: string;
    color: string;
    name?: string;
  }>;
  objects_cnt?: number;
  // Newer format fields
  nozzle_diameter?: number;
  bed_type?: string;
  bbox_objects?: Array<{
    layer_height?: number;
  }>;
};

/**
 * Project settings from Metadata/project_settings.config (JSON format)
 * Contains printer preset, clean nozzle/layer values, and print settings
 */
type BambuProjectConfig = {
  printer_model?: string;
  printer_settings_id?: string;
  nozzle_diameter?: string[];
  layer_height?: string;
  sparse_infill_density?: string;
  nozzle_temperature?: string[];
  hot_plate_temp?: string[];
  bed_type?: string;
};

export class BambuParser implements SlicerParser {
  canParse(zipContents: ZipContents): boolean {
    // Check slice_info.config for X-BBL-Client markers (newer Bambu Studio versions)
    const sliceInfo = zipContents.get("Metadata/slice_info.config");
    if (sliceInfo) {
      const sliceContent = sliceInfo.toString("utf-8");
      if (sliceContent.includes("X-BBL-Client")) {
        return true;
      }
    }

    // Fallback: Check model_settings.config for older format
    const modelSettings = zipContents.get("Metadata/model_settings.config");
    if (modelSettings) {
      const content = modelSettings.toString("utf-8");
      if (content.includes("BambuStudio") || content.includes("printer_preset_name")) {
        return true;
      }
    }

    return false;
  }

  async parse(zipContents: ZipContents): Promise<ParsedProfile> {
    // Parse plate info for print time, filament, and settings
    const plateJson = zipContents.get("Metadata/plate_1.json");
    const plateInfo = plateJson ? this.parsePlateInfo(plateJson.toString("utf-8")) : null;

    // Parse project_settings.config as JSON (newer Bambu Studio format)
    const projectSettings = zipContents.get("Metadata/project_settings.config");
    const projectConfig = this.parseProjectConfig(projectSettings?.toString("utf-8") ?? null);

    // Get model settings (contains per-object settings, fallback for printer)
    const modelSettings = zipContents.get("Metadata/model_settings.config");
    const settingsContent = modelSettings?.toString("utf-8") ?? "";

    // Extract printer name - try multiple sources
    let printerName = this.extractPrinterName(projectConfig, settingsContent);
    if (printerName === "Unknown Printer" && plateInfo?.bed_type) {
      // Derive printer name from bed_type if available
      printerName = this.derivePrinterFromBedType(plateInfo.bed_type, plateInfo.nozzle_diameter);
    }

    // Extract print settings - prefer JSON config, fallback to regex
    const printSettings = this.extractPrintSettings(projectConfig, settingsContent, plateInfo);

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
      slicerType: "bambu",
      metadata,
    };
  }

  private parseProjectConfig(content: string | null): BambuProjectConfig | null {
    if (!content) return null;
    try {
      return JSON.parse(content) as BambuProjectConfig;
    } catch {
      return null;
    }
  }

  private extractPrinterName(projectConfig: BambuProjectConfig | null, modelSettingsContent: string): string {
    // 1. JSON: printer_model (cleanest - e.g., "Bambu Lab X1 Carbon")
    if (projectConfig?.printer_model) {
      return projectConfig.printer_model;
    }

    // 2. JSON: printer_settings_id (e.g., "Bambu Lab X1 Carbon 0.4 nozzle")
    if (projectConfig?.printer_settings_id) {
      return projectConfig.printer_settings_id;
    }

    // 3. Fallback to regex on model_settings.config printer_preset_name
    const printerMatch = modelSettingsContent.match(/printer_preset_name\s*=\s*"?([^"\n]+)"?/);
    if (printerMatch?.[1]) {
      return printerMatch[1].trim();
    }

    // 4. Check for machine_type in model_settings
    const machineMatch = modelSettingsContent.match(/machine_type\s*=\s*"?([^"\n]+)"?/);
    if (machineMatch?.[1]) {
      return machineMatch[1].trim();
    }

    return "Unknown Printer";
  }

  private derivePrinterFromBedType(bedType: string, nozzleDiameter?: number): string {
    // Bambu Lab printers use specific bed types
    // Format nozzle diameter to avoid floating point precision issues (0.4000000059604645 -> 0.4)
    const nozzle = nozzleDiameter ? ` (${this.formatNozzleDiameter(nozzleDiameter)}mm)` : "";

    if (bedType.includes("textured")) {
      return `Bambu Lab Printer${nozzle}`;
    }
    if (bedType.includes("cool_plate") || bedType.includes("engineering")) {
      return `Bambu Lab Printer${nozzle}`;
    }

    return `Bambu Lab Printer${nozzle}`;
  }

  private formatNozzleDiameter(diameter: number): string {
    // Round to 2 decimal places and remove trailing zeros
    const rounded = Math.round(diameter * 100) / 100;
    return rounded.toString();
  }

  private extractPrintSettings(
    projectConfig: BambuProjectConfig | null,
    modelSettingsContent: string,
    plateInfo: BambuPlateInfo | null,
  ): PrintProfileMetadata["settings"] {
    // 1. Prefer clean JSON values from project_settings.config
    if (projectConfig) {
      const layerHeight = parseNumber(projectConfig.layer_height ?? null);
      const infill = parseInt(projectConfig.sparse_infill_density?.replace("%", "") ?? null);
      const nozzleTemp = parseInt(projectConfig.nozzle_temperature?.[0] ?? null);
      const bedTemp = parseInt(projectConfig.hot_plate_temp?.[0] ?? null);

      if (layerHeight !== null) {
        return { layerHeight, infill, nozzleTemp, bedTemp };
      }
    }

    // 2. Fallback to regex on model_settings.config
    const layerHeightMatch = modelSettingsContent.match(/layer_height\s*=\s*"?([0-9.]+)"?/);
    const infillMatch = modelSettingsContent.match(/(?:sparse_infill_density|infill_density)\s*=\s*"?([0-9.]+)"?/);
    const nozzleTempMatch = modelSettingsContent.match(/(?:nozzle_temperature|temperature)\s*=\s*"?([0-9.]+)"?/);
    const bedTempMatch = modelSettingsContent.match(/(?:bed_temperature|hot_plate_temp)\s*=\s*"?([0-9.]+)"?/);

    // Get layer height from plate_1.json if not in config
    let layerHeight = parseNumber(layerHeightMatch?.[1] ?? null);
    if (layerHeight === null && plateInfo?.bbox_objects?.[0]?.layer_height) {
      layerHeight = plateInfo.bbox_objects[0].layer_height;
    }

    return {
      layerHeight,
      infill: parseInt(infillMatch?.[1] ?? null),
      nozzleTemp: parseInt(nozzleTempMatch?.[1] ?? null),
      bedTemp: parseInt(bedTempMatch?.[1] ?? null),
    };
  }

  private parsePlateInfo(jsonContent: string): BambuPlateInfo | null {
    try {
      const data = JSON.parse(jsonContent);
      return {
        prediction: data.prediction,
        weight: data.weight,
        filaments: data.filaments,
        objects_cnt: data.objects_cnt,
        // Newer format fields
        nozzle_diameter: data.nozzle_diameter,
        bed_type: data.bed_type,
        bbox_objects: data.bbox_objects,
      };
    } catch {
      return null;
    }
  }

  private buildFilamentSummary(
    filaments: BambuPlateInfo["filaments"] | undefined,
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
    // Could map hex to color names, but for now just use the hex
    // Common colors could be detected: #FFFFFF = White, #000000 = Black, etc.
    return hexColor.toUpperCase();
  }
}
