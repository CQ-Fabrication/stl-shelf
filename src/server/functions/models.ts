import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, count, eq, isNull, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { models, modelFiles, modelVersions } from "@/lib/db/schema/models";
import { canDeleteModel, canEditModel, type Role } from "@/lib/permissions";
import type { SubscriptionTier } from "@/lib/billing/config";
import { getTierConfig, isUnlimited } from "@/lib/billing/config";
import { buildStatsigUser, trackModelViewed, trackSearchPerformed } from "@/lib/statsig";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logAuditEvent, logErrorEvent, shouldLogServerError } from "@/lib/logging";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { modelCreationService } from "@/server/services/models/model-create.service";
import { modelDeleteService } from "@/server/services/models/model-delete.service";
import { modelUpdateService } from "@/server/services/models/model-update.service";
import { modelDetailService } from "@/server/services/models/model-detail.service";
import { modelDownloadService } from "@/server/services/models/model-download.service";
import { modelListService } from "@/server/services/models/model-list.service";
import { modelVersionService } from "@/server/services/models/model-version.service";
import { tagService } from "@/server/services/tags/tag.service";

// Zod validators
const listModelsSchema = z.object({
  cursor: z.number().min(0).optional(),
  limit: z.number().min(1).max(100).default(12),
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const getModelSchema = z.object({
  id: z.string().uuid(),
});

const getModelVersionsSchema = z.object({
  modelId: z.string().uuid(),
});

const getModelFilesSchema = z.object({
  modelId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const updateModelTagsSchema = z.object({
  modelId: z.string().uuid(),
  tags: z.array(z.string().min(1).max(64)).max(20),
});

const downloadFileSchema = z.object({
  storageKey: z.string(),
});

const downloadModelZipSchema = z.object({
  modelId: z.string().uuid(),
});

const downloadVersionZipSchema = z.object({
  modelId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const deleteModelSchema = z.object({
  id: z.string().uuid(),
});

const renameModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
});

// List models with pagination
export const listModels = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listModelsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof listModelsSchema>;
      context: AuthenticatedContext;
    }) => {
      const result = await modelListService.listModels({
        organizationId: context.organizationId,
        cursor: data.cursor,
        limit: data.limit,
        search: data.search,
        tags: data.tags,
      });

      // Track search events (only when search query is present)
      if (data.search) {
        const statsigUser = buildStatsigUser(context, null);
        trackSearchPerformed(statsigUser, {
          query: data.search,
          resultsCount: result.models.length,
          hasFilters: Boolean(data.tags?.length),
          tags: data.tags,
        }).catch(() => {}); // Fire and forget
      }

      return result;
    },
  );

// Get all tags for organization
export const getAllTags = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    return await tagService.getAllTagsForOrganization(context.organizationId);
  });

// Get single model
export const getModel = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getModelSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getModelSchema>;
      context: AuthenticatedContext;
    }) => {
      const model = await modelDetailService.getModel(data.id, context.organizationId);

      // Track model view
      const statsigUser = buildStatsigUser(context, null);
      trackModelViewed(statsigUser, {
        modelId: data.id,
        source: "direct",
      }).catch(() => {}); // Fire and forget

      return model;
    },
  );

// Get model versions
export const getModelVersions = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getModelVersionsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getModelVersionsSchema>;
      context: AuthenticatedContext;
    }) => {
      return await modelDetailService.getModelVersions(data.modelId, context.organizationId);
    },
  );

// Get model files for a version
export const getModelFiles = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getModelFilesSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getModelFilesSchema>;
      context: AuthenticatedContext;
    }) => {
      return await modelDetailService.getModelFiles(
        data.modelId,
        data.versionId,
        context.organizationId,
      );
    },
  );

// Get model statistics
export const getModelStatistics = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getModelSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getModelSchema>;
      context: AuthenticatedContext;
    }) => {
      return await modelDetailService.getModelStatistics(data.id, context.organizationId);
    },
  );

// Get model tags
export const getModelTags = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getModelSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getModelSchema>;
      context: AuthenticatedContext;
    }) => {
      return await modelDetailService.getModelTags(data.id, context.organizationId);
    },
  );

// Update model tags
export const updateModelTags = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(updateModelTagsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof updateModelTagsSchema>;
      context: AuthenticatedContext;
    }) => {
      // RBAC: Check edit permission (admins can edit any, members can edit own only)
      const [model] = await db
        .select({ ownerId: models.ownerId })
        .from(models)
        .where(and(eq(models.id, data.modelId), eq(models.organizationId, context.organizationId)))
        .limit(1);

      if (!model) {
        throw new Error("Model not found");
      }

      const isOwnModel = model.ownerId === context.userId;
      if (!canEditModel(context.memberRole as Role, isOwnModel)) {
        throw new Error("You don't have permission to edit this model");
      }

      const uniqueTags = Array.from(new Set(data.tags));
      await tagService.updateModelTags(data.modelId, uniqueTags, context.organizationId);

      return { success: true };
    },
  );

// Create model (with file upload via FormData)
export const createModel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const name = input.get("name") as string;
    const description = (input.get("description") as string) || undefined;
    const tagsJson = input.get("tags") as string;
    const tags: string[] = tagsJson ? JSON.parse(tagsJson) : [];
    const files = input.getAll("files") as File[];
    const previewImage = input.get("previewImage") as File | null;

    if (!name || files.length === 0) {
      throw new Error("Name and at least one file are required");
    }

    return { name, description, tags, files, previewImage };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: {
        name: string;
        description: string | undefined;
        tags: string[];
        files: File[];
        previewImage: File | null;
      };
      context: AuthenticatedContext;
    }) => {
      try {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        // Default to 'free' tier if subscriptionTier is null (new organizations)
        const tier = (org.subscriptionTier as SubscriptionTier) || "free";
        const tierConfig = getTierConfig(tier);

        // CRITICAL: Always query actual counts from DB - never trust counters
        // IMPORTANT: Exclude soft-deleted models (deletedAt IS NULL)
        const [modelCountResult] = await db
          .select({ count: count() })
          .from(models)
          .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

        const currentModelCount = modelCountResult?.count ?? 0;
        const modelLimit = org.modelCountLimit ?? tierConfig.modelCountLimit;

        // Check model limit (skip for unlimited -1)
        if (!isUnlimited(modelLimit) && currentModelCount >= modelLimit) {
          throw new Error(
            `Model limit reached. Your ${tierConfig.name} plan allows ${modelLimit} model(s). Upgrade to add more models.`,
          );
        }

        // Query actual storage usage from DB
        // IMPORTANT: Exclude soft-deleted models
        const [storageResult] = await db
          .select({ total: sum(modelFiles.size) })
          .from(modelFiles)
          .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
          .innerJoin(models, eq(modelVersions.modelId, models.id))
          .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

        const currentStorage = Number(storageResult?.total ?? 0);
        const totalFileSize = data.files.reduce((acc, file) => acc + file.size, 0);
        const storageLimit = org.storageLimit ?? tierConfig.storageLimit;

        // Check storage limit
        if (currentStorage + totalFileSize > storageLimit) {
          const limitMB = (storageLimit / 1_048_576).toFixed(0);
          throw new Error(
            `Storage limit exceeded. Your ${tierConfig.name} plan allows ${limitMB} MB. Upgrade for more storage.`,
          );
        }

        const uniqueTags = Array.from(new Set(data.tags));

        const result = await modelCreationService.createModel({
          organizationId: context.organizationId,
          ownerId: context.userId,
          name: data.name,
          description: data.description ?? null,
          tags: uniqueTags,
          files: data.files,
          previewImage: data.previewImage ?? undefined,
          ipAddress: context.ipAddress,
        });

        logAuditEvent("model.created", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: result.modelId,
          versionId: result.versionId,
          ipAddress: context.ipAddress,
        });

        return {
          modelId: result.modelId,
          versionId: result.versionId,
          version: result.version,
          slug: result.slug,
          storageRoot: result.storageRoot,
          createdAt: result.createdAt.toISOString(),
          tags: uniqueTags,
          files: result.files,
        };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.create_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Add version to model (with file upload via FormData)
export const addVersion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const modelId = input.get("modelId") as string;
    const changelog = input.get("changelog") as string;
    const files = input.getAll("files") as File[];
    const previewImage = input.get("previewImage") as File | null;

    if (!modelId || !changelog || files.length === 0) {
      throw new Error("Model ID, changelog, and at least one file are required");
    }

    return { modelId, changelog, files, previewImage };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: {
        modelId: string;
        changelog: string;
        files: File[];
        previewImage: File | null;
      };
      context: AuthenticatedContext;
    }) => {
      try {
        // RBAC: Check edit permission (admins can edit any, members can edit own only)
        const [existingModel] = await db
          .select({ ownerId: models.ownerId })
          .from(models)
          .where(
            and(eq(models.id, data.modelId), eq(models.organizationId, context.organizationId)),
          )
          .limit(1);

        if (!existingModel) {
          throw new Error("Model not found");
        }

        const isOwnModel = existingModel.ownerId === context.userId;
        if (!canEditModel(context.memberRole as Role, isOwnModel)) {
          throw new Error("You don't have permission to add versions to this model");
        }

        // Get organization and tier for limit checking
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, context.organizationId),
        });

        if (!org) {
          throw new Error("Organization not found");
        }

        const tier = (org.subscriptionTier as SubscriptionTier) || "free";
        const tierConfig = getTierConfig(tier);

        // Query actual storage usage from DB (don't trust counters)
        // IMPORTANT: Exclude soft-deleted models
        const [storageResult] = await db
          .select({ total: sum(modelFiles.size) })
          .from(modelFiles)
          .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
          .innerJoin(models, eq(modelVersions.modelId, models.id))
          .where(and(eq(models.organizationId, context.organizationId), isNull(models.deletedAt)));

        const currentStorage = Number(storageResult?.total ?? 0);
        const totalFileSize = data.files.reduce((acc, file) => acc + file.size, 0);
        const storageLimit = org.storageLimit ?? tierConfig.storageLimit;

        // Check storage limit before adding version
        if (currentStorage + totalFileSize > storageLimit) {
          const limitMB = (storageLimit / 1_048_576).toFixed(0);
          throw new Error(
            `Storage limit exceeded. Your ${tierConfig.name} plan allows ${limitMB} MB. Upgrade for more storage.`,
          );
        }

        const result = await modelVersionService.addVersion({
          modelId: data.modelId,
          organizationId: context.organizationId,
          ownerId: context.userId,
          changelog: data.changelog,
          files: data.files,
          previewImage: data.previewImage ?? undefined,
          ipAddress: context.ipAddress,
        });

        logAuditEvent("model.version_added", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: data.modelId,
          versionId: result.versionId,
          ipAddress: context.ipAddress,
        });

        return {
          versionId: result.versionId,
          version: result.version,
          files: result.files,
        };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            modelId: data.modelId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.version_add_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Download single file - returns signed URL for direct download
export const downloadFile = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(downloadFileSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof downloadFileSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        // Return signed URL instead of Blob (Blob not serializable in server functions)
        const downloadInfo = await modelDownloadService.getFileDownloadInfo(
          data.storageKey,
          context.organizationId,
        );

        logAuditEvent("model.file_download_requested", {
          organizationId: context.organizationId,
          userId: context.userId,
          storageKey: data.storageKey,
          ipAddress: context.ipAddress,
        });

        return downloadInfo;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            storageKey: data.storageKey,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.download_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Download model as ZIP - returns signed URL for ZIP download
export const downloadModelZip = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(downloadModelZipSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof downloadModelZipSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        // For ZIP downloads, we need a different approach - create ZIP on server and return URL
        // For now, return the model info so client can download files individually
        const versions = await modelDetailService.getModelVersions(
          data.modelId,
          context.organizationId,
        );

        logAuditEvent("model.zip_download_requested", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: data.modelId,
          ipAddress: context.ipAddress,
        });

        return { versions, modelId: data.modelId };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            modelId: data.modelId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.download_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Download version as ZIP - returns files for version
export const downloadVersionZip = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(downloadVersionZipSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof downloadVersionZipSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        // Return files list so client can generate download URLs
        const files = await modelDetailService.getModelFiles(
          data.modelId,
          data.versionId,
          context.organizationId,
        );

        logAuditEvent("model.version_zip_download_requested", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: data.modelId,
          versionId: data.versionId,
          ipAddress: context.ipAddress,
        });

        return { files, modelId: data.modelId, versionId: data.versionId };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            modelId: data.modelId,
            versionId: data.versionId,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.download_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Get file download info
export const getFileDownloadInfo = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(downloadFileSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof downloadFileSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        const downloadInfo = await modelDownloadService.getFileDownloadInfo(
          data.storageKey,
          context.organizationId,
        );

        logAuditEvent("model.file_download_requested", {
          organizationId: context.organizationId,
          userId: context.userId,
          storageKey: data.storageKey,
          ipAddress: context.ipAddress,
        });

        return downloadInfo;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            storageKey: data.storageKey,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.file.download_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Delete model
export const deleteModel = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteModelSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof deleteModelSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        // RBAC: Only admins and owners can delete models
        if (!canDeleteModel(context.memberRole as Role)) {
          throw new Error("You don't have permission to delete models");
        }

        const result = await modelDeleteService.deleteModel({
          modelId: data.id,
          organizationId: context.organizationId,
        });

        logAuditEvent("model.deleted", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: data.id,
          ipAddress: context.ipAddress,
        });

        return {
          success: true,
          deletedId: result.deletedId,
        };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            modelId: data.id,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.delete_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Rename model
export const renameModel = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(renameModelSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof renameModelSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        // RBAC: Check edit permission (admins can edit any, members can edit own only)
        const [model] = await db
          .select({ ownerId: models.ownerId })
          .from(models)
          .where(and(eq(models.id, data.id), eq(models.organizationId, context.organizationId)))
          .limit(1);

        if (!model) {
          throw new Error("Model not found");
        }

        const isOwnModel = model.ownerId === context.userId;
        if (!canEditModel(context.memberRole as Role, isOwnModel)) {
          throw new Error("You don't have permission to edit this model");
        }

        const result = await modelUpdateService.renameModel({
          modelId: data.id,
          organizationId: context.organizationId,
          name: data.name,
        });

        logAuditEvent("model.renamed", {
          organizationId: context.organizationId,
          userId: context.userId,
          modelId: data.id,
          ipAddress: context.ipAddress,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            modelId: data.id,
            ipAddress: context.ipAddress,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.model.rename_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );
