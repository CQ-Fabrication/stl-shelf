import archiver from 'archiver'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modelFiles, models, modelVersions } from '@/lib/db/schema/models'
import { storageService } from '@/server/services/storage'

type ModelFileData = {
  id: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  extension: string
  storageKey: string
  storageUrl: string | null
  storageBucket: string
}

class ModelDownloadService {
  /**
   * Download a single file by its storage key
   */
  async downloadSingleFile(
    storageKey: string,
    organizationId: string
  ): Promise<Blob> {
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
      )

    if (!file) {
      throw new Error('File not found or access denied')
    }

    const fileData = await storageService.getFile(storageKey)

    return new Blob([Buffer.from(fileData.body)], {
      type: file.mimeType || 'application/octet-stream',
    })
  }

  /**
   * Download all files for a model's current version as a ZIP
   */
  async downloadModelAsZip(
    modelId: string,
    organizationId: string
  ): Promise<Blob> {
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
      )

    if (!model) {
      throw new Error('Model not found or access denied')
    }

    const files = await this.getVersionFiles(
      modelId,
      model.currentVersion,
      organizationId
    )

    if (files.length === 0) {
      throw new Error('No files found for this model')
    }

    return await this.createZipBlob(files, model.slug)
  }

  /**
   * Download all files for a specific model version as a ZIP
   */
  async downloadVersionAsZip(
    modelId: string,
    versionId: string,
    organizationId: string
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
          isNull(models.deletedAt)
        )
      )

    if (!version) {
      throw new Error('Version not found or access denied')
    }

    const files = await this.getVersionFilesByVersionId(
      versionId,
      organizationId
    )

    if (files.length === 0) {
      throw new Error('No files found for this version')
    }

    return await this.createZipBlob(files, version.modelSlug)
  }

  private async getVersionFiles(
    modelId: string,
    version: string,
    organizationId: string
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
          isNull(models.deletedAt)
        )
      )
      .orderBy(modelFiles.filename)

    return files
  }

  private async getVersionFilesByVersionId(
    versionId: string,
    organizationId: string
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
          isNull(models.deletedAt)
        )
      )
      .orderBy(modelFiles.filename)

    return files
  }

  private async createZipBlob(
    files: ModelFileData[],
    modelSlug: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      })

      const chunks: Buffer[] = []

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      archive.on('end', () => {
        const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' })
        resolve(blob)
      })

      archive.on('error', (err) => {
        reject(err)
      })

      this.addFilesToArchive(archive, files, modelSlug)
        .then(() => archive.finalize())
        .catch(reject)
    })
  }

  private async addFilesToArchive(
    archive: archiver.Archiver,
    files: ModelFileData[],
    modelSlug: string
  ): Promise<void> {
    const folderName = modelSlug

    for (const file of files) {
      try {
        const fileData = await storageService.getFile(file.storageKey)

        archive.append(Buffer.from(fileData.body), {
          name: `${folderName}/${file.originalName}`,
        })
      } catch {
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
    filename: string
    size: number
    mimeType: string
    downloadUrl?: string
  }> {
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
      )

    if (!file) {
      throw new Error('File not found or access denied')
    }

    const downloadUrl = await storageService.generateDownloadUrl(storageKey, 60)

    return {
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType || 'application/octet-stream',
      downloadUrl,
    }
  }
}

export const modelDownloadService = new ModelDownloadService()
