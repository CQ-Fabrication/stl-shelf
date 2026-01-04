import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import {
  type CompletenessCategory,
  canAddToCategory,
  canRemoveFile,
  getCategoryFromExtension,
} from "@/lib/files/completeness";
import { slugify } from "@/lib/slug";
import { storageService } from "@/server/services/storage";

const FALLBACK_FILENAME = "file";
const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const SLICER_EXTENSIONS = new Set(["3mf"]);

function getStorageKind(extension: string): "source" | "slicer" | "artifact" {
  if (SLICER_EXTENSIONS.has(extension.toLowerCase())) return "slicer";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension.toLowerCase())) return "artifact";
  return "source";
}

export type AddFileToVersionInput = {
  versionId: string;
  organizationId: string;
  userId: string;
  file: File;
  ipAddress?: string | null;
};

export type AddFileToVersionResult = {
  file: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
    storageKey: string;
    storageUrl: string | null;
    storageBucket: string;
    createdAt: Date;
  };
  category: CompletenessCategory;
};

export type RemoveFileFromVersionInput = {
  fileId: string;
  organizationId: string;
};

export class ModelFileService {
  async addFileToVersion(input: AddFileToVersionInput): Promise<AddFileToVersionResult> {
    const version = await db.query.modelVersions.findFirst({
      where: eq(modelVersions.id, input.versionId),
      with: {
        model: {
          columns: { id: true, organizationId: true },
        },
      },
    });

    if (!version || version.model.organizationId !== input.organizationId) {
      throw new Error("Version not found or access denied");
    }

    const extension = this.extractExtension(input.file.name);
    const category = getCategoryFromExtension(extension);

    if (!category) {
      throw new Error(`File type .${extension} is not supported for this operation`);
    }

    const existingFiles = await db.query.modelFiles.findMany({
      where: eq(modelFiles.versionId, input.versionId),
      columns: { extension: true, createdAt: true },
    });

    const canAdd = canAddToCategory(existingFiles, category);
    if (!canAdd.allowed) {
      throw new Error(canAdd.reason || "Cannot add file to this category");
    }

    const timestamp = new Date();
    const { storedFilename, ext } = this.createStoredFilename(input.file.name);
    const kind = getStorageKind(ext);

    const storageKey = storageService.generateStorageKey({
      organizationId: input.organizationId,
      modelId: version.model.id,
      version: version.version,
      filename: storedFilename,
      kind,
    });

    try {
      await storageService.uploadFile({
        key: storageKey,
        file: input.file,
        contentType: input.file.type || DEFAULT_CONTENT_TYPE,
      });

      const [file] = await db
        .insert(modelFiles)
        .values({
          versionId: input.versionId,
          filename: storedFilename,
          originalName: input.file.name,
          size: input.file.size,
          mimeType: input.file.type || DEFAULT_CONTENT_TYPE,
          extension: ext,
          storageKey,
          storageBucket: storageService.defaultBucket,
          storageUrl: storageService.getFileUrl(storageKey),
          fileMetadata: {
            processed: false,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!file) {
        throw new Error("Failed to create file record");
      }

      await db
        .update(modelVersions)
        .set({ updatedAt: timestamp })
        .where(eq(modelVersions.id, input.versionId));

      await db.update(models).set({ updatedAt: timestamp }).where(eq(models.id, version.model.id));

      return {
        file: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          extension: file.extension,
          storageKey: file.storageKey,
          storageUrl: file.storageUrl,
          storageBucket: file.storageBucket,
          createdAt: file.createdAt,
        },
        category,
      };
    } catch (error) {
      await storageService.deleteFile(storageKey).catch(() => {});
      throw error;
    }
  }

  async removeFileFromVersion(
    input: RemoveFileFromVersionInput,
  ): Promise<{ success: true; fileId: string }> {
    const file = await db.query.modelFiles.findFirst({
      where: eq(modelFiles.id, input.fileId),
      with: {
        version: {
          with: {
            model: {
              columns: { id: true, organizationId: true },
            },
          },
        },
      },
    });

    if (!file || file.version.model.organizationId !== input.organizationId) {
      throw new Error("File not found or access denied");
    }

    const removal = canRemoveFile({
      extension: file.extension,
      createdAt: file.createdAt,
    });

    if (!removal.allowed) {
      throw new Error(removal.reason || "Cannot remove this file");
    }

    await storageService.deleteFile(file.storageKey).catch((err) => {
      console.error("Failed to delete file from storage:", err);
    });

    await db.delete(modelFiles).where(eq(modelFiles.id, input.fileId));

    const timestamp = new Date();
    await db
      .update(modelVersions)
      .set({ updatedAt: timestamp })
      .where(eq(modelVersions.id, file.version.id));

    await db
      .update(models)
      .set({ updatedAt: timestamp })
      .where(eq(models.id, file.version.model.id));

    return { success: true, fileId: input.fileId };
  }

  async getVersionFiles(versionId: string) {
    return db.query.modelFiles.findMany({
      where: eq(modelFiles.versionId, versionId),
      orderBy: (files, { asc }) => [asc(files.createdAt)],
    });
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0 && lastDot < filename.length - 1) {
      return filename.slice(lastDot + 1).toLowerCase();
    }
    return "";
  }

  private createStoredFilename(originalName: string): {
    storedFilename: string;
    ext: string;
  } {
    const trimmedName = originalName.trim() || FALLBACK_FILENAME;
    const lastDotIndex = trimmedName.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0 && lastDotIndex < trimmedName.length - 1;
    const ext = hasExtension ? trimmedName.slice(lastDotIndex + 1).toLowerCase() : "";
    const baseName = hasExtension ? trimmedName.slice(0, lastDotIndex) : trimmedName;
    const safeBase = slugify(baseName || FALLBACK_FILENAME);
    const uniqueSuffix = randomUUID().split("-")[0];
    const storedFilename = ext
      ? `${safeBase}-${uniqueSuffix}.${ext}`
      : `${safeBase}-${uniqueSuffix}`;

    return { storedFilename, ext: ext || "bin" };
  }
}

export const modelFileService = new ModelFileService();
