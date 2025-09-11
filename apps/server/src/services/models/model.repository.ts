import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from '@/db/schema/models';
import { measureAsync, type PerformanceMonitor } from '@/lib/performance';

export type ModelQueryResult = {
  model: typeof models.$inferSelect;
  version: typeof modelVersions.$inferSelect | null;
  file: typeof modelFiles.$inferSelect | null;
  tagName: string | null;
  tagId: string | null;
  tagColor: string | null;
  totalCount?: number;
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
            tagName: tags.name,
            tagId: tags.id,
            tagColor: tags.color,
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
          .leftJoin(modelTags, eq(modelTags.modelId, models.id))
          .leftJoin(tags, eq(tags.id, modelTags.tagId))
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
            tagName: tags.name,
            tagId: tags.id,
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
      this.monitor
    );
  }
}
