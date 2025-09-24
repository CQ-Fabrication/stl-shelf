import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from "@/db/schema/models";
import type {
  ModelFileResponse as ModelFile,
  ModelMetadata,
  ModelStatistics,
  ModelTag,
  ModelVersion,
} from "@/routers/models";
import { storageService } from "@/services/storage";

class ModelDetailService {
  /**
   * Generates presigned URLs for viewable 3D files
   * Centralizes the logic for presigned URL generation to avoid duplication
   */
  private generatePresignedUrlsForFiles(
    files: ModelFile[]
  ): Promise<ModelFile[]> {
    const viewableExtensions = ["stl", "obj", "3mf", "ply"];

    return Promise.all(
      files.map(async (file) => {
        let fileUrl = file.storageUrl;

        // Generate presigned URL only for viewable 3D files
        if (
          file.storageKey &&
          viewableExtensions.includes(file.extension.toLowerCase())
        ) {
          try {
            fileUrl = await storageService.generateDownloadUrl(
              file.storageKey,
              file.storageBucket,
              60 // 60 minutes expiry
            );
          } catch (error) {
            console.error(
              `Failed to generate presigned URL for ${file.storageKey}:`,
              error
            );
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
        };
      })
    );
  }
  async getModel(
    modelId: string,
    organizationId: string
  ): Promise<ModelMetadata> {
    try {
      // Use optimized correlated subquery pattern (same as model-list service)
      // This is more efficient for single-record retrieval than relational queries
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
          // Correlated subquery for tags - optimal for single record + aggregated data
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
        );

      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
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
      };
    } catch (error) {
      console.error('Error in getModel:', error);
      throw error;
    }
  }

  async getModelVersions(
    modelId: string,
    organizationId: string
  ): Promise<ModelVersion[]> {
    // Use correlated subquery pattern for consistency with other methods
    // This approach is more efficient and maintainable than LEFT JOIN + application grouping
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
        // Correlated subquery for files - aggregates all files as JSON array
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
      .orderBy(desc(modelVersions.createdAt));

    if (versions.length === 0) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Generate presigned URLs for all files in parallel
    const versionsWithPresignedUrls = await Promise.all(
      versions.map(async (version) => ({
        id: version.id,
        modelId: version.modelId,
        version: version.version,
        name: version.name,
        description: version.description,
        thumbnailPath: version.thumbnailPath,
        files: version.files.length > 0
          ? await this.generatePresignedUrlsForFiles(version.files)
          : [],
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
      }))
    );

    return versionsWithPresignedUrls;
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
      .orderBy(modelFiles.filename);

    return this.generatePresignedUrlsForFiles(files);
  }

  async getModelFiles(
    modelId: string,
    versionId: string,
    organizationId: string
  ): Promise<ModelFile[]> {
    // Single optimized query combining authorization checks with data fetch
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
      .orderBy(modelFiles.filename);

    if (files.length === 0) {
      throw new Error(
        `No files found for model ${modelId}, version ${versionId}`
      );
    }

    return this.generatePresignedUrlsForFiles(files);
  }

  async getModelStatistics(
    modelId: string,
    organizationId: string
  ): Promise<ModelStatistics> {
    // Single optimized query with all aggregations
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
               WHERE mv2.model_id = ${models.id}
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
          WHERE mv2.model_id = ${models.id}
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
      .groupBy(models.id, models.updatedAt);

    if (!result || result.totalVersions === 0) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      totalSize: Number(result.totalSize),
      totalFiles: result.totalFiles,
      totalVersions: result.totalVersions,
      fileTypes: result.fileTypes || {},
      largestFile: result.largestFile,
      averageFileSize: result.averageFileSize,
      lastUpdated: result.updatedAt.toISOString(),
    };
  }

  async getModelTags(
    modelId: string,
    organizationId: string
  ): Promise<ModelTag[]> {
    // Single optimized query with organization validation
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
      .orderBy(tags.name);

    return modelTagsData;
  }
}

export const modelDetailService = new ModelDetailService();
