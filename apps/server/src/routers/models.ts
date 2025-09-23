import { protectedProcedure } from "@/lib/orpc";
import { z } from "zod/v4";
import { modelCreationService } from "@/services/models/model-create.service";

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
};
