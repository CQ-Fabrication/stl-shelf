import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { modelFiles, models, modelVersions } from "@/db/schema/models";
import { slugify } from "@/lib/slug";
import { storageService } from "@/services/storage";
import { tagService } from "@/services/tags/tag.service";

const INITIAL_VERSION = "v1";
const FALLBACK_FILENAME = "model-file";
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

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
};

export type CreateModelInput = {
  organizationId: string;
  ownerId: string;
  name: string;
  description?: string | null;
  tags?: string[];
  files: File[];
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
            }))
          )
          .returning();

        if (uniqueTags.length) {
          await tagService.addTagsToModel(
            modelId,
            uniqueTags,
            organizationId,
            tx
          );
        }

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

  private async generateUniqueSlug(
    organizationId: string,
    name: string
  ): Promise<string> {
    const baseSlug = slugify(name, "model");
    let candidate = baseSlug;
    let index = 1;

    for (;;) {
      const existing = await db.query.models.findFirst({
        columns: { id: true },
        where: and(
          eq(models.organizationId, organizationId),
          eq(models.slug, candidate)
        ),
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
    const { storedFilename, extension } =
      this.createStoredFilename(originalName);
    const storageKey = storageService.generateStorageKey({
      organizationId,
      modelId,
      version,
      filename: storedFilename,
      kind: "source",
    });

    await storageService.uploadFile({
      key: storageKey,
      file,
      contentType: file.type || DEFAULT_CONTENT_TYPE,
    });

    return {
      storageKey,
      storageBucket: storageService.defaultModelsBucket,
      filename: storedFilename,
      originalName,
      mimeType: file.type || DEFAULT_CONTENT_TYPE,
      extension,
      size: file.size,
    };
  }

  private createStoredFilename(originalName: string): {
    storedFilename: string;
    extension: string;
  } {
    const trimmedName = originalName.trim() || FALLBACK_FILENAME;
    const lastDotIndex = trimmedName.lastIndexOf(".");
    const hasExtension =
      lastDotIndex > 0 && lastDotIndex < trimmedName.length - 1;
    const extension = hasExtension
      ? trimmedName.slice(lastDotIndex + 1).toLowerCase()
      : "";
    const baseName = hasExtension
      ? trimmedName.slice(0, lastDotIndex)
      : trimmedName;
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

  private async cleanupUploadedFiles(
    files: UploadedFileMetadata[]
  ): Promise<void> {
    await Promise.all(
      files.map((file) =>
        storageService
          .deleteFile(file.storageKey, file.storageBucket)
          .catch(() => {})
      )
    );
  }
}

export const modelCreationService = new ModelCreationService();
