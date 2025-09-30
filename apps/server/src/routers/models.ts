import { z } from "zod/v4";
import { protectedProcedure } from "@/lib/orpc";
import { modelCreationService } from "@/services/models/model-create.service";
import { modelDeleteService } from "@/services/models/model-delete.service";
import { modelDetailService } from "@/services/models/model-detail.service";
import { modelDownloadService } from "@/services/models/model-download.service";
import { modelListService } from "@/services/models/model-list.service";
import { modelVersionService } from "@/services/models/model-version.service";
import { tagService } from "@/services/tags/tag.service";

const fileSchema = z.instanceof(File);

const createModelInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).default([]),
  files: z.array(fileSchema).min(1).max(5),
  previewImage: fileSchema.optional(),
});

const modelFileResponseSchema = z.object({
  id: z.uuid(),
  filename: z.string(),
  originalName: z.string(),
  size: z.number().nonnegative(),
  mimeType: z.string(),
  extension: z.string(),
  storageKey: z.string(),
  storageUrl: z.string().nullable(),
  storageBucket: z.string(),
});

const createModelResponseSchema = z.object({
  modelId: z.uuid(),
  versionId: z.uuid(),
  version: z.string(),
  slug: z.string(),
  storageRoot: z.string(),
  createdAt: z.iso.datetime(),
  tags: z.array(z.string()),
  files: z.array(modelFileResponseSchema),
});

const tagInfoSchema = z.object({
  name: z.string(),
  color: z.string().nullable(),
  usageCount: z.number(),
});

// List models schemas
const listModelsInputSchema = z.object({
  cursor: z.number().min(0).optional(),
  limit: z.number().min(1).max(100).default(12),
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const modelListItemSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentVersion: z.string(),
  fileCount: z.number(),
  totalSize: z.number(),
  tags: z.array(z.string()),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const listModelsOutputSchema = z.object({
  models: z.array(modelListItemSchema),
  nextCursor: z.number().nullable(),
});

export const listModelsProcedure = protectedProcedure
  .input(listModelsInputSchema)
  .output(listModelsOutputSchema)
  .handler(async ({ input, context }) => {
    return await modelListService.listModels({
      organizationId: context.organizationId,
      cursor: input.cursor,
      limit: input.limit,
      search: input.search,
      tags: input.tags,
    });
  });

export const getAllTagsProcedure = protectedProcedure
  .output(z.array(tagInfoSchema))
  .handler(async ({ context }) => {
    return await tagService.getAllTagsForOrganization(context.organizationId);
  });

export const createModelProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/create",
  })
  .input(createModelInputSchema)
  .output(createModelResponseSchema)
  .handler(async ({ input, context }) => {
    const tags = Array.from(new Set(input.tags ?? []));

    const result = await modelCreationService.createModel({
      organizationId: context.organizationId,
      ownerId: context.session.user.id,
      name: input.name,
      description: input.description ?? null,
      tags,
      files: input.files,
      previewImage: input.previewImage,
      ipAddress: context.ipAddress,
    });

    return {
      modelId: result.modelId,
      versionId: result.versionId,
      version: result.version,
      slug: result.slug,
      storageRoot: result.storageRoot,
      createdAt: result.createdAt.toISOString(),
      tags,
      files: result.files,
    };
  });

const addVersionInputSchema = z.object({
  modelId: z.uuid(),
  changelog: z.string().min(1).max(2000),
  files: z.array(fileSchema).min(1).max(5),
});

const addVersionResponseSchema = z.object({
  versionId: z.uuid(),
  version: z.string(),
  files: z.array(modelFileResponseSchema),
});

export const addModelVersionProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/add-version",
  })
  .input(addVersionInputSchema)
  .output(addVersionResponseSchema)
  .handler(async ({ input, context }) => {
    const result = await modelVersionService.addVersion({
      modelId: input.modelId,
      organizationId: context.organizationId,
      ownerId: context.session.user.id,
      changelog: input.changelog,
      files: input.files,
      ipAddress: context.ipAddress,
    });

    return {
      versionId: result.versionId,
      version: result.version,
      files: result.files,
    };
  });

const getModelInputSchema = z.object({
  id: z.uuid(),
});

const modelMetadataSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  currentVersion: z.string(),
  totalVersions: z.number(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const getModelProcedure = protectedProcedure
  .input(getModelInputSchema)
  .output(modelMetadataSchema)
  .handler(async ({ input, context }) => {
    return await modelDetailService.getModel(input.id, context.organizationId);
  });

const getModelVersionsInputSchema = z.object({
  modelId: z.uuid(),
});

const modelVersionSchema = z.object({
  id: z.uuid(),
  modelId: z.uuid(),
  version: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  thumbnailPath: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  files: z.array(modelFileResponseSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const getModelVersionsProcedure = protectedProcedure
  .input(getModelVersionsInputSchema)
  .output(z.array(modelVersionSchema))
  .handler(async ({ input, context }) => {
    return await modelDetailService.getModelVersions(
      input.modelId,
      context.organizationId
    );
  });

const getModelFilesInputSchema = z.object({
  modelId: z.uuid(),
  versionId: z.uuid(),
});

export const getModelFilesProcedure = protectedProcedure
  .input(getModelFilesInputSchema)
  .output(z.array(modelFileResponseSchema))
  .handler(async ({ input, context }) => {
    return await modelDetailService.getModelFiles(
      input.modelId,
      input.versionId,
      context.organizationId
    );
  });

const modelStatisticsSchema = z.object({
  totalSize: z.number(),
  totalFiles: z.number(),
  totalVersions: z.number(),
  fileTypes: z.record(z.string(), z.number()),
  largestFile: z
    .object({
      name: z.string(),
      size: z.number(),
    })
    .nullable(),
  averageFileSize: z.number(),
  lastUpdated: z.iso.datetime(),
});

export const getModelStatisticsProcedure = protectedProcedure
  .input(getModelInputSchema)
  .output(modelStatisticsSchema)
  .handler(async ({ input, context }) => {
    return await modelDetailService.getModelStatistics(
      input.id,
      context.organizationId
    );
  });

const modelTagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string().nullable(),
  usageCount: z.number(),
  description: z.string().nullable(),
});

export const getModelTagsProcedure = protectedProcedure
  .input(getModelInputSchema)
  .output(z.array(modelTagSchema))
  .handler(async ({ input, context }) => {
    return await modelDetailService.getModelTags(
      input.id,
      context.organizationId
    );
  });

// Download procedures
const downloadFileInputSchema = z.object({
  storageKey: z.string(),
});

const downloadModelZipInputSchema = z.object({
  modelId: z.uuid(),
});

const downloadVersionZipInputSchema = z.object({
  modelId: z.uuid(),
  versionId: z.uuid(),
});

export const downloadFileProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/download-file",
  })
  .input(downloadFileInputSchema)
  .output(z.instanceof(Blob))
  .handler(async ({ input, context }) => {
    return await modelDownloadService.downloadSingleFile(
      input.storageKey,
      context.organizationId
    );
  });

export const downloadModelZipProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/download-model-zip",
  })
  .input(downloadModelZipInputSchema)
  .output(z.instanceof(Blob))
  .handler(async ({ input, context }) => {
    return await modelDownloadService.downloadModelAsZip(
      input.modelId,
      context.organizationId
    );
  });

export const downloadVersionZipProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/download-version-zip",
  })
  .input(downloadVersionZipInputSchema)
  .output(z.instanceof(Blob))
  .handler(async ({ input, context }) => {
    return await modelDownloadService.downloadVersionAsZip(
      input.modelId,
      input.versionId,
      context.organizationId
    );
  });

export const getFileDownloadInfoProcedure = protectedProcedure
  .input(downloadFileInputSchema)
  .output(
    z.object({
      filename: z.string(),
      size: z.number(),
      mimeType: z.string(),
      downloadUrl: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    return await modelDownloadService.getFileDownloadInfo(
      input.storageKey,
      context.organizationId
    );
  });

// Delete model procedure
const deleteModelInputSchema = z.object({
  id: z.uuid(),
});

const deleteModelOutputSchema = z.object({
  success: z.boolean(),
  deletedId: z.uuid(),
});

export const deleteModelProcedure = protectedProcedure
  .route({
    method: "POST",
    path: "/models/delete",
  })
  .input(deleteModelInputSchema)
  .output(deleteModelOutputSchema)
  .handler(async ({ input, context }) => {
    const result = await modelDeleteService.deleteModel({
      modelId: input.id,
      organizationId: context.organizationId,
    });

    return {
      success: true,
      deletedId: result.deletedId,
    };
  });

// Export types for use in other parts of the application
export type ModelFileResponse = z.infer<typeof modelFileResponseSchema>;
export type CreateModelInput = z.infer<typeof createModelInputSchema>;
export type CreateModelResponse = z.infer<typeof createModelResponseSchema>;
export type AddVersionInput = z.infer<typeof addVersionInputSchema>;
export type AddVersionResponse = z.infer<typeof addVersionResponseSchema>;
export type ModelListItem = z.infer<typeof modelListItemSchema>;
export type ListModelsInput = z.infer<typeof listModelsInputSchema>;
export type ListModelsOutput = z.infer<typeof listModelsOutputSchema>;
export type ModelMetadata = z.infer<typeof modelMetadataSchema>;
export type ModelVersion = z.infer<typeof modelVersionSchema>;
export type ModelStatistics = z.infer<typeof modelStatisticsSchema>;
export type ModelTag = z.infer<typeof modelTagSchema>;

export const modelsRouter = {
  create: createModelProcedure,
  addVersion: addModelVersionProcedure,
  listModels: listModelsProcedure,
  getAllTags: getAllTagsProcedure,
  getModel: getModelProcedure,
  getModelVersions: getModelVersionsProcedure,
  getModelFiles: getModelFilesProcedure,
  getModelStatistics: getModelStatisticsProcedure,
  getModelTags: getModelTagsProcedure,
  downloadFile: downloadFileProcedure,
  downloadModelZip: downloadModelZipProcedure,
  downloadVersionZip: downloadVersionZipProcedure,
  getFileDownloadInfo: getFileDownloadInfoProcedure,
  deleteModel: deleteModelProcedure,
};
