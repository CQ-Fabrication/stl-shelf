import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { SUBSCRIPTION_TIERS, isUnlimited } from "@/lib/billing/config";
import { getRetentionDeadline, getGraceDeadline } from "@/lib/billing/grace";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import { logErrorEvent } from "@/lib/logging";
import { modelDeleteService } from "@/server/services/models/model-delete.service";
import { storageService } from "@/server/services/storage";

export type UsageSnapshot = {
  modelCount: number;
  storageBytes: number;
};

type RetentionResult = {
  status: "no_grace" | "within_retention" | "cleanup_done" | "cleanup_skipped";
  deletedModelIds: string[];
  deletedBytes: number;
  retentionDeadline?: Date;
};

const formatDeadline = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const getUsageSnapshotForOrganization = async (
  organizationId: string,
): Promise<UsageSnapshot> => {
  const [modelCountResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(models)
    .where(and(eq(models.organizationId, organizationId), isNull(models.deletedAt)));

  const [storageResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)` })
    .from(modelFiles)
    .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
    .innerJoin(models, eq(modelVersions.modelId, models.id))
    .where(and(eq(models.organizationId, organizationId), isNull(models.deletedAt)));

  return {
    modelCount: Number(modelCountResult?.count ?? 0),
    storageBytes: Number(storageResult?.total ?? 0),
  };
};

/**
 * The subset of effective limits an over-limit check cares about. Effective
 * limits (tier + active add-on grants) structurally satisfy this, so callers
 * can pass computeEffectiveLimits(...) directly.
 */
export type OverLimitCheck = {
  storageLimit: number;
  modelCountLimit: number;
};

const FREE_LIMITS: OverLimitCheck = {
  storageLimit: SUBSCRIPTION_TIERS.free.storageLimit,
  modelCountLimit: SUBSCRIPTION_TIERS.free.modelCountLimit,
};

const isOverLimits = (snapshot: UsageSnapshot, limits: OverLimitCheck) => {
  const overModels =
    !isUnlimited(limits.modelCountLimit) && snapshot.modelCount > limits.modelCountLimit;
  const overStorage = snapshot.storageBytes > limits.storageLimit;
  return overModels || overStorage;
};

const isOverFreeLimits = (snapshot: UsageSnapshot) => isOverLimits(snapshot, FREE_LIMITS);

const listModelsWithSizes = async (organizationId: string) => {
  const rows = await db
    .select({
      id: models.id,
      createdAt: models.createdAt,
      size: sql<number>`COALESCE(SUM(${modelFiles.size}), 0)`,
    })
    .from(models)
    .leftJoin(modelVersions, eq(models.id, modelVersions.modelId))
    .leftJoin(modelFiles, eq(modelVersions.id, modelFiles.versionId))
    .where(and(eq(models.organizationId, organizationId), isNull(models.deletedAt)))
    .groupBy(models.id, models.createdAt)
    .orderBy(asc(models.createdAt));

  return rows;
};

const collectModelStorageKeys = async (modelId: string) => {
  const files = await db
    .select({ storageKey: modelFiles.storageKey })
    .from(modelFiles)
    .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
    .where(eq(modelVersions.modelId, modelId));

  const thumbnails = await db
    .select({ thumbnailPath: modelVersions.thumbnailPath })
    .from(modelVersions)
    .where(eq(modelVersions.modelId, modelId));

  const keys = new Set<string>();

  files.forEach((file) => {
    if (file.storageKey) keys.add(file.storageKey);
  });

  thumbnails.forEach((thumb) => {
    if (thumb.thumbnailPath) keys.add(thumb.thumbnailPath);
  });

  return Array.from(keys);
};

const deleteModelStorage = async (modelId: string) => {
  const keys = await collectModelStorageKeys(modelId);
  if (keys.length === 0) return;

  const result = await storageService.deleteFiles(keys);
  if (result.failed.length > 0) {
    logErrorEvent("billing.retention.storage_delete_failed", {
      modelId,
      failedKeys: result.failed,
    });
  }
};

/**
 * Grace deadline if the org is over its effective limits. Defaults to free-tier
 * limits (existing callers unchanged), but on a tier revoke the org may still
 * hold active add-on grants, so callers pass computeEffectiveLimits("free",
 * grants) to avoid wrongly putting a paid-add-on org into grace.
 */
export const getGraceDeadlineIfOverLimit = async (
  organizationId: string,
  limits: OverLimitCheck = FREE_LIMITS,
) => {
  const snapshot = await getUsageSnapshotForOrganization(organizationId);
  if (!isOverLimits(snapshot, limits)) {
    return null;
  }

  return getGraceDeadline(new Date());
};

export const clearGraceDeadline = async (organizationId: string) => {
  await db
    .update(organization)
    .set({ graceDeadline: null })
    .where(eq(organization.id, organizationId));
};

export type WriteGuardContext = {
  graceDeadline: Date | null;
  accountDeletionDeadline: Date | null;
};

export const getReadOnlyMessage = (graceDeadline: Date) => {
  const retentionDeadline = getRetentionDeadline(graceDeadline);
  return `Your account is in read-only mode until ${formatDeadline(
    retentionDeadline,
  )}. Upgrade to restore full access.`;
};

export const getAccountDeletionMessage = (accountDeletionDeadline: Date) => {
  return `Your account is scheduled for deletion on ${formatDeadline(
    accountDeletionDeadline,
  )}. Cancel deletion to restore full access.`;
};

export const assertWriteAllowed = (context: WriteGuardContext) => {
  if (context.accountDeletionDeadline) {
    throw new Error(getAccountDeletionMessage(context.accountDeletionDeadline));
  }
  if (context.graceDeadline) {
    throw new Error(getReadOnlyMessage(context.graceDeadline));
  }
};

export const enforceRetentionForOrganization = async (
  organizationId: string,
): Promise<RetentionResult> => {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org?.graceDeadline) {
    return { status: "no_grace", deletedModelIds: [], deletedBytes: 0 };
  }

  const retentionDeadline = getRetentionDeadline(org.graceDeadline);
  const now = new Date();

  if (now.getTime() <= retentionDeadline.getTime()) {
    return {
      status: "within_retention",
      deletedModelIds: [],
      deletedBytes: 0,
      retentionDeadline,
    };
  }

  const snapshot = await getUsageSnapshotForOrganization(organizationId);
  if (!isOverFreeLimits(snapshot)) {
    await clearGraceDeadline(organizationId);
    return {
      status: "cleanup_skipped",
      deletedModelIds: [],
      deletedBytes: 0,
      retentionDeadline,
    };
  }

  const modelsToDelete = await listModelsWithSizes(organizationId);
  let remainingStorage = snapshot.storageBytes;
  let remainingModels = snapshot.modelCount;
  let deletedBytes = 0;
  const deletedModelIds: string[] = [];
  const freeTier = SUBSCRIPTION_TIERS.free;

  for (const model of modelsToDelete) {
    const overStorage = remainingStorage > freeTier.storageLimit;
    const overModels =
      !isUnlimited(freeTier.modelCountLimit) && remainingModels > freeTier.modelCountLimit;

    if (!overStorage && !overModels) break;

    try {
      await deleteModelStorage(model.id);
      await modelDeleteService.deleteModel({
        modelId: model.id,
        organizationId,
        actorId: "system:retention",
        ipAddress: null,
      });
      deletedModelIds.push(model.id);
      deletedBytes += Number(model.size ?? 0);
      remainingStorage = Math.max(0, remainingStorage - Number(model.size ?? 0));
      remainingModels = Math.max(0, remainingModels - 1);
    } catch (error) {
      logErrorEvent("billing.retention.model_delete_failed", {
        organizationId,
        modelId: model.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const updatedSnapshot = await getUsageSnapshotForOrganization(organizationId);
  const withinLimits = !isOverFreeLimits(updatedSnapshot);

  await db
    .update(organization)
    .set({
      currentStorage: updatedSnapshot.storageBytes,
      currentModelCount: updatedSnapshot.modelCount,
      graceDeadline: withinLimits ? null : org.graceDeadline,
    })
    .where(eq(organization.id, organizationId));

  return {
    status: "cleanup_done",
    deletedModelIds,
    deletedBytes,
    retentionDeadline,
  };
};
