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
  getCategoryFromExtension,
  getCompletenessStatus,
} from "@/lib/files/completeness";
import { getFileSizeLimit, formatBytes } from "@/lib/files/limits";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { modelFileService } from "@/server/services/models/model-file.service";

const removeFileFromVersionSchema = z.object({
  fileId: z.string().uuid(),
});

const getVersionCompletenessSchema = z.object({
  versionId: z.string().uuid(),
});

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

        const extension = data.file.name.split(".").pop()?.toLowerCase() || "";
        const category = getCategoryFromExtension(extension);

        if (!category) {
          throw new Error(`File type .${extension} is not supported for this operation`);
        }
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
        const result = await modelFileService.removeFileFromVersion({
          fileId: data.fileId,
          organizationId: context.organizationId,
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
