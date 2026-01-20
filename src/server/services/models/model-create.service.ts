import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import { slugify } from "@/lib/slug";
import { storageService } from "@/server/services/storage";
import { tagService } from "@/server/services/tags/tag.service";
import { extractThumbnailFrom3MF, is3MFFile } from "@/server/services/parsers";
import { printProfileService } from "@/server/services/models/print-profile.service";

const INITIAL_VERSION = "v1";
const FALLBACK_FILENAME = "model-file";
const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const SLICER_EXTENSIONS = new Set(["3mf"]);

function getStorageKind(extension: string): "source" | "slicer" {
  return SLICER_EXTENSIONS.has(extension.toLowerCase()) ? "slicer" : "source";
}

type UploadedFileMetadata = {
  storageKey: string;
  storageBucket: string;
};

type PreparedFile = UploadedFileMetadata & {
  filename: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  buffer: Buffer;
};

export type CreateModelInput = {
  organizationId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  tags?: string[];
  files: File[];
  previewImage?: File;
  ipAddress?: string | null;
};

export type CreateModelResult = {
  modelId: string;
  versionId: string;
  version: string;
  slug: string;
  storageRoot: string;
  createdAt: Date;
  files: Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
    storageKey: string;
    storageUrl: string | null;
    storageBucket: string;
  }>;
};

export class ModelCreationService {
  async createModel(input: CreateModelInput): Promise<CreateModelResult> {
    if (input.files.length === 0) {
      throw new Error("At least one file is required to create a model");
    }

    const organizationId = input.organizationId;
    const ownerId = input.ownerId;
    const versionLabel = INITIAL_VERSION;
    const timestamp = new Date();
    const modelId = randomUUID();
    const versionId = randomUUID();

    const slug = await this.generateUniqueSlug(organizationId, input.name);

    const uniqueTags = input.tags ? Array.from(new Set(input.tags)) : [];

    const auditMetadata = {
      processed: false,
      uploadedAt: timestamp.toISOString(),
      uploadedBy: ownerId,
      uploadedIp: input.ipAddress ?? undefined,
    } as const;

    const uploadResults: PreparedFile[] = [];

    try {
      for (const file of input.files) {
        const prepared = await this.uploadFile({
          file,
          organizationId,
          modelId,
          version: versionLabel,
        });

        uploadResults.push(prepared);
      }
    } catch (error) {
      await this.cleanupUploadedFiles(uploadResults);
      throw error;
    }

    let thumbnailPath: string | null = null;
    if (input.previewImage) {
      try {
        const ext = input.previewImage.name.split(".").pop()?.toLowerCase() || "jpg";
        const previewFilename = `preview.${ext}`;
        const previewKey = storageService.generateStorageKey({
          organizationId,
          modelId,
          version: versionLabel,
          filename: previewFilename,
          kind: "artifact",
        });

        await storageService.uploadFile({
          key: previewKey,
          file: input.previewImage,
        });

        thumbnailPath = previewKey;
      } catch (error) {
        await this.cleanupUploadedFiles(uploadResults);
        throw error;
      }
    } else {
      // Fallback: Try to extract thumbnail from 3MF file
      thumbnailPath = await this.extractFallbackThumbnail({
        files: input.files,
        organizationId,
        modelId,
        version: versionLabel,
      });
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [model] = await tx
          .insert(models)
          .values({
            id: modelId,
            organizationId,
            ownerId,
            slug,
            name: input.name,
            description: input.description ?? null,
            currentVersion: versionLabel,
            totalVersions: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();

        if (!model) {
          throw new Error("Failed to create model record");
        }

        const [version] = await tx
          .insert(modelVersions)
          .values({
            id: versionId,
            modelId,
            version: versionLabel,
            name: input.name,
            description: input.description ?? null,
            thumbnailPath,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning();

        if (!version) {
          throw new Error("Failed to create model version");
        }

        const files = await tx
          .insert(modelFiles)
          .values(
            uploadResults.map((file) => ({
              versionId,
              filename: file.filename,
              originalName: file.originalName,
              size: file.size,
              mimeType: file.mimeType,
              extension: file.extension,
              storageKey: file.storageKey,
              storageBucket: file.storageBucket,
              storageUrl: storageService.getFileUrl(file.storageKey),
              fileMetadata: {
                ...auditMetadata,
              },
              createdAt: timestamp,
              updatedAt: timestamp,
            })),
          )
          .returning();

        if (uniqueTags.length) {
          await tagService.addTagsToModel(modelId, uniqueTags, organizationId, tx);
        }

        // Update organization usage counters
        const totalFileSize = uploadResults.reduce((sum, f) => sum + f.size, 0);
        await tx
          .update(organization)
          .set({
            currentModelCount: sql`COALESCE(${organization.currentModelCount}, 0) + 1`,
            currentStorage: sql`COALESCE(${organization.currentStorage}, 0) + ${totalFileSize}`,
          })
          .where(eq(organization.id, organizationId));

        return {
          model,
          version,
          files,
        };
      });

      const storageRoot = storageService.getModelVersionRoot({
        organizationId,
        modelId,
        version: versionLabel,
      });

      // Auto-parse 3MF files into print profiles (non-blocking)
      await this.autoCreatePrintProfiles({
        uploadResults,
        createdFiles: result.files,
        versionId,
        organizationId,
        modelId,
        versionNumber: versionLabel,
      });

      return {
        modelId: result.model.id,
        versionId: result.version.id,
        version: versionLabel,
        slug,
        storageRoot,
        createdAt: timestamp,
        files: result.files.map((file) => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          extension: file.extension,
          storageKey: file.storageKey,
          storageUrl: file.storageUrl,
          storageBucket: file.storageBucket,
        })),
      };
    } catch (error) {
      await this.cleanupUploadedFiles(uploadResults);
      throw error;
    }
  }

  private async generateUniqueSlug(organizationId: string, name: string): Promise<string> {
    const baseSlug = slugify(name, "model");
    let candidate = baseSlug;
    let index = 1;

    for (;;) {
      const existing = await db.query.models.findFirst({
        columns: { id: true },
        where: and(eq(models.organizationId, organizationId), eq(models.slug, candidate)),
      });

      if (!existing) {
        return candidate;
      }

      candidate = `${baseSlug}-${index}`;
      index += 1;
    }
  }

  private async uploadFile(options: {
    file: File;
    organizationId: string;
    modelId: string;
    version: string;
  }): Promise<PreparedFile> {
    const { file, organizationId, modelId, version } = options;
    const originalName = file.name || FALLBACK_FILENAME;
    const { storedFilename, extension } = this.createStoredFilename(originalName);
    const kind = getStorageKind(extension);
    const storageKey = storageService.generateStorageKey({
      organizationId,
      modelId,
      version,
      filename: storedFilename,
      kind,
    });

    // Create buffer once - used for both upload and downstream processing (e.g., 3MF parsing)
    const buffer = Buffer.from(await file.arrayBuffer());

    await storageService.uploadFile({
      key: storageKey,
      file: buffer,
      contentType: file.type || DEFAULT_CONTENT_TYPE,
    });

    return {
      storageKey,
      storageBucket: storageService.defaultBucket,
      filename: storedFilename,
      originalName,
      mimeType: file.type || DEFAULT_CONTENT_TYPE,
      extension,
      size: file.size,
      buffer,
    };
  }

  private createStoredFilename(originalName: string): {
    storedFilename: string;
    extension: string;
  } {
    const trimmedName = originalName.trim() || FALLBACK_FILENAME;
    const lastDotIndex = trimmedName.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0 && lastDotIndex < trimmedName.length - 1;
    const extension = hasExtension ? trimmedName.slice(lastDotIndex + 1).toLowerCase() : "";
    const baseName = hasExtension ? trimmedName.slice(0, lastDotIndex) : trimmedName;
    const safeBase = slugify(baseName || FALLBACK_FILENAME);
    const uniqueSuffix = randomUUID().split("-")[0];
    const storedFilename = extension
      ? `${safeBase}-${uniqueSuffix}.${extension}`
      : `${safeBase}-${uniqueSuffix}`;

    return {
      storedFilename,
      extension: extension || "bin",
    };
  }

  private async cleanupUploadedFiles(files: UploadedFileMetadata[]): Promise<void> {
    await Promise.all(
      files.map((file) => storageService.deleteFile(file.storageKey).catch(() => {})),
    );
  }

  /**
   * Auto-parse 3MF files into print profiles
   * This runs after model creation and is non-blocking (errors are logged but don't fail the upload)
   */
  private async autoCreatePrintProfiles(options: {
    uploadResults: PreparedFile[];
    createdFiles: Array<{ id: string; filename: string; storageKey: string; originalName: string }>;
    versionId: string;
    organizationId: string;
    modelId: string;
    versionNumber: string;
  }): Promise<void> {
    const { uploadResults, createdFiles, versionId, organizationId, modelId, versionNumber } =
      options;

    for (const uploadResult of uploadResults) {
      if (!is3MFFile(uploadResult.originalName)) {
        continue;
      }

      // Find the created file record by matching storage key
      const fileRecord = createdFiles.find((f) => f.storageKey === uploadResult.storageKey);
      if (!fileRecord) {
        console.error(`Could not find file record for ${uploadResult.originalName}`);
        continue;
      }

      // Create print profile from this 3MF file using the buffer we already have
      const result = await printProfileService.createProfileFromSourceFile({
        versionId,
        organizationId,
        modelId,
        versionNumber,
        fileRecord,
        buffer: uploadResult.buffer,
      });

      if (!result.success) {
        console.warn(`Auto-parse failed for ${uploadResult.originalName}: ${result.error}`);
      }
    }
  }

  /**
   * Extract thumbnail from the first 3MF file found in the uploaded files
   * Returns the storage key if successful, null otherwise
   */
  private async extractFallbackThumbnail(options: {
    files: File[];
    organizationId: string;
    modelId: string;
    version: string;
  }): Promise<string | null> {
    const { files, organizationId, modelId, version } = options;

    // Find first 3MF file
    const threeMFFile = files.find((file) => is3MFFile(file.name));
    if (!threeMFFile) {
      return null;
    }

    try {
      const buffer = Buffer.from(await threeMFFile.arrayBuffer());
      const thumbnail = await extractThumbnailFrom3MF(buffer);

      if (!thumbnail) {
        return null;
      }

      const previewKey = storageService.generateStorageKey({
        organizationId,
        modelId,
        version,
        filename: "preview-extracted.png",
        kind: "artifact",
      });

      await storageService.uploadFile({
        key: previewKey,
        file: thumbnail,
        contentType: "image/png",
      });

      return previewKey;
    } catch {
      // Silently fail - fallback is optional
      return null;
    }
  }
}

export const modelCreationService = new ModelCreationService();
