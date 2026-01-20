/**
 * Print Profile Service
 *
 * Handles upload, conflict detection, and management of print profiles.
 * Print profiles are 3MF files with auto-extracted slicer metadata.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelFiles, modelVersions, printProfiles } from "@/lib/db/schema/models";
import { slugify } from "@/lib/slug";
import { storageService } from "@/server/services/storage";
import {
  isConflict,
  normalizePrinterName,
  parse3MFFromBuffer,
  type ParsedProfile,
} from "@/server/services/parsers";
import type {
  BatchUploadResult,
  PrintProfile,
  PrintProfileMetadata,
  ProfileConflictInfo,
} from "@/types/print-profiles";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export type UploadProfileInput = {
  versionId: string;
  organizationId: string;
  file: File;
};

export type UploadProfileResult =
  | { success: true; profile: PrintProfile }
  | { conflict: true; conflictInfo: ProfileConflictInfo }
  | { success: false; reason: "not_3mf" | "unknown_format" | "parse_error"; error?: string };

export type ResolveConflictInput = {
  versionId: string;
  organizationId: string;
  existingProfileId: string;
  file: File;
  action: "replace" | "keep_both";
};

class PrintProfileService {
  /**
   * Upload a 3MF file and create a print profile
   * Returns conflict info if a similar printer profile already exists
   */
  async uploadProfile(input: UploadProfileInput): Promise<UploadProfileResult> {
    // Verify access to version
    const version = await this.getVersionWithAccess(input.versionId, input.organizationId);
    if (!version) {
      throw new Error("Version not found or access denied");
    }

    // Check file extension
    const extension = this.extractExtension(input.file.name);
    if (extension !== "3mf") {
      return { success: false, reason: "not_3mf" };
    }

    // Parse the 3MF file
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const parseResult = await parse3MFFromBuffer(buffer);

    if (!parseResult.success) {
      return {
        success: false,
        reason: parseResult.reason,
        error: parseResult.error,
      };
    }

    const parsedData = parseResult.data;

    // Check for conflicts with existing profiles
    const existingProfiles = await db.query.printProfiles.findMany({
      where: eq(printProfiles.versionId, input.versionId),
    });

    const conflictingProfile = existingProfiles.find((p) =>
      isConflict(p.printerName, parsedData.printerName),
    );

    if (conflictingProfile) {
      return {
        conflict: true,
        conflictInfo: {
          existingProfile: {
            id: conflictingProfile.id,
            printerName: conflictingProfile.printerName,
            createdAt: conflictingProfile.createdAt,
          },
          newProfile: {
            printerName: parsedData.printerName,
            metadata: parsedData.metadata,
          },
        },
      };
    }

    // No conflict, create the profile
    const profile = await this.createProfile({
      versionId: input.versionId,
      organizationId: input.organizationId,
      modelId: version.modelId,
      versionNumber: version.version,
      file: input.file,
      buffer,
      parsedData,
    });

    return { success: true, profile };
  }

  /**
   * Resolve a conflict by replacing or keeping both profiles
   */
  async resolveConflict(input: ResolveConflictInput): Promise<PrintProfile> {
    const version = await this.getVersionWithAccess(input.versionId, input.organizationId);
    if (!version) {
      throw new Error("Version not found or access denied");
    }

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const parseResult = await parse3MFFromBuffer(buffer);

    if (!parseResult.success) {
      throw new Error(`Failed to parse 3MF: ${parseResult.reason}`);
    }

    const parsedData = parseResult.data;

    if (input.action === "replace") {
      // Delete the existing profile (cascade will delete the file)
      await db.delete(printProfiles).where(eq(printProfiles.id, input.existingProfileId));
    } else if (input.action === "keep_both") {
      // Modify the printer name to include a suffix
      parsedData.printerName = `${parsedData.printerName} (2)`;
      parsedData.printerNameNormalized = normalizePrinterName(parsedData.printerName);
    }

    return this.createProfile({
      versionId: input.versionId,
      organizationId: input.organizationId,
      modelId: version.modelId,
      versionNumber: version.version,
      file: input.file,
      buffer,
      parsedData,
    });
  }

  /**
   * Batch upload multiple 3MF files
   */
  async batchUpload(
    versionId: string,
    organizationId: string,
    files: File[],
  ): Promise<BatchUploadResult> {
    const successful: PrintProfile[] = [];
    const conflicts: ProfileConflictInfo[] = [];
    const failed: { filename: string; error: string }[] = [];

    for (const file of files) {
      const result = await this.uploadProfile({
        versionId,
        organizationId,
        file,
      });

      if ("success" in result && result.success) {
        successful.push(result.profile);
      } else if ("conflict" in result && result.conflict) {
        conflicts.push(result.conflictInfo);
      } else if ("success" in result && !result.success) {
        failed.push({
          filename: file.name,
          error: result.error || result.reason,
        });
      }
    }

    return { successful, conflicts, failed };
  }

  /**
   * List all profiles for a version
   */
  async listProfiles(versionId: string, organizationId: string) {
    const version = await this.getVersionWithAccess(versionId, organizationId);
    if (!version) {
      throw new Error("Version not found or access denied");
    }

    const profiles = await db.query.printProfiles.findMany({
      where: eq(printProfiles.versionId, versionId),
      with: {
        file: {
          columns: {
            id: true,
            filename: true,
            originalName: true,
            size: true,
            storageKey: true,
          },
        },
      },
      orderBy: (profiles, { asc }) => [asc(profiles.printerName)],
    });

    // Generate thumbnail URLs for profiles that have thumbnails
    return Promise.all(
      profiles.map(async (profile) => ({
        ...profile,
        thumbnailUrl: profile.thumbnailPath
          ? await storageService.generateDownloadUrl(profile.thumbnailPath, 60)
          : null,
      })),
    );
  }

  /**
   * Delete a profile and its associated file
   */
  async deleteProfile(profileId: string, organizationId: string): Promise<void> {
    const profile = await db.query.printProfiles.findFirst({
      where: eq(printProfiles.id, profileId),
      columns: {
        id: true,
        thumbnailPath: true,
      },
      with: {
        version: {
          with: {
            model: {
              columns: { organizationId: true },
            },
          },
        },
        file: {
          columns: { storageKey: true },
        },
      },
    });

    if (!profile || profile.version.model.organizationId !== organizationId) {
      throw new Error("Profile not found or access denied");
    }

    // Only delete from storage if this is a dedicated slicer file, not a source file
    // Source files (auto-parsed) should remain in storage for the Source Files tab
    const isSourceFile = profile.file.storageKey.includes("/source/");
    if (!isSourceFile) {
      await storageService.deleteFile(profile.file.storageKey).catch((err) => {
        console.error("Failed to delete profile file from storage:", err);
      });
    }

    // Delete thumbnail if it exists
    if (profile.thumbnailPath) {
      await storageService.deleteFile(profile.thumbnailPath).catch(() => {});
    }

    // Delete profile record only (not the modelFiles record for source files)
    await db.delete(printProfiles).where(eq(printProfiles.id, profileId));
  }

  /**
   * Get a profile's download info
   */
  async getProfileDownloadInfo(profileId: string, organizationId: string) {
    const profile = await db.query.printProfiles.findFirst({
      where: eq(printProfiles.id, profileId),
      with: {
        version: {
          with: {
            model: {
              columns: { organizationId: true },
            },
          },
        },
        file: true,
      },
    });

    if (!profile || profile.version.model.organizationId !== organizationId) {
      throw new Error("Profile not found or access denied");
    }

    const downloadUrl = await storageService.generateDownloadUrl(profile.file.storageKey, 60);

    return {
      filename: profile.file.originalName,
      size: profile.file.size,
      mimeType: profile.file.mimeType || "application/octet-stream",
      downloadUrl,
    };
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private async getVersionWithAccess(versionId: string, organizationId: string) {
    const version = await db.query.modelVersions.findFirst({
      where: eq(modelVersions.id, versionId),
      with: {
        model: {
          columns: { id: true, organizationId: true },
        },
      },
    });

    if (!version || version.model.organizationId !== organizationId) {
      return null;
    }

    return {
      id: version.id,
      modelId: version.model.id,
      version: version.version,
    };
  }

  private async createProfile(params: {
    versionId: string;
    organizationId: string;
    modelId: string;
    versionNumber: string;
    file: File;
    buffer: Buffer;
    parsedData: ParsedProfile;
  }): Promise<PrintProfile> {
    const { versionId, organizationId, modelId, versionNumber, file, buffer, parsedData } = params;
    const timestamp = new Date();

    // Create stored filename
    const storedFilename = this.createStoredFilename(file.name);

    // Generate storage key for the 3MF file
    const storageKey = storageService.generateStorageKey({
      organizationId,
      modelId,
      version: versionNumber,
      filename: storedFilename,
      kind: "slicer",
    });

    // Upload the 3MF file
    await storageService.uploadFile({
      key: storageKey,
      file: buffer,
      contentType: file.type || DEFAULT_CONTENT_TYPE,
    });

    // Upload thumbnail if present
    let thumbnailPath: string | null = null;
    if (parsedData.thumbnail) {
      const thumbnailFilename = `${storedFilename.replace(".3mf", "")}-thumb.png`;
      thumbnailPath = storageService.generateStorageKey({
        organizationId,
        modelId,
        version: versionNumber,
        filename: thumbnailFilename,
        kind: "artifact",
      });

      await storageService.uploadFile({
        key: thumbnailPath,
        file: parsedData.thumbnail,
        contentType: "image/png",
      });
    }

    try {
      // Create file record
      const [fileRecord] = await db
        .insert(modelFiles)
        .values({
          versionId,
          filename: storedFilename,
          originalName: file.name,
          size: file.size,
          mimeType: file.type || DEFAULT_CONTENT_TYPE,
          extension: "3mf",
          storageKey,
          storageBucket: storageService.defaultBucket,
          storageUrl: storageService.getFileUrl(storageKey),
          fileMetadata: {
            processed: true,
            processedAt: timestamp.toISOString(),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!fileRecord) {
        throw new Error("Failed to create file record");
      }

      // Create profile record
      const [profile] = await db
        .insert(printProfiles)
        .values({
          versionId,
          printerName: parsedData.printerName,
          printerNameNormalized: parsedData.printerNameNormalized,
          fileId: fileRecord.id,
          thumbnailPath,
          slicerType: parsedData.slicerType,
          metadata: parsedData.metadata,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!profile) {
        throw new Error("Failed to create profile record");
      }

      return {
        id: profile.id,
        versionId: profile.versionId,
        printerName: profile.printerName,
        printerNameNormalized: profile.printerNameNormalized,
        fileId: profile.fileId,
        thumbnailPath: profile.thumbnailPath,
        slicerType: profile.slicerType as PrintProfile["slicerType"],
        metadata: profile.metadata as PrintProfileMetadata | null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    } catch (error) {
      // Clean up on failure
      await storageService.deleteFile(storageKey).catch(() => {});
      if (thumbnailPath) {
        await storageService.deleteFile(thumbnailPath).catch(() => {});
      }
      throw error;
    }
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0 && lastDot < filename.length - 1) {
      return filename.slice(lastDot + 1).toLowerCase();
    }
    return "";
  }

  private createStoredFilename(originalName: string): string {
    const trimmedName = originalName.trim() || "file";
    const lastDotIndex = trimmedName.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0 && lastDotIndex < trimmedName.length - 1;
    const ext = hasExtension ? trimmedName.slice(lastDotIndex + 1).toLowerCase() : "3mf";
    const baseName = hasExtension ? trimmedName.slice(0, lastDotIndex) : trimmedName;
    const safeBase = slugify(baseName || "file");
    const uniqueSuffix = randomUUID().split("-")[0];
    return `${safeBase}-${uniqueSuffix}.${ext}`;
  }

  /**
   * Create a print profile from an existing source file (auto-parsing on model upload)
   * This reuses the existing modelFiles record instead of creating a new one.
   * Errors are logged but don't throw - auto-parsing is non-blocking.
   *
   * The buffer is passed from the upload process to avoid re-downloading from storage.
   */
  async createProfileFromSourceFile(params: {
    versionId: string;
    organizationId: string;
    modelId: string;
    versionNumber: string;
    fileRecord: {
      id: string;
      filename: string;
      storageKey: string;
      originalName: string;
    };
    buffer: Buffer;
  }): Promise<{ success: boolean; profileId?: string; error?: string }> {
    const { versionId, organizationId, modelId, versionNumber, fileRecord, buffer } = params;

    try {
      // Parse 3MF
      const parseResult = await parse3MFFromBuffer(buffer);
      if (!parseResult.success) {
        return {
          success: false,
          error:
            parseResult.reason === "unknown_format"
              ? "Unsupported slicer format"
              : parseResult.error || "Failed to parse 3MF",
        };
      }

      const parsedData = parseResult.data;
      const timestamp = new Date();

      // Upload thumbnail if present
      let thumbnailPath: string | null = null;
      if (parsedData.thumbnail) {
        const thumbnailFilename = `${fileRecord.filename.replace(".3mf", "")}-profile-thumb.png`;
        thumbnailPath = storageService.generateStorageKey({
          organizationId,
          modelId,
          version: versionNumber,
          filename: thumbnailFilename,
          kind: "artifact",
        });

        await storageService.uploadFile({
          key: thumbnailPath,
          file: parsedData.thumbnail,
          contentType: "image/png",
        });
      }

      // Create profile record (reusing existing modelFiles record)
      const [profile] = await db
        .insert(printProfiles)
        .values({
          versionId,
          printerName: parsedData.printerName,
          printerNameNormalized: parsedData.printerNameNormalized,
          fileId: fileRecord.id,
          thumbnailPath,
          slicerType: parsedData.slicerType,
          metadata: parsedData.metadata,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!profile) {
        // Clean up thumbnail if profile creation failed
        if (thumbnailPath) {
          await storageService.deleteFile(thumbnailPath).catch(() => {});
        }
        return { success: false, error: "Failed to create profile record" };
      }

      return { success: true, profileId: profile.id };
    } catch (error) {
      console.error("Auto-parse 3MF failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const printProfileService = new PrintProfileService();
