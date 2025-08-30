import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from '../../db/schema/models';
import type { Model, ModelListQuery, ModelVersion } from '../../types/model';

export class ModelQueryService {
  async listModels(
    query: ModelListQuery,
    organizationId: string
  ): Promise<{
    models: Model[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, tags: tagFilter, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [] as Parameters<typeof and>;

    // Restrict to organization
    conditions.push(eq(models.organizationId, organizationId));

    if (search) {
      conditions.push(
        sql`(${models.name} ILIKE ${`%${search}%`} OR ${models.description} ILIKE ${`%${search}%`})`
      );
    }

    if (tagFilter && tagFilter.length > 0) {
      // Join with model tags to filter by tags
      const taggedModels = db
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .innerJoin(tags, eq(tags.id, modelTags.tagId))
        .where(inArray(tags.name, tagFilter))
        .groupBy(modelTags.modelId)
        .having(sql`COUNT(DISTINCT ${tags.name}) = ${tagFilter.length}`);

      conditions.push(sql`${models.id} IN (${taggedModels})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
    const orderByColumn =
      {
        name: models.name,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        size: sql`(SELECT SUM(${modelFiles.size}) FROM ${modelFiles}
                INNER JOIN ${modelVersions} ON ${modelVersions.id} = ${modelFiles.versionId}
                WHERE ${modelVersions.modelId} = ${models.id})`,
      }[sortBy] || models.updatedAt;

    const orderByDirection = sortOrder === 'asc' ? asc : desc;

    // Get total count
    const countResult = await db
      .select({ total: count() })
      .from(models)
      .where(whereClause);
    const total = countResult[0]?.total ?? 0;

    // Get models with their latest version data
    const modelsData = await db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        description: models.description,
        currentVersion: models.currentVersion,
        totalVersions: models.totalVersions,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .where(whereClause)
      .orderBy(orderByDirection(orderByColumn))
      .limit(limit)
      .offset(offset);

    // Get versions and tags for each model
    const modelIds = modelsData.map((m) => m.id);

    const versionsData =
      modelIds.length > 0
        ? await db
            .select()
            .from(modelVersions)
            .where(inArray(modelVersions.modelId, modelIds))
            .orderBy(desc(modelVersions.createdAt))
        : [];

    const tagsData =
      modelIds.length > 0
        ? await db
            .select({
              modelId: modelTags.modelId,
              tagName: tags.name,
              tagId: tags.id,
              tagColor: tags.color,
            })
            .from(modelTags)
            .innerJoin(tags, eq(tags.id, modelTags.tagId))
            .where(inArray(modelTags.modelId, modelIds))
        : [];

    const filesData =
      versionsData.length > 0
        ? await db
            .select()
            .from(modelFiles)
            .where(
              inArray(
                modelFiles.versionId,
                versionsData.map((v) => v.id)
              )
            )
        : [];

    // Combine data into Model objects
    const modelsWithData: Model[] = modelsData.map((model) => {
      const modelVersionsForModel = versionsData.filter(
        (v) => v.modelId === model.id
      );
      const modelTagsForModel = tagsData.filter((t) => t.modelId === model.id);

      const versions: ModelVersion[] = modelVersionsForModel.map((version) => {
        const versionFiles = filesData.filter(
          (f) => f.versionId === version.id
        );

        return {
          version: version.version,
          files: versionFiles.map((f) => ({
            filename: f.filename,
            originalName: f.originalName,
            size: f.size,
            mimeType: f.mimeType,
            extension: f.extension,
            boundingBox: f.fileMetadata?.boundingBox,
            triangleCount: f.fileMetadata?.triangleCount,
          })),
          metadata: {
            name: version.name,
            description: version.description || undefined,
            tags: modelTagsForModel.map((t) => t.tagName),
            createdAt: version.createdAt.toISOString(),
            updatedAt: version.updatedAt.toISOString(),
            printSettings: version.printSettings || undefined,
          },
          thumbnailPath: version.thumbnailPath || undefined,
          createdAt: version.createdAt.toISOString(),
        };
      });

      const latestVersion =
        versions.find((v) => v.version === model.currentVersion) || versions[0];

      return {
        id: model.id,
        slug: model.slug,
        currentVersion: model.currentVersion,
        versions,
        totalVersions: model.totalVersions,
        latestMetadata: latestVersion?.metadata || {
          name: model.name,
          description: model.description || undefined,
          tags: modelTagsForModel.map((t) => t.tagName),
          createdAt: model.createdAt.toISOString(),
          updatedAt: model.updatedAt.toISOString(),
        },
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      };
    });

    return {
      models: modelsWithData,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async getModelWithAllData(id: string, organizationId: string): Promise<Model | null> {
    const modelData = await db
      .select()
      .from(models)
      .where(and(eq(models.id, id), eq(models.organizationId, organizationId)))
      .limit(1);

    const model = modelData[0];
    if (!model) {
      return null;
    }

    // Get all versions for this model
    const versions = await db
      .select()
      .from(modelVersions)
      .where(eq(modelVersions.modelId, model.id))
      .orderBy(desc(modelVersions.createdAt));

    // Get all files for all versions
    const versionIds = versions.map((v) => v.id);
    const files =
      versionIds.length > 0
        ? await db
            .select()
            .from(modelFiles)
            .where(inArray(modelFiles.versionId, versionIds))
        : [];

    // Get tags
    const modelTagsData = await db
      .select({
        tagName: tags.name,
        tagColor: tags.color,
      })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .where(eq(modelTags.modelId, model.id));

    const tagNames = modelTagsData.map((t) => t.tagName);

    // Build version objects
    const versionObjects: ModelVersion[] = versions.map((version) => {
      const versionFiles = files.filter((f) => f.versionId === version.id);

      return {
        version: version.version,
        files: versionFiles.map((f) => ({
          filename: f.filename,
          originalName: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
          extension: f.extension,
          boundingBox: f.fileMetadata?.boundingBox,
          triangleCount: f.fileMetadata?.triangleCount,
        })),
        metadata: {
          name: version.name,
          description: version.description || undefined,
          tags: tagNames,
          createdAt: version.createdAt.toISOString(),
          updatedAt: version.updatedAt.toISOString(),
          printSettings: version.printSettings || undefined,
        },
        thumbnailPath: version.thumbnailPath || undefined,
        createdAt: version.createdAt.toISOString(),
      };
    });

    const latestVersion =
      versionObjects.find((v) => v.version === model.currentVersion) ||
      versionObjects[0];

    return {
      id: model.id,
      slug: model.slug,
      currentVersion: model.currentVersion,
      versions: versionObjects,
      totalVersions: model.totalVersions,
      latestMetadata: latestVersion?.metadata || {
        name: model.name,
        description: model.description || undefined,
        tags: tagNames,
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      },
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }
}

export const modelQueryService = new ModelQueryService();
