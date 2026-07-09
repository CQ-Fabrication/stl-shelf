import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, eq, isNull, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import type { SubscriptionTier } from "@/lib/billing/config";
import { getTierConfig } from "@/lib/billing/config";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logAuditEvent, logErrorEvent, shouldLogServerError } from "@/lib/logging";
import {
  canRemoveFile,
  formatGracePeriodRemaining,
  getCompletenessStatus,
} from "@/lib/files/completeness";
import { getFileSizeLimit, formatBytes } from "@/lib/files/limits";
import { canEditModel, type Role } from "@/lib/permissions";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { assertWriteAllowed } from "@/server/services/billing/retention.service";
import { modelFileService } from "@/server/services/models/model-file.service";
import { validatePreviewImage, validateSnapshot } from "@/server/services/models/thumbnail.service";

const removeFileFromVersionSchema = z.object({
  fileId: z.string().uuid(),
});

const removeVersionThumbnailSchema = z.object({
  versionId: z.string().uuid(),
});

const getVersionCompletenessSchema = z.object({
  versionId: z.string().uuid(),
});

// Mirrors models.ts canEditModel gating: admins can edit any model in the org,
// members only their own. Resolves the owning model from a version id.
async function assertCanEditVersionModel(
  versionId: string,
  context: AuthenticatedContext,
): Promise<void> {
  const [model] = await db
    .select({ ownerId: models.ownerId })
    .from(modelVersions)
    .innerJoin(models, eq(models.id, modelVersions.modelId))
    .where(
      and(
        eq(modelVersions.id, versionId),
        eq(models.organizationId, context.organizationId),
        isNull(models.deletedAt),
      ),
    )
    .limit(1);

  if (!model) {
    throw new Error("Model not found");
  }

  const isOwnModel = model.ownerId === context.userId;
  if (!canEditModel(context.memberRole as Role, isOwnModel)) {
    throw new Error("You don't have permission to edit this model");
  }
}

export const addFileToVersion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const versionId = input.get("versionId") as string;
    const file = input.get("file") as File | null;

    if (!versionId) {
      throw new Error("Version ID is required");
    }

    if (!file) {
      throw new Error("File is required");
    }

    return { versionId, file };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: { versionId: string; file: File };
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        assertWriteAllowed({
          graceDeadline: org.graceDeadline,
          accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
        });

        const extension = data.file.name.split(".").pop()?.toLowerCase() || "";
        const maxSize = getFileSizeLimit(extension);

        if (data.file.size > maxSize) {
          throw new Error(
            `File too large. ${formatBytes(data.file.size)} exceeds the ${formatBytes(maxSize)} limit for .${extension} files`,
          );
        }

        const tier = (org.subscriptionTier as SubscriptionTier) || "free";
        const tierConfig = getTierConfig(tier);

        const [storageResult] = await db
          .select({ total: sum(modelFiles.size) })
          .from(modelFiles)
          .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
          .innerJoin(models, eq(modelVersions.modelId, models.id))
          .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

        const currentStorage = Number(storageResult?.total ?? 0);
        const storageLimit = org.storageLimit ?? tierConfig.storageLimit;

        if (currentStorage + data.file.size > storageLimit) {
          const limitMB = (storageLimit / 1_048_576).toFixed(0);
          throw new Error(
            `Storage limit exceeded. Your ${tierConfig.name} plan allows ${limitMB} MB. Upgrade for more storage.`,
          );
        }

        const result = await modelFileService.addFileToVersion({
          versionId: data.versionId,
          organizationId: context.organizationId,
          userId: context.userId,
          file: data.file,
          ipAddress: context.ipAddress,
        });

        logAuditEvent("model.file_added", {
          organizationId: context.organizationId,
          userId: context.userId,
          versionId: data.versionId,
          fileId: result.file.id,
          ipAddress: context.ipAddress,
        });

        return {
          success: true,
          file: {
            id: result.file.id,
            filename: result.file.filename,
            originalName: result.file.originalName,
            size: result.file.size,
            mimeType: result.file.mimeType,
            extension: result.file.extension,
            storageKey: result.file.storageKey,
            storageUrl: result.file.storageUrl,
            createdAt: result.file.createdAt.toISOString(),
          },
          category: result.category,
        };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.add_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

export const setGeneratedThumbnail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const versionId = input.get("versionId") as string;
    const image = input.get("image") as File | null;

    if (!versionId) {
      throw new Error("Version ID is required");
    }

    if (!image) {
      throw new Error("Image is required");
    }

    return { versionId, image };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: { versionId: string; image: File };
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        assertWriteAllowed({
          graceDeadline: org.graceDeadline,
          accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
        });

        const validation = validateSnapshot(data.image);
        if (!validation.ok) {
          throw new Error(validation.reason);
        }

        // Intentionally org-level (no canEditModel gate): this is a passive
        // viewer snapshot that only fills a missing thumbnail (non-destructive,
        // only-if-null), so any org member may trigger it.
        const result = await modelFileService.setGeneratedThumbnail({
          versionId: data.versionId,
          organizationId: context.organizationId,
          image: data.image,
        });

        if (!result.skipped) {
          logAuditEvent("model.thumbnail_generated", {
            organizationId: context.organizationId,
            userId: context.userId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          });
        }

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.thumbnail_generation_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

export const replaceVersionThumbnail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const versionId = input.get("versionId") as string;
    const image = input.get("image") as File | null;

    if (!versionId) {
      throw new Error("Version ID is required");
    }

    if (!image) {
      throw new Error("Image is required");
    }

    return { versionId, image };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: { versionId: string; image: File };
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        assertWriteAllowed({
          graceDeadline: org.graceDeadline,
          accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
        });

        await assertCanEditVersionModel(data.versionId, context);

        const validation = validatePreviewImage(data.image);
        if (!validation.ok) {
          throw new Error(validation.reason);
        }

        const result = await modelFileService.replaceVersionThumbnail({
          versionId: data.versionId,
          organizationId: context.organizationId,
          image: data.image,
          extension: validation.extension,
        });

        logAuditEvent("model.thumbnail_replaced", {
          organizationId: context.organizationId,
          userId: context.userId,
          versionId: data.versionId,
          ipAddress: context.ipAddress,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.thumbnail_replace_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

export const removeVersionThumbnail = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(removeVersionThumbnailSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof removeVersionThumbnailSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        assertWriteAllowed({
          graceDeadline: org.graceDeadline,
          accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
        });

        await assertCanEditVersionModel(data.versionId, context);

        const result = await modelFileService.removeVersionThumbnail({
          versionId: data.versionId,
          organizationId: context.organizationId,
        });

        logAuditEvent("model.thumbnail_removed", {
          organizationId: context.organizationId,
          userId: context.userId,
          versionId: data.versionId,
          ipAddress: context.ipAddress,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.thumbnail_remove_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

export const removeFileFromVersion = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(removeFileFromVersionSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof removeFileFromVersionSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        assertWriteAllowed({
          graceDeadline: org.graceDeadline,
          accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
        });

        const result = await modelFileService.removeFileFromVersion({
          fileId: data.fileId,
          organizationId: context.organizationId,
          userId: context.userId,
          ipAddress: context.ipAddress,
        });

        logAuditEvent("model.file_removed", {
          organizationId: context.organizationId,
          userId: context.userId,
          fileId: data.fileId,
          ipAddress: context.ipAddress,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            fileId: data.fileId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.remove_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

export const getVersionCompleteness = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getVersionCompletenessSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getVersionCompletenessSchema>;
      context: AuthenticatedContext;
    }) => {
      const version = await db.query.modelVersions.findFirst({
        where: eq(modelVersions.id, data.versionId),
        with: {
          model: {
            columns: { organizationId: true },
          },
        },
      });

      if (!version || version.model.organizationId !== context.organizationId) {
        throw new Error("Version not found or access denied");
      }

      const files = await modelFileService.getVersionFiles(data.versionId);

      const status = getCompletenessStatus(files);

      const filesWithRemovalInfo = files.map((file) => {
        const removal = canRemoveFile({
          extension: file.extension,
          createdAt: file.createdAt,
        });

        return {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          extension: file.extension,
          storageKey: file.storageKey,
          storageUrl: file.storageUrl,
          createdAt: file.createdAt.toISOString(),
          canRemove: removal.allowed,
          removalTimeRemaining: removal.hoursRemaining
            ? formatGracePeriodRemaining(removal.hoursRemaining)
            : null,
        };
      });

      return {
        status,
        files: filesWithRemovalInfo,
      };
    },
  );
