import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { models } from "@/lib/db/schema/models";

// Characters that are dangerous for filesystems
const INVALID_CHARS_REGEX = /[<>:"/\\|?*]/g;

type RenameModelInput = {
  modelId: string;
  organizationId: string;
  name: string;
};

/**
 * Validates model name according to requirements:
 * - Min 1 visible character after trim
 * - Max 100 characters
 * - No filesystem-dangerous characters
 */
function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Name is required" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Name must be 100 characters or less" };
  }

  if (INVALID_CHARS_REGEX.test(trimmed)) {
    return { valid: false, error: "Name contains invalid characters" };
  }

  return { valid: true };
}

/**
 * Rename a model.
 * - Verifies model exists and belongs to organization
 * - Validates name (length, characters)
 * - Updates name and updatedAt timestamp
 * - Does NOT change slug (slug is immutable after creation)
 */
export async function renameModel({
  modelId,
  organizationId,
  name,
}: RenameModelInput): Promise<{ success: true; name: string }> {
  // Trim the name
  const trimmedName = name.trim();

  // Validate name
  const validation = validateName(trimmedName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Verify model exists and belongs to organization
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
    throw new Error("Model not found");
  }

  // Update the model name (slug remains unchanged)
  await db
    .update(models)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(models.id, modelId));

  return { success: true, name: trimmedName };
}

export const modelUpdateService = {
  renameModel,
};
