import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema/auth'
import { modelFiles, models, modelVersions } from '@/lib/db/schema/models'

type DeleteModelInput = {
  modelId: string
  organizationId: string
}

/**
 * Soft delete a model by setting deletedAt timestamp
 * Also decrements usage counters (storage and model count)
 */
export async function deleteModel({
  modelId,
  organizationId,
}: DeleteModelInput): Promise<{ deletedId: string }> {
  const [model] = await db
    .select({ id: models.id })
    .from(models)
    .where(
      and(
        eq(models.id, modelId),
        eq(models.organizationId, organizationId),
        isNull(models.deletedAt)
      )
    )
    .limit(1)

  if (!model) {
    throw new Error('Model not found or already deleted')
  }

  const [storageResult] = await db
    .select({
      totalStorage: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)`,
    })
    .from(modelFiles)
    .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
    .where(eq(modelVersions.modelId, modelId))

  const storageToFree = storageResult?.totalStorage ?? 0

  await db
    .update(models)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(models.id, modelId))

  await db
    .update(organization)
    .set({
      currentModelCount: sql`GREATEST(${organization.currentModelCount} - 1, 0)`,
      currentStorage: sql`GREATEST(${organization.currentStorage} - ${storageToFree}, 0)`,
    })
    .where(eq(organization.id, organizationId))

  return { deletedId: modelId }
}

export const modelDeleteService = {
  deleteModel,
}
