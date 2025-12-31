import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { modelFiles, models, modelVersions } from '@/lib/db/schema/models'
import { slugify } from '@/lib/slug'
import { storageService } from '@/server/services/storage'

const FALLBACK_FILENAME = 'model-file'
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const VERSION_REGEX = /^v(\d+)$/
const SLICER_EXTENSIONS = new Set(['3mf'])

function getStorageKind(extension: string): 'source' | 'slicer' {
  return SLICER_EXTENSIONS.has(extension.toLowerCase()) ? 'slicer' : 'source'
}

type UploadedFileMetadata = {
  storageKey: string
  storageBucket: string
}

type PreparedFile = UploadedFileMetadata & {
  filename: string
  originalName: string
  mimeType: string
  extension: string
  size: number
}

export type AddVersionInput = {
  modelId: string
  organizationId: string
  ownerId: string
  changelog: string
  files: File[]
  previewImage?: File
  ipAddress?: string | null
}

export type AddVersionResult = {
  versionId: string
  version: string
  files: Array<{
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
    extension: string
    storageKey: string
    storageUrl: string | null
    storageBucket: string
  }>
}

export class ModelVersionService {
  async addVersion(input: AddVersionInput): Promise<AddVersionResult> {
    if (input.files.length === 0) {
      throw new Error('At least one file is required to create a version')
    }

    const model = await db.query.models.findFirst({
      where: and(
        eq(models.id, input.modelId),
        eq(models.organizationId, input.organizationId)
      ),
    })

    if (!model) {
      throw new Error('Model not found or access denied')
    }

    const currentVersionData = await db.query.modelVersions.findFirst({
      where: and(
        eq(modelVersions.modelId, input.modelId),
        eq(modelVersions.version, model.currentVersion)
      ),
      columns: {
        thumbnailPath: true,
      },
    })

    const fallbackThumbnailPath = currentVersionData?.thumbnailPath ?? null

    const currentVersion = model.currentVersion
    const versionNumber = this.extractVersionNumber(currentVersion)
    const newVersionLabel = `v${versionNumber + 1}`

    const timestamp = new Date()
    const versionId = randomUUID()

    const auditMetadata = {
      processed: false,
      uploadedAt: timestamp.toISOString(),
      uploadedBy: input.ownerId,
      uploadedIp: input.ipAddress ?? undefined,
    } as const

    const uploadResults: PreparedFile[] = []

    try {
      for (const file of input.files) {
        const prepared = await this.uploadFile({
          file,
          organizationId: input.organizationId,
          modelId: input.modelId,
          version: newVersionLabel,
        })

        uploadResults.push(prepared)
      }
    } catch (error) {
      await this.cleanupUploadedFiles(uploadResults)
      throw error
    }

    let thumbnailPath = fallbackThumbnailPath
    if (input.previewImage) {
      try {
        const ext =
          input.previewImage.name.split('.').pop()?.toLowerCase() || 'jpg'
        const previewFilename = `preview.${ext}`
        const previewKey = storageService.generateStorageKey({
          organizationId: input.organizationId,
          modelId: input.modelId,
          version: newVersionLabel,
          filename: previewFilename,
          kind: 'artifact',
        })

        await storageService.uploadFile({
          key: previewKey,
          file: input.previewImage,
        })

        thumbnailPath = previewKey
      } catch (error) {
        await this.cleanupUploadedFiles(uploadResults)
        throw error
      }
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [version] = await tx
          .insert(modelVersions)
          .values({
            id: versionId,
            modelId: input.modelId,
            version: newVersionLabel,
            name: model.name,
            description: input.changelog,
            thumbnailPath,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .returning()

        if (!version) {
          throw new Error('Failed to create model version')
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
          .returning()

        await tx
          .update(models)
          .set({
            currentVersion: newVersionLabel,
            totalVersions: model.totalVersions + 1,
            updatedAt: timestamp,
          })
          .where(eq(models.id, input.modelId))

        return {
          version,
          files,
        }
      })

      return {
        versionId: result.version.id,
        version: newVersionLabel,
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
      }
    } catch (error) {
      await this.cleanupUploadedFiles(uploadResults)
      throw error
    }
  }

  private extractVersionNumber(versionLabel: string): number {
    const match = versionLabel.match(VERSION_REGEX)
    if (match?.[1]) {
      return Number.parseInt(match[1], 10)
    }
    return 1
  }

  private async uploadFile(options: {
    file: File
    organizationId: string
    modelId: string
    version: string
  }): Promise<PreparedFile> {
    const { file, organizationId, modelId, version } = options
    const originalName = file.name || FALLBACK_FILENAME
    const { storedFilename, extension } =
      this.createStoredFilename(originalName)
    const kind = getStorageKind(extension)
    const storageKey = storageService.generateStorageKey({
      organizationId,
      modelId,
      version,
      filename: storedFilename,
      kind,
    })

    await storageService.uploadFile({
      key: storageKey,
      file,
      contentType: file.type || DEFAULT_CONTENT_TYPE,
    })

    return {
      storageKey,
      storageBucket: storageService.defaultBucket,
      filename: storedFilename,
      originalName,
      mimeType: file.type || DEFAULT_CONTENT_TYPE,
      extension,
      size: file.size,
    }
  }

  private createStoredFilename(originalName: string): {
    storedFilename: string
    extension: string
  } {
    const trimmedName = originalName.trim() || FALLBACK_FILENAME
    const lastDotIndex = trimmedName.lastIndexOf('.')
    const hasExtension =
      lastDotIndex > 0 && lastDotIndex < trimmedName.length - 1
    const extension = hasExtension
      ? trimmedName.slice(lastDotIndex + 1).toLowerCase()
      : ''
    const baseName = hasExtension
      ? trimmedName.slice(0, lastDotIndex)
      : trimmedName
    const safeBase = slugify(baseName || FALLBACK_FILENAME)
    const uniqueSuffix = randomUUID().split('-')[0]
    const storedFilename = extension
      ? `${safeBase}-${uniqueSuffix}.${extension}`
      : `${safeBase}-${uniqueSuffix}`

    return {
      storedFilename,
      extension: extension || 'bin',
    }
  }

  private async cleanupUploadedFiles(
    files: UploadedFileMetadata[]
  ): Promise<void> {
    await Promise.all(
      files.map((file) =>
        storageService.deleteFile(file.storageKey).catch(() => {})
      )
    )
  }
}

export const modelVersionService = new ModelVersionService()
