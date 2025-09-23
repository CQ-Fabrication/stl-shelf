import { createRoute } from "@hono/zod-openapi";
import { protectedProcedure } from "@/lib/orpc";
import { z } from "@/lib/zod";
import { modelCreationService } from "@/services/models/model-create.service";

const fileSchema = z.instanceof(File).openapi({
  type: "string",
  format: "binary",
  description: "Model source file (STL, 3MF, etc.)",
});

const createModelInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .openapi({ description: "Human readable model name" }),
    description: z
      .string()
      .max(2000)
      .optional()
      .openapi({ description: "Optional description for the model" }),
    tags: z
      .array(z.string().min(1).max(64))
      .max(20)
      .default([])
      .openapi({ description: "List of tags to assign to the model" }),
    files: z
      .array(fileSchema)
      .min(1)
      .max(5)
      .openapi({ description: "One or more model files to upload" }),
  })
  .openapi("CreateModelInput");

const modelFileResponseSchema = z
  .object({
    id: z.uuid(),
    filename: z.string(),
    originalName: z.string(),
    size: z.number().nonnegative(),
    mimeType: z.string(),
    extension: z.string(),
    storageKey: z.string(),
    storageUrl: z.string().nullable(),
    storageBucket: z.string(),
  })
  .openapi("UploadedModelFile");

const createModelResponseSchema = z
  .object({
    modelId: z.string().uuid(),
    versionId: z.string().uuid(),
    version: z.string(),
    slug: z.string(),
    storageRoot: z.string(),
    createdAt: z.iso.datetime(),
    tags: z.array(z.string()),
    files: z.array(modelFileResponseSchema),
  })
  .openapi("CreateModelResponse");

export const createModelRoute = createRoute({
  method: "post",
  path: "/rpc/models/create",
  summary: "Create model",
  description:
    "Create a new model for the active organization, upload its source files, and assign optional tags.",
  tags: ["models"],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: createModelInputSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Model created successfully",
      content: {
        "application/json": {
          schema: createModelResponseSchema,
        },
      },
    },
  },
});

const createModelRouteMeta = {
  method: "POST",
  path: "/rpc/models/create",
  summary: createModelRoute.summary,
  description: createModelRoute.description,
  tags: createModelRoute.tags,
} as const;

export const createModelProcedure = protectedProcedure
  .route(createModelRouteMeta)
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
};

export const modelsOpenApiRoutes = [createModelRoute];
