import archiver from "archiver";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { modelFiles, models, modelVersions } from "@/db/schema/models";
import type { ModelFileResponse } from "@/routers/models";
import { storageService } from "@/services/storage";

class ModelDownloadService {
  /**
   * Download a single file by its storage key
   * Returns the file as a Blob
   */
  async downloadSingleFile(
    storageKey: string,
    organizationId: string
  ): Promise<Blob> {
    // Verify authorization and get file metadata in a single query
    const [file] = await db
      .select({
        filename: modelFiles.filename,
        originalName: modelFiles.originalName,
        size: modelFiles.size,
        mimeType: modelFiles.mimeType,
        storageBucket: modelFiles.storageBucket,
      })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelVersions.id, modelFiles.versionId))
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelFiles.storageKey, storageKey),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      );

    if (!file) {
      throw new Error("File not found or access denied");
    }

    // Get file from storage
    const fileData = await storageService.getFile(
      storageKey,
      file.storageBucket
    );

    return new Blob([fileData.body], {
      type: file.mimeType || "application/octet-stream",
    });
  }

  /**
   * Download all files for a model's current version as a ZIP
   */
  async downloadModelAsZip(
    modelId: string,
    organizationId: string
  ): Promise<Blob> {
    // Get model with current version
    const [model] = await db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        currentVersion: models.currentVersion,
      })
      .from(models)
      .where(
        and(
          eq(models.id, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      );

    if (!model) {
      throw new Error("Model not found or access denied");
    }

    // Get the current version's files
    const files = await this.getVersionFiles(
      modelId,
      model.currentVersion,
      organizationId
    );

    if (files.length === 0) {
      throw new Error("No files found for this model");
    }

    // Create ZIP and return as Blob
    const zipBlob = await this.createZipBlob(files, model.slug);
    return zipBlob;
  }

  /**
   * Download all files for a specific model version as a ZIP
   */
  async downloadVersionAsZip(
    modelId: string,
    versionId: string,
    organizationId: string
  ): Promise<Blob> {
    // Verify authorization and get version info
    const [version] = await db
      .select({
        id: modelVersions.id,
        version: modelVersions.version,
        modelSlug: models.slug,
      })
      .from(modelVersions)
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelVersions.id, versionId),
          eq(modelVersions.modelId, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      );

    if (!version) {
      throw new Error("Version not found or access denied");
    }

    // Get version files
    const files = await this.getVersionFilesByVersionId(
      versionId,
      organizationId
    );

    if (files.length === 0) {
      throw new Error("No files found for this version");
    }

    // Create ZIP and return as Blob
    const zipBlob = await this.createZipBlob(files, version.modelSlug);
    return zipBlob;
  }

  /**
   * Get files for a specific version with authorization check
   */
  private async getVersionFiles(
    modelId: string,
    version: string,
    organizationId: string
  ): Promise<ModelFileResponse[]> {
    const files = await db
      .select({
        id: modelFiles.id,
        filename: modelFiles.filename,
        originalName: modelFiles.originalName,
        size: modelFiles.size,
        mimeType: modelFiles.mimeType,
        extension: modelFiles.extension,
        storageKey: modelFiles.storageKey,
        storageUrl: modelFiles.storageUrl,
        storageBucket: modelFiles.storageBucket,
      })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelVersions.id, modelFiles.versionId))
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelVersions.modelId, modelId),
          eq(modelVersions.version, version),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .orderBy(modelFiles.filename);

    return files;
  }

  /**
   * Get files by version ID with authorization check
   */
  private async getVersionFilesByVersionId(
    versionId: string,
    organizationId: string
  ): Promise<ModelFileResponse[]> {
    const files = await db
      .select({
        id: modelFiles.id,
        filename: modelFiles.filename,
        originalName: modelFiles.originalName,
        size: modelFiles.size,
        mimeType: modelFiles.mimeType,
        extension: modelFiles.extension,
        storageKey: modelFiles.storageKey,
        storageUrl: modelFiles.storageUrl,
        storageBucket: modelFiles.storageBucket,
      })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelVersions.id, modelFiles.versionId))
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelFiles.versionId, versionId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .orderBy(modelFiles.filename);

    return files;
  }

  /**
   * Create a ZIP blob from files
   */
  private async createZipBlob(
    files: ModelFileResponse[],
    modelSlug: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Uint8Array[] = [];

      // Collect chunks
      archive.on("data", (chunk) => {
        chunks.push(chunk);
      });

      // Resolve with Blob when done
      archive.on("end", () => {
        const blob = new Blob(chunks, { type: "application/zip" });
        resolve(blob);
      });

      // Handle errors
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });

      // Add files to archive
      this.addFilesToArchive(archive, files, modelSlug)
        .then(() => archive.finalize())
        .catch(reject);
    });
  }

  /**
   * Add files to the archive
   */
  private async addFilesToArchive(
    archive: archiver.Archiver,
    files: ModelFileResponse[],
    modelSlug: string
  ): Promise<void> {
    const folderName = modelSlug;

    // Process files sequentially to avoid memory issues
    for (const file of files) {
      try {
        // Get file from storage
        const fileData = await storageService.getFile(
          file.storageKey,
          file.storageBucket
        );

        // Add to archive with original filename in a folder
        archive.append(Buffer.from(fileData.body), {
          name: `${folderName}/${file.originalName}`,
        });
      } catch (error) {
        console.error(
          `Failed to add file ${file.originalName} to archive:`,
          error
        );
        // Continue with other files even if one fails
      }
    }
  }

  /**
   * Get download metadata for a file without actually downloading it
   */
  async getFileDownloadInfo(
    storageKey: string,
    organizationId: string
  ): Promise<{
    filename: string;
    size: number;
    mimeType: string;
    downloadUrl?: string;
  }> {
    // Verify authorization and get file metadata
    const [file] = await db
      .select({
        filename: modelFiles.filename,
        originalName: modelFiles.originalName,
        size: modelFiles.size,
        mimeType: modelFiles.mimeType,
        storageBucket: modelFiles.storageBucket,
      })
      .from(modelFiles)
      .innerJoin(modelVersions, eq(modelVersions.id, modelFiles.versionId))
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelFiles.storageKey, storageKey),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      );

    if (!file) {
      throw new Error("File not found or access denied");
    }

    // Generate presigned URL for direct download
    const downloadUrl = await storageService.generateDownloadUrl(
      storageKey,
      file.storageBucket,
      60 // 60 minutes expiry
    );

    return {
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType || "application/octet-stream",
      downloadUrl,
    };
  }
}

export const modelDownloadService = new ModelDownloadService();
