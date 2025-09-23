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

interface ListModelsInput {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

interface ModelListItem {
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
}

interface ListModelsResult {
  models: ModelListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ModelListService {
  async listModels({
    organizationId,
    page = 1,
    limit = 12,
    search,
    tags: filterTags,
  }: ListModelsInput): Promise<ListModelsResult> {
    // Ensure valid pagination values
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    // Build base conditions
    const conditions = [
      eq(models.organizationId, organizationId),
      isNull(models.deletedAt), // Exclude soft-deleted models
    ];

    // Add search condition if provided
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(models.name, searchPattern),
          ilike(models.description, searchPattern)
        )!
      );
    }

    // Get model IDs that match tag filters if provided
    let modelIdsWithTags: string[] | null = null;
    if (filterTags && filterTags.length > 0) {
      const tagResults = await db
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .innerJoin(tags, eq(tags.id, modelTags.tagId))
        .where(
          and(
            eq(tags.organizationId, organizationId),
            inArray(tags.name, filterTags)
          )
        );

      modelIdsWithTags = [...new Set(tagResults.map((r) => r.modelId))];

      // If no models have the requested tags, return empty result
      if (modelIdsWithTags.length === 0) {
        return {
          models: [],
          pagination: {
            page: safePage,
            limit: safeLimit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
      }

      conditions.push(inArray(models.id, modelIdsWithTags));
    }

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(models)
      .where(and(...conditions));
    const totalItems = countResult?.total || 0;
    const totalPages = Math.ceil(totalItems / safeLimit);

    // Get models with pagination
    const modelResults = await db
      .select({
        id: models.id,
        slug: models.slug,
        name: models.name,
        description: models.description,
        currentVersion: models.currentVersion,
        createdAt: models.createdAt,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .where(and(...conditions))
      .orderBy(desc(models.updatedAt))
      .limit(safeLimit)
      .offset(offset);

    // If no models found, return early
    if (modelResults.length === 0) {
      return {
        models: [],
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

    const modelIds = modelResults.map((m) => m.id);

    // Get latest version for each model
    const versions = await db
      .select({
        modelId: modelVersions.modelId,
        versionId: modelVersions.id,
      })
      .from(modelVersions)
      .where(inArray(modelVersions.modelId, modelIds))
      .groupBy(modelVersions.modelId, modelVersions.id);

    // Create version map
    const versionMap = new Map<string, string>();
    for (const v of versions) {
      versionMap.set(v.modelId, v.versionId);
    }

    // Get file counts and sizes
    const fileStats = await db
      .select({
        versionId: modelFiles.versionId,
        fileCount: count(),
        totalSize: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)`,
      })
      .from(modelFiles)
      .where(inArray(modelFiles.versionId, Array.from(versionMap.values())))
      .groupBy(modelFiles.versionId);

    // Create file stats map
    const fileStatsMap = new Map<
      string,
      { fileCount: number; totalSize: number }
    >();
    for (const stat of fileStats) {
      fileStatsMap.set(stat.versionId, {
        fileCount: stat.fileCount,
        totalSize: Number(stat.totalSize),
      });
    }

    // Get tags for all models
    const modelTagResults = await db
      .select({
        modelId: modelTags.modelId,
        tagName: tags.name,
      })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .where(inArray(modelTags.modelId, modelIds));

    // Create tags map
    const tagsMap = new Map<string, string[]>();
    for (const tag of modelTagResults) {
      if (!tagsMap.has(tag.modelId)) {
        tagsMap.set(tag.modelId, []);
      }
      tagsMap.get(tag.modelId)!.push(tag.tagName);
    }

    // Assemble final results
    const modelList: ModelListItem[] = modelResults.map((model) => {
      const versionId = versionMap.get(model.id);
      const stats = versionId ? fileStatsMap.get(versionId) : undefined;
      const modelTags = tagsMap.get(model.id) || [];

      return {
        id: model.id,
        slug: model.slug,
        name: model.name,
        description: model.description,
        currentVersion: model.currentVersion,
        fileCount: stats?.fileCount || 0,
        totalSize: stats?.totalSize || 0,
        tags: modelTags,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      };
    });

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
}

export const modelListService = new ModelListService();
