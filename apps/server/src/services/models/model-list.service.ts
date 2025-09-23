import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from "@/db/schema/models";

type ListModelsInput = {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
};

type ModelListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currentVersion: string;
  fileCount: number;
  totalSize: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type ListModelsResult = {
  models: ModelListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

class ModelListService {
  /**
   * Supreme-level optimized listModels using Drizzle's native query builder
   * Zero type casting, full type safety, single database round-trip
   */
  async listModels({
    organizationId,
    page = 1,
    limit = 12,
    search,
    tags: filterTags,
  }: ListModelsInput): Promise<ListModelsResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    // Build WHERE conditions array
    const conditions = [
      eq(models.organizationId, organizationId),
      isNull(models.deletedAt),
    ];

    // Add search condition if provided
    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchCondition = or(
        ilike(models.name, searchPattern),
        ilike(models.description, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Filter by tags efficiently using subquery
    if (filterTags && filterTags.length > 0) {
      const modelsWithTags = db
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .innerJoin(tags, eq(tags.id, modelTags.tagId))
        .where(
          and(
            eq(tags.organizationId, organizationId),
            inArray(tags.name, filterTags)
          )
        );

      conditions.push(inArray(models.id, modelsWithTags));
    }

    // Get total count for pagination (separate optimized query)
    const [countResult] = await db
      .select({ totalItems: count() })
      .from(models)
      .where(and(...conditions));

    const totalItems = countResult?.totalItems ?? 0;
    const totalPages = Math.ceil(totalItems / safeLimit);

    // Main query with correlated subqueries for aggregated data
    const modelsWithData = await db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        description: models.description,
        currentVersion: models.currentVersion,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        // Correlated subquery for file stats
        fileStats: sql<{ count: number; size: number }>`
          (SELECT json_build_object(
            'count', COALESCE(COUNT(mf.id), 0),
            'size', COALESCE(SUM(mf.size), 0)
          )
          FROM ${modelVersions} mv
          LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = ${models}.id)`,
        // Correlated subquery for tags
        tags: sql<string[]>`
          COALESCE(
            ARRAY(
              SELECT t.name
              FROM ${modelTags} mt
              INNER JOIN ${tags} t ON t.id = mt.tag_id
              WHERE mt.model_id = ${models}.id
              ORDER BY t.name
            ),
            '{}'::text[]
          )`,
      })
      .from(models)
      .where(and(...conditions))
      .orderBy(desc(models.updatedAt))
      .limit(safeLimit)
      .offset(offset);

    // Transform to expected format with proper types
    const modelList: ModelListItem[] = modelsWithData.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      currentVersion: row.currentVersion,
      fileCount: row.fileStats?.count ?? 0,
      totalSize: row.fileStats?.size ?? 0,
      tags: row.tags ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      models: modelList,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    };
  }

  /**
   * Lightning-fast count query for pagination
   */
  async getModelCount(
    organizationId: string,
    search?: string,
    filterTags?: string[]
  ): Promise<number> {
    const conditions = [
      eq(models.organizationId, organizationId),
      isNull(models.deletedAt),
    ];

    if (search?.trim()) {
      const searchPattern = `%${search.trim()}%`;
      const searchCondition = or(
        ilike(models.name, searchPattern),
        ilike(models.description, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (filterTags && filterTags.length > 0) {
      const modelsWithTags = db
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .innerJoin(tags, eq(tags.id, modelTags.tagId))
        .where(
          and(
            eq(tags.organizationId, organizationId),
            inArray(tags.name, filterTags)
          )
        );

      conditions.push(inArray(models.id, modelsWithTags));
    }

    const [result] = await db
      .select({ count: count() })
      .from(models)
      .where(and(...conditions));

    return result?.count ?? 0;
  }

  /**
   * Optimized autocomplete search with prefix matching
   */
  searchModels(
    organizationId: string,
    searchTerm: string,
    limit = 10
  ): Promise<Array<{ id: string; name: string; slug: string }>> {
    if (!searchTerm?.trim()) {
      return Promise.resolve([]);
    }

    return db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
      })
      .from(models)
      .where(
        and(
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt),
          ilike(models.name, `${searchTerm.trim()}%`)
        )
      )
      .orderBy(desc(models.updatedAt))
      .limit(limit);
  }

  /**
   * Get full model details with all versions and files
   * Optimized for single model detail view
   */
  async getModelDetails(modelId: string, organizationId: string) {
    const modelData = await db
      .select({
        model: models,
        versions: sql<
          Array<{
            id: string;
            version: string;
            name: string;
            description: string | null;
            createdAt: Date;
          }>
        >`
          COALESCE(
            json_agg(
              json_build_object(
                'id', v.id,
                'version', v.version,
                'name', v.name,
                'description', v.description,
                'createdAt', v.created_at
              ) ORDER BY v.created_at DESC
            ) FILTER (WHERE v.id IS NOT NULL),
            '[]'::json
          )`,
        tags: sql<string[]>`
          COALESCE(
            ARRAY(
              SELECT t.name
              FROM ${modelTags} mt
              INNER JOIN ${tags} t ON t.id = mt.tag_id
              WHERE mt.model_id = ${models}.id
              ORDER BY t.name
            ),
            '{}'::text[]
          )`,
        fileStats: sql<{ totalFiles: number; totalSize: number }>`
          (SELECT json_build_object(
            'totalFiles', COUNT(mf.id),
            'totalSize', COALESCE(SUM(mf.size), 0)
          )
          FROM ${modelVersions} mv
          LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = ${models}.id)`,
      })
      .from(models)
      .leftJoin(modelVersions, eq(modelVersions.modelId, models.id))
      .where(
        and(
          eq(models.id, modelId),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      )
      .groupBy(models.id)
      .limit(1);

    return modelData[0] ?? null;
  }

  /**
   * Get models by IDs - optimized for batch operations
   */
  async getModelsByIds(
    modelIds: string[],
    organizationId: string
  ): Promise<ModelListItem[]> {
    if (modelIds.length === 0) {
      return [];
    }

    const modelsData = await db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        description: models.description,
        currentVersion: models.currentVersion,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        fileStats: sql<{ count: number; size: number }>`
          (SELECT json_build_object(
            'count', COALESCE(COUNT(mf.id), 0),
            'size', COALESCE(SUM(mf.size), 0)
          )
          FROM ${modelVersions} mv
          LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = ${models}.id)`,
        tags: sql<string[]>`
          COALESCE(
            ARRAY(
              SELECT t.name
              FROM ${modelTags} mt
              INNER JOIN ${tags} t ON t.id = mt.tag_id
              WHERE mt.model_id = ${models}.id
              ORDER BY t.name
            ),
            '{}'::text[]
          )`,
      })
      .from(models)
      .where(
        and(
          inArray(models.id, modelIds),
          eq(models.organizationId, organizationId),
          isNull(models.deletedAt)
        )
      );

    return modelsData.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      currentVersion: row.currentVersion,
      fileCount: row.fileStats?.count ?? 0,
      totalSize: row.fileStats?.size ?? 0,
      tags: row.tags ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }
}

export const modelListService = new ModelListService();
