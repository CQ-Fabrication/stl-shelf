import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from '../../db/schema/models';
import { measureAsync, PerformanceMonitor } from '../../lib/performance';
import type { Model, ModelListQuery, ModelVersion } from '../../types/model';

export class ModelQueryService {
  async listModels(
    query: ModelListQuery,
    organizationId: string,
    monitor?: PerformanceMonitor
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

    // Single optimized query with JOINs for count and data
    const result = await measureAsync(
      'optimized_list_query',
      () => db
        .select({
          model: {
            id: models.id,
            slug: models.slug,
            name: models.name,
            description: models.description,
            currentVersion: models.currentVersion,
            totalVersions: models.totalVersions,
            createdAt: models.createdAt,
            updatedAt: models.updatedAt,
          },
          version: modelVersions,
          file: modelFiles,
          tagName: tags.name,
          tagId: tags.id,
          tagColor: tags.color,
          totalCount: sql<number>`COUNT(*) OVER()`,
        })
        .from(models)
        .where(whereClause)
        .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
        .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
        .leftJoin(modelTags, eq(modelTags.modelId, models.id))
        .leftJoin(tags, eq(tags.id, modelTags.tagId))
        .orderBy(orderByDirection(orderByColumn))
        .limit(limit * 50) // Fetch more to handle denormalization
        .offset(offset),
      monitor
    );

    if (result.length === 0) {
      return {
        models: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const total = Number(result[0].totalCount || 0);

    // Process denormalized data
    const modelsMap = new Map<string, typeof result[0]['model']>();
    const versionsMap = new Map<string, Map<string, typeof modelVersions.$inferSelect>>();
    const filesMap = new Map<string, (typeof modelFiles.$inferSelect)[]>();
    const tagsMap = new Map<string, Set<{ name: string; id: string; color: string | null }>>();

    for (const row of result) {
      const modelId = row.model.id;
      
      // Collect unique models
      if (!modelsMap.has(modelId)) {
        modelsMap.set(modelId, row.model);
      }

      // Collect versions per model
      if (row.version) {
        if (!versionsMap.has(modelId)) {
          versionsMap.set(modelId, new Map());
        }
        const modelVersionsMap = versionsMap.get(modelId);
        if (!modelVersionsMap) continue;
        if (!modelVersionsMap.has(row.version.id)) {
          modelVersionsMap.set(row.version.id, row.version);
        }

        // Collect files per version
        if (row.file) {
          const versionId = row.version.id;
          if (!filesMap.has(versionId)) {
            filesMap.set(versionId, []);
          }
          const versionFiles = filesMap.get(versionId);
          if (!versionFiles) continue;
          if (!versionFiles.find(f => f.id === row.file?.id)) {
            versionFiles.push(row.file);
          }
        }
      }

      // Collect tags per model
      if (row.tagName && row.tagId) {
        if (!tagsMap.has(modelId)) {
          tagsMap.set(modelId, new Set());
        }
        const modelTagsSet = tagsMap.get(modelId);
        if (!modelTagsSet) continue;
        const modelTags = modelTagsSet;
        modelTags.add({ name: row.tagName, id: row.tagId, color: row.tagColor });
      }
    }

    // Get only the requested page of models
    const modelsData = Array.from(modelsMap.values()).slice(0, limit);
    const modelIds = modelsData.map(m => m.id);
    
    // Get versions for the models on this page
    const versionsData: typeof modelVersions.$inferSelect[] = [];
    for (const modelId of modelIds) {
      const modelVersionsMap = versionsMap.get(modelId);
      if (modelVersionsMap) {
        versionsData.push(...Array.from(modelVersionsMap.values()));
      }
    }
    
    // Get tags for the models on this page
    const tagsData: Array<{ modelId: string; tagName: string; tagId: string; tagColor: string | null }> = [];
    for (const modelId of modelIds) {
      const modelTagsFromMap = tagsMap.get(modelId);
      if (modelTagsFromMap) {
        for (const tagItem of modelTagsFromMap) {
          tagsData.push({ 
            modelId, 
            tagName: tagItem.name, 
            tagId: tagItem.id, 
            tagColor: tagItem.color 
          });
        }
      }
    }
    
    // Get files for versions
    const filesData: typeof modelFiles.$inferSelect[] = [];
    for (const version of versionsData) {
      const versionFiles = filesMap.get(version.id);
      if (versionFiles) {
        filesData.push(...versionFiles);
      }
    }

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

  async getModelWithAllData(
    id: string,
    organizationId: string,
    monitor?: PerformanceMonitor
  ): Promise<Model | null> {
    // Single optimized query with all JOINs
    const result = await measureAsync(
      'optimized_model_query',
      () => db
        .select({
          model: models,
          version: modelVersions,
          file: modelFiles,
          tagName: tags.name,
          tagColor: tags.color,
        })
        .from(models)
        .where(and(eq(models.id, id), eq(models.organizationId, organizationId)))
        .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
        .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
        .leftJoin(modelTags, eq(modelTags.modelId, models.id))
        .leftJoin(tags, eq(tags.id, modelTags.tagId))
        .orderBy(desc(modelVersions.createdAt)),
      monitor
    );

    if (result.length === 0) {
      return null;
    }

    const model = result[0].model;
    if (!model) {
      return null;
    }

    // Process the denormalized result into structured data
    const versionsMap = new Map<string, typeof modelVersions.$inferSelect>();
    const tagsSet = new Set<string>();
    const filesMap = new Map<string, (typeof modelFiles.$inferSelect)[]>();

    for (const row of result) {
      // Collect unique tags
      if (row.tagName) {
        tagsSet.add(row.tagName);
      }

      // Collect versions
      if (row.version && !versionsMap.has(row.version.id)) {
        versionsMap.set(row.version.id, row.version);
      }

      // Collect files per version
      if (row.file && row.version) {
        if (!filesMap.has(row.version.id)) {
          filesMap.set(row.version.id, []);
        }
        const versionFiles = filesMap.get(row.version.id);
        // Avoid duplicates in denormalized data
        if (versionFiles && row.file && !versionFiles.find(f => f.id === row.file?.id)) {
          versionFiles.push(row.file);
        }
      }
    }

    // Get only the 5 most recent versions
    const versions = Array.from(versionsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const tagNames = Array.from(tagsSet);

    // Build version objects
    const versionObjects: ModelVersion[] = versions.map((version) => {
      const versionFiles = filesMap.get(version.id) || [];

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

  async getModelVersionsPaginated(
    modelId: string,
    _organizationId: string,
    offset = 0,
    limit = 5,
    monitor?: PerformanceMonitor

  ): Promise<{
    versions: ModelVersion[];
    hasMore: boolean;
    total: number;
  }> {
    // Single query with JOINs for count and data
    const result = await measureAsync(
      'optimized_versions_query',
      () => db
        .select({
          version: modelVersions,
          file: modelFiles,
          tagName: tags.name,
          tagColor: tags.color,
          totalCount: sql<number>`COUNT(*) OVER()`,
        })
        .from(modelVersions)
        .where(eq(modelVersions.modelId, modelId))
        .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
        .leftJoin(modelTags, eq(modelTags.modelId, modelVersions.modelId))
        .leftJoin(tags, eq(tags.id, modelTags.tagId))
        .orderBy(desc(modelVersions.createdAt))
        .limit(limit)
        .offset(offset),
      monitor
    );

    if (result.length === 0) {
      return {
        versions: [],
        hasMore: false,
        total: 0,
      };
    }

    const totalVersions = Number(result[0].totalCount || 0);

    // Process denormalized data
    const versionsMap = new Map<string, typeof modelVersions.$inferSelect>();
    const filesMap = new Map<string, (typeof modelFiles.$inferSelect)[]>();
    const tagsSet = new Set<string>();

    for (const row of result) {
      // Collect tags
      if (row.tagName) {
        tagsSet.add(row.tagName);
      }

      // Collect versions
      if (row.version && !versionsMap.has(row.version.id)) {
        versionsMap.set(row.version.id, row.version);
      }

      // Collect files per version
      if (row.file && row.version) {
        if (!filesMap.has(row.version.id)) {
          filesMap.set(row.version.id, []);
        }
        const versionFiles = filesMap.get(row.version.id);
        if (versionFiles && row.file && !versionFiles.find(f => f.id === row.file?.id)) {
          versionFiles.push(row.file);
        }
      }
    }

    const versions = Array.from(versionsMap.values());
    const tagNames = Array.from(tagsSet);

    // Build version objects
    const versionObjects: ModelVersion[] = versions.map((version) => {
      const versionFiles = filesMap.get(version.id) || [];

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

    return {
      versions: versionObjects,
      hasMore: offset + limit < totalVersions,
      total: totalVersions,
    };
  }
}

export const modelQueryService = new ModelQueryService();
