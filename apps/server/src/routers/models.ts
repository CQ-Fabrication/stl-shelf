import { z } from "zod/v4";
import { protectedProcedure } from "@/lib/orpc";
import { modelCreationService } from "@/services/models/model-create.service";
import { modelListService } from "@/services/models/model-list.service";
import { tagService } from "@/services/tags/tag.service";

const fileSchema = z.instanceof(File);

const createModelInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).default([]),
  files: z.array(fileSchema).min(1).max(5),
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
  modelId: z.string().uuid(),
  versionId: z.string().uuid(),
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
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(12),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const modelListItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  currentVersion: z.string(),
  fileCount: z.number(),
  totalSize: z.number(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

const listModelsOutputSchema = z.object({
  models: z.array(modelListItemSchema),
  pagination: paginationSchema,
});

export const listModelsProcedure = protectedProcedure
  .input(listModelsInputSchema)
  .output(listModelsOutputSchema)
  .handler(async ({ input, context }) => {
    const result = await modelListService.listModels({
      organizationId: context.organizationId,
      page: input.page,
      limit: input.limit,
      search: input.search,
      tags: input.tags,
    });

    return {
      models: result.models.map(model => ({
        ...model,
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      })),
      pagination: result.pagination,
    };
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

export const modelsRouter = {
  create: createModelProcedure,
  listModels: listModelsProcedure,
  getAllTags: getAllTagsProcedure,
};
