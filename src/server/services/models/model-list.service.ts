import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { modelFiles, models, modelTags, modelVersions, tags } from "@/lib/db/schema/models";
import { storageService } from "@/server/services/storage";

export type ListModelsInput = {
  organizationId: string;
  cursor?: number;
  limit?: number;
  search?: string;
  tags?: string[];
};

export type ModelOwner = {
  id: string;
  name: string;
  image: string | null;
};

export type ModelListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currentVersion: string;
  fileCount: number;
  totalSize: number;
  tags: string[];
  thumbnailUrl: string | null;
  owner: ModelOwner;
  createdAt: string;
  updatedAt: string;
  completeness: {
    hasModel: boolean;
    hasSlicer: boolean;
    hasImage: boolean;
    isComplete: boolean;
  };
};

export type ListModelsOutput = {
  models: ModelListItem[];
  nextCursor: number | null;
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
}: ListModelsInput): Promise<ListModelsOutput> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = Math.max(0, cursor);

  const conditions = [eq(models.organizationId, organizationId), isNull(models.deletedAt)];

  if (search?.trim()) {
    const searchPattern = `%${search.trim()}%`;
    const searchCondition = or(
      ilike(models.name, searchPattern),
      ilike(models.description, searchPattern),
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
      .where(and(eq(tags.organizationId, organizationId), inArray(tags.name, filterTags)));

    conditions.push(inArray(models.id, modelsWithTags));
  }

  const modelsWithData = await db
    .select({
      id: models.id,
      slug: models.slug,
      name: models.name,
      description: models.description,
      currentVersion: models.currentVersion,
      createdAt: models.createdAt,
      updatedAt: models.updatedAt,
      ownerId: user.id,
      ownerName: user.name,
      ownerImage: user.image,
      fileCount: sql<number>`(
        SELECT COUNT(DISTINCT mf.id)::int
        FROM ${modelVersions} mv
        LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
        WHERE mv.model_id = models.id
      )`,
      totalSize: sql<number>`(
        SELECT COALESCE(SUM(mf.size), 0)::bigint
        FROM ${modelVersions} mv
        LEFT JOIN ${modelFiles} mf ON mf.version_id = mv.id
        WHERE mv.model_id = models.id
      )`,
      tags: sql<string[]>`(
        SELECT COALESCE(ARRAY_AGG(t.name ORDER BY t.name), '{}')
        FROM ${modelTags} mt
        INNER JOIN ${tags} t ON t.id = mt.tag_id
        WHERE mt.model_id = models.id
      )`,
      thumbnailPath: sql<string | null>`(
        SELECT mv.thumbnail_path
        FROM ${modelVersions} mv
        WHERE mv.model_id = models.id
        AND mv.version = models.current_version
        LIMIT 1
      )`,
      hasModelFile: sql<boolean>`(
        SELECT EXISTS(
          SELECT 1 FROM ${modelVersions} mv
          INNER JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = models.id
          AND mv.version = models.current_version
          AND mf.extension IN ('stl', 'obj', 'ply')
        )
      )`,
      hasSlicerFile: sql<boolean>`(
        SELECT EXISTS(
          SELECT 1 FROM ${modelVersions} mv
          INNER JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = models.id
          AND mv.version = models.current_version
          AND mf.extension = '3mf'
        )
      )`,
      hasImageFile: sql<boolean>`(
        SELECT EXISTS(
          SELECT 1 FROM ${modelVersions} mv
          INNER JOIN ${modelFiles} mf ON mf.version_id = mv.id
          WHERE mv.model_id = models.id
          AND mv.version = models.current_version
          AND mf.extension IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
        )
      )`,
    })
    .from(models)
    .innerJoin(user, eq(models.ownerId, user.id))
    .where(and(...conditions))
    .orderBy(desc(models.updatedAt))
    .limit(safeLimit + 1)
    .offset(offset);

  const hasMore = modelsWithData.length > safeLimit;
  const items = hasMore ? modelsWithData.slice(0, safeLimit) : modelsWithData;

  const modelList = await Promise.all(
    items.map(async (row) => {
      let thumbnailUrl: string | null = null;
      if (row.thumbnailPath) {
        try {
          thumbnailUrl = await storageService.generateDownloadUrl(row.thumbnailPath);
        } catch {
          thumbnailUrl = null;
        }
      }

      const hasModel = row.hasModelFile ?? false;
      const hasSlicer = row.hasSlicerFile ?? false;
      // Image can be either in model_files OR as a thumbnail on the version
      const hasImage = (row.hasImageFile ?? false) || !!row.thumbnailPath;

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
        owner: {
          id: row.ownerId,
          name: row.ownerName,
          image: row.ownerImage,
        },
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        completeness: {
          hasModel,
          hasSlicer,
          hasImage,
          isComplete: hasModel && hasSlicer && hasImage,
        },
      };
    }),
  );

  const nextCursor = hasMore ? offset + safeLimit : null;

  return {
    models: modelList,
    nextCursor,
  };
}

export const modelListService = {
  listModels,
};
