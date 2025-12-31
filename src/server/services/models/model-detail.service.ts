import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from '@/lib/db/schema/models'
import { storageService } from '@/server/services/storage'

export type ModelFile = {
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

export type ModelMetadata = {
  id: string
  name: string
  description: string | null
  slug: string
  currentVersion: string
  totalVersions: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type ModelVersion = {
  id: string
  modelId: string
  version: string
  name: string
  description: string | null
  thumbnailPath: string | null
  thumbnailUrl: string | null
  files: ModelFile[]
  createdAt: string
  updatedAt: string
}

export type ModelStatistics = {
  totalSize: number
  totalFiles: number
  totalVersions: number
  fileTypes: Record<string, number>
  largestFile: { name: string; size: number } | null
  averageFileSize: number
  lastUpdated: string
}

export type ModelTag = {
  id: string
  name: string
  color: string | null
  usageCount: number
  description: string | null
}

class ModelDetailService {
  private generatePresignedUrlsForFiles(
    files: ModelFile[]
  ): Promise<ModelFile[]> {
    const viewableExtensions = ['stl', 'obj', '3mf', 'ply']

    return Promise.all(
      files.map(async (file) => {
        let fileUrl = file.storageUrl

        if (
          file.storageKey &&
          viewableExtensions.includes(file.extension.toLowerCase())
        ) {
          try {
            fileUrl = await storageService.generateDownloadUrl(
              file.storageKey,
              60
            )
          } catch {
            // Keep original URL if presigned fails
          }
        }

        return {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          extension: file.extension,
          storageKey: file.storageKey,
          storageUrl: fileUrl,
          storageBucket: file.storageBucket,
        }
      })
    )
  }

  async getModel(
    modelId: string,
    organizationId: string
  ): Promise<ModelMetadata> {
    const [model] = await db
      .select({
        id: models.id,
        name: models.name,
        description: models.description,
        slug: models.slug,
        currentVersion: models.currentVersion,
        totalVersions: models.totalVersions,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        tags: sql<string[]>`(
          SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
          FROM ${modelTags} mt
          INNER JOIN ${tags} t ON t.id = mt.tag_id
          WHERE mt.model_id = models.id
        )`,
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
      throw new Error(`Model not found: ${modelId}`)
    }

    return {
      id: model.id,
      name: model.name,
      description: model.description,
      slug: model.slug,
      currentVersion: model.currentVersion,
      totalVersions: model.totalVersions,
      tags: model.tags ?? [],
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    }
  }

  async getModelVersions(
    modelId: string,
    organizationId: string
  ): Promise<ModelVersion[]> {
    const versions = await db
      .select({
        id: modelVersions.id,
        modelId: modelVersions.modelId,
        version: modelVersions.version,
        name: modelVersions.name,
        description: modelVersions.description,
        thumbnailPath: modelVersions.thumbnailPath,
        createdAt: modelVersions.createdAt,
        updatedAt: modelVersions.updatedAt,
        files: sql<ModelFile[]>`(
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', mf.id,
                'filename', mf.filename,
                'originalName', mf.original_name,
                'size', mf.size,
                'mimeType', mf.mime_type,
                'extension', mf.extension,
                'storageKey', mf.storage_key,
                'storageUrl', mf.storage_url,
                'storageBucket', mf.storage_bucket
              ) ORDER BY mf.filename
            ),
            '[]'::json
          )
          FROM ${modelFiles} mf
          WHERE mf.version_id = ${modelVersions.id}
        )`,
      })
      .from(modelVersions)
      .innerJoin(models, eq(modelVersions.modelId, models.id))
      .where(
        and(
          eq(models.id, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .orderBy(desc(modelVersions.createdAt))

    if (versions.length === 0) {
      throw new Error(`Model not found: ${modelId}`)
    }

    const versionsWithPresignedUrls = await Promise.all(
      versions.map(async (version) => {
        let thumbnailUrl: string | null = null
        if (version.thumbnailPath) {
          try {
            thumbnailUrl = await storageService.generateDownloadUrl(
              version.thumbnailPath
            )
          } catch {
            thumbnailUrl = null
          }
        }

        return {
          id: version.id,
          modelId: version.modelId,
          version: version.version,
          name: version.name,
          description: version.description,
          thumbnailPath: version.thumbnailPath,
          thumbnailUrl,
          files:
            version.files.length > 0
              ? await this.generatePresignedUrlsForFiles(version.files)
              : [],
          createdAt: version.createdAt.toISOString(),
          updatedAt: version.updatedAt.toISOString(),
        }
      })
    )

    return versionsWithPresignedUrls
  }

  async getVersionFiles(versionId: string): Promise<ModelFile[]> {
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
      .where(eq(modelFiles.versionId, versionId))
      .orderBy(modelFiles.filename)

    return this.generatePresignedUrlsForFiles(files)
  }

  async getModelFiles(
    modelId: string,
    versionId: string,
    organizationId: string
  ): Promise<ModelFile[]> {
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
          eq(modelVersions.modelId, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .orderBy(modelFiles.filename)

    if (files.length === 0) {
      throw new Error(
        `No files found for model ${modelId}, version ${versionId}`
      )
    }

    return this.generatePresignedUrlsForFiles(files)
  }

  async getModelStatistics(
    modelId: string,
    organizationId: string
  ): Promise<ModelStatistics> {
    const [result] = await db
      .select({
        updatedAt: models.updatedAt,
        totalVersions: sql<number>`COUNT(DISTINCT ${modelVersions.id})::integer`,
        totalFiles: sql<number>`COUNT(${modelFiles.id})::integer`,
        totalSize: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)::bigint`,
        averageFileSize: sql<number>`
          CASE
            WHEN COUNT(${modelFiles.id}) > 0
            THEN ROUND(AVG(${modelFiles.size}))::integer
            ELSE 0
          END`,
        fileTypes: sql<Record<string, number>>`
          COALESCE(
            (SELECT json_object_agg(extension, count)
             FROM (
               SELECT mf2.extension, COUNT(*)::integer as count
               FROM ${modelFiles} mf2
               INNER JOIN ${modelVersions} mv2 ON mv2.id = mf2.version_id
               WHERE mv2.model_id = models.id
               GROUP BY mf2.extension
             ) AS ext_counts),
            '{}'::json
          )`,
        largestFile: sql<{ name: string; size: number } | null>`
          (SELECT json_build_object(
            'name', ${modelFiles.filename},
            'size', ${modelFiles.size}
          )
          FROM ${modelFiles}
          INNER JOIN ${modelVersions} mv2 ON mv2.id = ${modelFiles.versionId}
          WHERE mv2.model_id = models.id
          ORDER BY ${modelFiles.size} DESC
          LIMIT 1)`,
      })
      .from(models)
      .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
      .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
      .where(
        and(
          eq(models.id, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .groupBy(models.id, models.updatedAt)

    if (!result || result.totalVersions === 0) {
      throw new Error(`Model not found: ${modelId}`)
    }

    return {
      totalSize: Number(result.totalSize),
      totalFiles: result.totalFiles,
      totalVersions: result.totalVersions,
      fileTypes: result.fileTypes || {},
      largestFile: result.largestFile,
      averageFileSize: result.averageFileSize,
      lastUpdated: result.updatedAt.toISOString(),
    }
  }

  async getModelTags(
    modelId: string,
    organizationId: string
  ): Promise<ModelTag[]> {
    const modelTagsData = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        usageCount: tags.usageCount,
        description: tags.description,
      })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .innerJoin(models, eq(models.id, modelTags.modelId))
      .where(
        and(
          eq(modelTags.modelId, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .orderBy(tags.name)

    return modelTagsData
  }
}

export const modelDetailService = new ModelDetailService()
