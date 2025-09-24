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
import type {
  ListModelsInput,
  ListModelsOutput,
} from "@/routers/models";

// Service-specific type that extends router input with organizationId
type ServiceListModelsInput = ListModelsInput & {
  organizationId: string;
};

/**
 * Optimized listModels with single query using subqueries
 * Reduces database round-trips and eliminates N+1 queries
 */
export async function listModels({
  organizationId,
  page = 1,
  limit = 12,
  search,
  tags: filterTags,
}: ServiceListModelsInput): Promise<ListModelsOutput> {

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

  try {

    // Get total count separately
    const [countResult] = await db
      .select({ totalCount: count() })
      .from(models)
      .where(and(...conditions));


    const totalItems = countResult?.totalCount ?? 0;
    const totalPages = Math.ceil(totalItems / safeLimit);


    // Main query with subqueries for aggregated data
    const modelsWithData = await db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        description: models.description,
        currentVersion: models.currentVersion,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
        // File count subquery
        fileCount: sql<number>`(
          SELECT COUNT(DISTINCT mf.id)::int
          FROM ${modelVersions} mv
          LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = models.id
        )`,
        // Total size subquery
        totalSize: sql<number>`(
          SELECT COALESCE(SUM(mf.size), 0)::bigint
          FROM ${modelVersions} mv
          LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = models.id
        )`,
        // Tags array subquery
        tags: sql<string[]>`(
          SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
          FROM ${modelTags} mt
          INNER JOIN ${tags} t ON t.id = mt.tag_id
          WHERE mt.model_id = models.id
        )`,
      })
      .from(models)
      .where(and(...conditions))
      .orderBy(desc(models.updatedAt))
      .limit(safeLimit)
      .offset(offset);

    // Transform to expected format with proper types (dates as ISO strings)
    const modelList = modelsWithData.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      currentVersion: row.currentVersion,
      fileCount: row.fileCount ?? 0,
      totalSize: Number(row.totalSize ?? 0),
      tags: row.tags ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
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
  } catch (error) {
    console.error("ERROR in listModels:", error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

export const modelListService = {
  listModels,
};