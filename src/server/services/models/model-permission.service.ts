import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelFiles, modelVersions } from "@/lib/db/schema/models";
import { canEditModel, type Role } from "@/lib/permissions";

type EditActor = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

type OwningModel = {
  ownerId: string;
  organizationId: string;
  deletedAt: Date | null;
};

const OWNING_MODEL_COLUMNS = {
  columns: { ownerId: true, organizationId: true, deletedAt: true },
} as const;

function assertEditPermission(actor: EditActor, model: OwningModel | undefined): void {
  if (!model || model.organizationId !== actor.organizationId || model.deletedAt !== null) {
    throw new Error("Model not found");
  }

  const isOwnModel = model.ownerId === actor.userId;
  if (!canEditModel(actor.memberRole as Role, isOwnModel)) {
    throw new Error("You don't have permission to edit this model");
  }
}

/**
 * RBAC guard for write operations addressed by version id:
 * admins/owners can edit any model, members only their own.
 */
export async function assertCanEditModelOfVersion(
  versionId: string,
  actor: EditActor,
): Promise<void> {
  const version = await db.query.modelVersions.findFirst({
    where: eq(modelVersions.id, versionId),
    columns: { id: true },
    with: { model: OWNING_MODEL_COLUMNS },
  });

  assertEditPermission(actor, version?.model);
}

/**
 * RBAC guard for write operations addressed by file id:
 * admins/owners can edit any model, members only their own.
 */
export async function assertCanEditModelOfFile(fileId: string, actor: EditActor): Promise<void> {
  const file = await db.query.modelFiles.findFirst({
    where: eq(modelFiles.id, fileId),
    columns: { id: true },
    with: {
      version: {
        columns: { id: true },
        with: { model: OWNING_MODEL_COLUMNS },
      },
    },
  });

  assertEditPermission(actor, file?.version.model);
}
