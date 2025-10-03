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
import type { ListModelsInput, ListModelsOutput } from "@/routers/models";
import { storageService } from "@/services/storage";

// Service-specific type that extends router input with organizationId
type ServiceListModelsInput = ListModelsInput & {
  organizationId: string;
};

/**
 * Optimized listModels with cursor-based pagination for infinite scroll
 * Reduces database round-trips and eliminates N+1 queries
 */
export async function listModels({
  organizationId,
  cursor = 0,
  limit = 12,
  search,
  tags: filterTags,
}: ServiceListModelsInput): Promise<ListModelsOutput> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = Math.max(0, cursor);

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
    // Fetch one extra item to determine if there's a next page
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
        // Get thumbnail path from latest version
        thumbnailPath: sql<string | null>`(
          SELECT mv.thumbnail_path
          FROM ${modelVersions} mv
          WHERE mv.model_id = models.id
          AND mv.version = models.current_version
          LIMIT 1
        )`,
      })
      .from(models)
      .where(and(...conditions))
      .orderBy(desc(models.updatedAt))
      .limit(safeLimit + 1)
      .offset(offset);

    // Check if there are more items beyond the requested limit
    const hasMore = modelsWithData.length > safeLimit;
    const items = hasMore ? modelsWithData.slice(0, safeLimit) : modelsWithData;

    // Transform to expected format with proper types (dates as ISO strings)
    const modelList = await Promise.all(
      items.map(async (row) => {
        // Generate thumbnail URL if path exists
        let thumbnailUrl: string | null = null;
        if (row.thumbnailPath) {
          try {
            thumbnailUrl = await storageService.generateDownloadUrl(
              row.thumbnailPath
            );
          } catch {
            thumbnailUrl = null;
          }
        }

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          currentVersion: row.currentVersion,
          fileCount: row.fileCount ?? 0,
          totalSize: Number(row.totalSize ?? 0),
          tags: row.tags ?? [],
          thumbnailUrl,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
      })
    );

    // Calculate next cursor: if there are more items, next cursor is current offset + limit
    const nextCursor = hasMore ? offset + safeLimit : null;

    return {
      models: modelList,
      nextCursor,
    };
  } catch (error) {
    console.error(
      "ERROR in listModels:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

export const modelListService = {
  listModels,
};
