import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { modelFileEvents, modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import { tagService } from "@/server/services/tags/tag.service";

// A model deletion is a model-level event: it has no single file or version, so
// the file-specific tombstone columns are notNull placeholders. fileId/versionId
// use the nil UUID (the table has no FKs — see the guardrail on modelFileEvents).
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

type DeleteModelInput = {
  modelId: string;
  organizationId: string;
  // Tombstone attribution. Retention sweeps have no human actor, so a system
  // sentinel is used there (won't match any user row in the activity feed join).
  actorId: string;
  ipAddress?: string | null;
};

/**
 * Soft delete a model by setting deletedAt timestamp
 * Also decrements usage counters (storage, model count, tag usage)
 */
export async function deleteModel({
  modelId,
  organizationId,
  actorId,
  ipAddress,
}: DeleteModelInput): Promise<{ deletedId: string }> {
  const [model] = await db
    .select({ id: models.id, name: models.name })
    .from(models)
    .where(
      and(
        eq(models.id, modelId),
        eq(models.organizationId, organizationId),
        isNull(models.deletedAt),
      ),
    )
    .limit(1);

  if (!model) {
    throw new Error("Model not found or already deleted");
  }

  const [storageResult] = await db
    .select({
      totalStorage: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)`,
    })
    .from(modelFiles)
    .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
    .where(eq(modelVersions.modelId, modelId));

  const storageToFree = storageResult?.totalStorage ?? 0;

  // Soft delete + counter updates + tag recount share one transaction so the
  // tag row locks taken in recountTagsForModel serialize against concurrent
  // tag edits, keeping usageCount exact under READ COMMITTED.
  await db.transaction(async (tx) => {
    await tx
      .update(models)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(models.id, modelId));

    await tx
      .update(organization)
      .set({
        currentModelCount: sql`GREATEST(${organization.currentModelCount} - 1, 0)`,
        currentStorage: sql`GREATEST(${organization.currentStorage} - ${storageToFree}, 0)`,
      })
      .where(eq(organization.id, organizationId));

    await tagService.recountTagsForModel(modelId, tx);

    // Tombstone the deletion in the same transaction: a destructive event must
    // always leave a queryable trace (see the guardrail on modelFileEvents).
    await tx.insert(modelFileEvents).values({
      event: "model.deleted",
      fileId: NIL_UUID,
      versionId: NIL_UUID,
      modelId,
      organizationId,
      filename: "",
      originalName: "",
      extension: "",
      size: 0,
      storageKey: "",
      modelName: model.name,
      versionLabel: null,
      actorId,
      ipAddress: ipAddress ?? null,
    });
  });

  return { deletedId: modelId };
}

export const modelDeleteService = {
  deleteModel,
};
