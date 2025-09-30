import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { models } from "@/db/schema/models";

type DeleteModelInput = {
  modelId: string;
  organizationId: string;
};

/**
 * Soft delete a model by setting deletedAt timestamp
 */
export async function deleteModel({
  modelId,
  organizationId,
}: DeleteModelInput): Promise<{ deletedId: string }> {
  // Verify model exists and belongs to organization
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
    .limit(1);

  if (!model) {
    throw new Error("Model not found or already deleted");
  }

  // Soft delete by setting deletedAt timestamp
  await db
    .update(models)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(models.id, modelId));

  return { deletedId: modelId };
}

export const modelDeleteService = {
  deleteModel,
};
