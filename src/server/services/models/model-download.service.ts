import archiver from "archiver";
import { Readable } from "stream";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelFiles, models, modelVersions, printProfiles } from "@/lib/db/schema/models";
import { storageService } from "@/server/services/storage";

type ModelFileData = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  storageKey: string;
  storageUrl: string | null;
  storageBucket: string;
};

class ModelDownloadService {
  /**
   * Download a single file by its storage key
   */
  async downloadSingleFile(storageKey: string, organizationId: string): Promise<Blob> {
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
          isNull(models.deletedAt),
        ),
      );

    if (!file) {
      throw new Error("File not found or access denied");
    }

    const fileData = await storageService.getFile(storageKey);

    return new Blob([Buffer.from(fileData.body)], {
      type: file.mimeType || "application/octet-stream",
    });
  }

  /**
   * Download all files for a model's current version as a ZIP
   */
  async downloadModelAsZip(modelId: string, organizationId: string): Promise<Blob> {
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
          isNull(models.deletedAt),
        ),
      );

    if (!model) {
      throw new Error("Model not found or access denied");
    }

    const files = await this.getVersionFiles(modelId, model.currentVersion, organizationId);

    if (files.length === 0) {
      throw new Error("No files found for this model");
    }

    return await this.createZipBlob(files, model.slug);
  }

  /**
   * Download all files for a specific model version as a ZIP
   * Includes print profiles in a profiles/ subdirectory
   */
  async downloadVersionAsZip(
    modelId: string,
    versionId: string,
    organizationId: string,
  ): Promise<Blob> {
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
          isNull(models.deletedAt),
        ),
      );

    if (!version) {
      throw new Error("Version not found or access denied");
    }

    // Get print profiles for this version
    const profiles = await db.query.printProfiles.findMany({
      where: eq(printProfiles.versionId, versionId),
      with: {
        file: true,
      },
    });

    // Get profile file IDs to exclude from source files
    const profileFileIds = profiles.map((p) => p.fileId);

    // Get source files (excluding profile files)
    const sourceFiles = await this.getSourceFilesForVersion(
      versionId,
      organizationId,
      profileFileIds,
    );

    if (sourceFiles.length === 0 && profiles.length === 0) {
      throw new Error("No files found for this version");
    }

    return await this.createZipBlobWithProfiles(
      sourceFiles,
      profiles.map((p) => ({
        ...p.file,
        printerName: p.printerName,
      })),
      version.modelSlug,
    );
  }

  private async getVersionFiles(
    modelId: string,
    version: string,
    organizationId: string,
  ): Promise<ModelFileData[]> {
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
          isNull(models.deletedAt),
        ),
      )
      .orderBy(modelFiles.filename);

    return files;
  }

  private async getVersionFilesByVersionId(
    versionId: string,
    organizationId: string,
  ): Promise<ModelFileData[]> {
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
          isNull(models.deletedAt),
        ),
      )
      .orderBy(modelFiles.filename);

    return files;
  }

  private async createZipBlob(files: ModelFileData[], modelSlug: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
        resolve(blob);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      this.addFilesToArchive(archive, files, modelSlug)
        .then(() => archive.finalize())
        .catch(reject);
    });
  }

  private async createZipBlobWithProfiles(
    sourceFiles: ModelFileData[],
    profileFiles: (ModelFileData & { printerName: string })[],
    modelSlug: string,
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        const blob = new Blob(chunks as BlobPart[], { type: "application/zip" });
        resolve(blob);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      this.addFilesAndProfilesToArchive(archive, sourceFiles, profileFiles, modelSlug)
        .then(() => archive.finalize())
        .catch(reject);
    });
  }

  private async getSourceFilesForVersion(
    versionId: string,
    organizationId: string,
    excludeFileIds: string[],
  ): Promise<ModelFileData[]> {
    const baseConditions = [
      eq(modelFiles.versionId, versionId),
      eq(models.organizationId, organizationId),
      isNull(models.deletedAt),
    ];

    // Add exclusion condition only if there are files to exclude
    const conditions =
      excludeFileIds.length > 0
        ? [...baseConditions, notInArray(modelFiles.id, excludeFileIds)]
        : baseConditions;

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
      .where(and(...conditions))
      .orderBy(modelFiles.filename);

    return files;
  }

  private async addFilesAndProfilesToArchive(
    archive: archiver.Archiver,
    sourceFiles: ModelFileData[],
    profileFiles: (ModelFileData & { printerName: string })[],
    modelSlug: string,
  ): Promise<void> {
    const folderName = modelSlug;

    // Add source files to root
    for (const file of sourceFiles) {
      try {
        const fileData = await storageService.getFile(file.storageKey);
        archive.append(Buffer.from(fileData.body), {
          name: `${folderName}/${file.originalName}`,
        });
      } catch {
        // Continue with other files even if one fails
      }
    }

    // Add profile files to profiles/ subdirectory
    for (const profile of profileFiles) {
      try {
        const fileData = await storageService.getFile(profile.storageKey);
        archive.append(Buffer.from(fileData.body), {
          name: `${folderName}/profiles/${profile.originalName}`,
        });
      } catch {
        // Continue with other files even if one fails
      }
    }
  }

  private async addFilesToArchive(
    archive: archiver.Archiver,
    files: ModelFileData[],
    modelSlug: string,
  ): Promise<void> {
    const folderName = modelSlug;

    for (const file of files) {
      try {
        const fileData = await storageService.getFile(file.storageKey);

        archive.append(Buffer.from(fileData.body), {
          name: `${folderName}/${file.originalName}`,
        });
      } catch {
        // Continue with other files even if one fails
      }
    }
  }

  // ============================================================
  // STREAMING ZIP METHODS (Server-side ZIP creation)
  // ============================================================

  /**
   * Get version info for streaming ZIP download
   * Returns model name, version number, and files for ZIP naming
   */
  async getVersionInfo(
    versionId: string,
    organizationId: string,
  ): Promise<{
    modelId: string;
    modelName: string;
    modelSlug: string;
    versionId: string;
    versionNumber: string;
    files: ModelFileData[];
  } | null> {
    const [version] = await db
      .select({
        id: modelVersions.id,
        version: modelVersions.version,
        modelId: models.id,
        modelName: models.name,
        modelSlug: models.slug,
      })
      .from(modelVersions)
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(
        and(
          eq(modelVersions.id, versionId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt),
        ),
      );

    if (!version) {
      return null;
    }

    const files = await this.getVersionFilesByVersionId(versionId, organizationId);

    return {
      modelId: version.modelId,
      modelName: version.modelName,
      modelSlug: version.modelSlug,
      versionId: version.id,
      versionNumber: version.version,
      files,
    };
  }

  /**
   * Stream files from R2 directly into archiver
   * Does NOT load entire files into memory - true streaming
   */
  async streamFilesToArchive(archive: archiver.Archiver, files: ModelFileData[]): Promise<void> {
    for (const file of files) {
      try {
        // Get readable stream from R2 (not the entire file in memory)
        const stream = await storageService.getFileStream(file.storageKey);

        // Convert web ReadableStream to Node.js Readable for archiver
        const nodeStream = this.webStreamToNodeStream(stream);

        archive.append(nodeStream, { name: file.originalName });
      } catch (error) {
        // Log error but continue with other files
        console.error(`Failed to stream file ${file.originalName}:`, error);
      }
    }
  }

  /**
   * Convert web ReadableStream to Node.js Readable stream
   * Needed because archiver expects Node.js streams
   */
  private webStreamToNodeStream(webStream: ReadableStream<Uint8Array>): Readable {
    const reader = webStream.getReader();

    return new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (error) {
          this.destroy(error instanceof Error ? error : new Error(String(error)));
        }
      },
    });
  }

  /**
   * Get download metadata for a file without actually downloading it
   */
  async getFileDownloadInfo(
    storageKey: string,
    organizationId: string,
  ): Promise<{
    filename: string;
    size: number;
    mimeType: string;
    downloadUrl?: string;
  }> {
    const [file] = await db
      .select({
        id: modelFiles.id,
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
          isNull(models.deletedAt),
        ),
      );

    if (!file) {
      throw new Error("File not found or access denied");
    }

    return {
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType || "application/octet-stream",
      downloadUrl: `/api/download/file/${file.id}`,
    };
  }
}

export const modelDownloadService = new ModelDownloadService();
