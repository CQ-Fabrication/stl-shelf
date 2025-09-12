import { and, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
  tagTypes,
  versionTags,
} from '@/db/schema/models';
import { measureAsync, type PerformanceMonitor } from '@/lib/performance';

export type ModelQueryResult = {
  model: typeof models.$inferSelect;
  version: typeof modelVersions.$inferSelect | null;
  file: typeof modelFiles.$inferSelect | null;
  totalCount?: number;
};

export type TagInfo = {
  id: string;
  name: string;
  color: string | null;
  type?: string | null;
};

export class ModelRepository {
  private monitor?: PerformanceMonitor;

  setMonitor(monitor: PerformanceMonitor): this {
    this.monitor = monitor;
    return this;
  }
  findModelsWithJoins(
    whereClause: SQL | undefined,
    orderBy: SQL | undefined,
    limit: number,
    offset: number
  ): Promise<ModelQueryResult[]> {
    return measureAsync(
      'model_list_query',
      () =>
        db
          .select({
            model: models,
            version: modelVersions,
            file: modelFiles,
            totalCount: sql<number>`COUNT(*) OVER()`,
          })
          .from(models)
          .where(whereClause)
          .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
          .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
          .orderBy(orderBy || desc(models.updatedAt))
          .limit(limit * 10) // Fetch extra for denormalization
          .offset(offset),
      this.monitor
    );
  }

  findModelById(
    modelId: string,
    organizationId: string
  ): Promise<ModelQueryResult[]> {
    return measureAsync(
      'model_single_query',
      () =>
        db
          .select({
            model: models,
            version: modelVersions,
            file: modelFiles,
          })
          .from(models)
          .where(
            and(
              eq(models.id, modelId),
              eq(models.organizationId, organizationId)
            )
          )
          .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
          .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
          .orderBy(desc(modelVersions.createdAt)),
      this.monitor
    );
  }

  findVersionsPaginated(
    modelId: string,
    limit: number,
    offset: number
  ): Promise<ModelQueryResult[]> {
    return measureAsync(
      'versions_paginated_query',
      () =>
        db
          .select({
            model: sql<typeof models.$inferSelect>`NULL`,
            version: modelVersions,
            file: modelFiles,
            totalCount: sql<number>`COUNT(*) OVER()`,
          })
          .from(modelVersions)
          .where(eq(modelVersions.modelId, modelId))
          .leftJoin(modelFiles, eq(modelFiles.versionId, modelVersions.id))
          .orderBy(desc(modelVersions.createdAt))
          .limit(limit)
          .offset(offset),
      this.monitor
    );
  }

  async findModelTags(modelIds: string[]): Promise<Map<string, TagInfo[]>> {
    if (modelIds.length === 0) {
      return new Map();
    }

    const result = await measureAsync(
      'model_tags_query',
      async () => {
        // Fetch all model-tag relationships with tag details
        const results = await db
          .select({
            modelId: modelTags.modelId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(modelTags)
          .innerJoin(tags, eq(tags.id, modelTags.tagId))
          .where(inArray(modelTags.modelId, modelIds));

        return results;
      },
      this.monitor
    );

    // Group tags by model ID and deduplicate
    const tagsMap = new Map<string, TagInfo[]>();

    for (const row of result) {
      if (!tagsMap.has(row.modelId)) {
        tagsMap.set(row.modelId, []);
      }

      const modelTagList = tagsMap.get(row.modelId);
      if (!modelTagList) continue;
      const existingTag = modelTagList.find((t) => t.id === row.tagId);

      if (!existingTag) {
        modelTagList.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
        });
      }
    }

    // Ensure all requested models have an entry (even if empty)
    for (const modelId of modelIds) {
      if (!tagsMap.has(modelId)) {
        tagsMap.set(modelId, []);
      }
    }

    return tagsMap;
  }

  async findVersionTags(versionIds: string[]): Promise<Map<string, TagInfo[]>> {
    if (versionIds.length === 0) {
      return new Map();
    }

    const result = await measureAsync(
      'version_tags_query',
      async () => {
        // Fetch all version-tag relationships with tag details
        const results = await db
          .select({
            versionId: versionTags.versionId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
            tagTypeName: tagTypes.name,
          })
          .from(versionTags)
          .innerJoin(tags, eq(tags.id, versionTags.tagId))
          .leftJoin(tagTypes, eq(tagTypes.id, tags.typeId))
          .where(inArray(versionTags.versionId, versionIds));

        return results;
      },
      this.monitor
    );

    // Group tags by version ID and deduplicate
    const tagsMap = new Map<string, TagInfo[]>();

    for (const row of result) {
      if (!tagsMap.has(row.versionId)) {
        tagsMap.set(row.versionId, []);
      }

      const versionTagList = tagsMap.get(row.versionId);
      if (!versionTagList) continue;

      const existingTag = versionTagList.find((t) => t.id === row.tagId);

      if (!existingTag) {
        versionTagList.push({
          id: row.tagId,
          name: row.tagName,
          color: row.tagColor,
          type: row.tagTypeName,
        });
      }
    }

    // Ensure all requested versions have an entry (even if empty)
    for (const versionId of versionIds) {
      if (!tagsMap.has(versionId)) {
        tagsMap.set(versionId, []);
      }
    }

    return tagsMap;
  }
}
