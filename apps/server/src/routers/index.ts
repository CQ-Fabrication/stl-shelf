import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { RouterClient } from '@orpc/server';
import { z } from 'zod';
import { publicProcedure } from '../lib/orpc';
import { FileSystemService } from '../services/filesystem';
import { GitService } from '../services/git';
import { ModelListQuerySchema, ModelMetadataSchema } from '../types/model';

// Initialize services
const dataDir = process.env.DATA_DIR || '/data';
const fsService = new FileSystemService(dataDir);
const gitService = new GitService(dataDir);

// Initialize services on startup
let servicesInitialized = false;
const initializeServices = async () => {
  // biome-ignore lint/correctness/noConstantCondition: servicesInitialized is modified at runtime after initialization
  if (servicesInitialized) {
    return;
  }

  await fsService.initialize();
  await gitService.initialize({
    userEmail: process.env.GIT_USER_EMAIL,
    userName: process.env.GIT_USER_NAME,
    remoteUrl: process.env.GIT_REMOTE_URL,
  });

  servicesInitialized = true;
};

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // List all models with pagination and filtering
  listModels: publicProcedure
    .input(ModelListQuerySchema)
    .handler(async ({ input }) => {
      await initializeServices();
      return await fsService.listModels(input);
    }),

  // Get a single model with all versions
  getModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await initializeServices();
      const model = fsService.getModel(input.id);
      if (!model) {
        throw new Error('Model not found');
      }
      return model;
    }),

  // Get model file content (for downloads)
  getModelFile: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
        filename: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await initializeServices();
      const filePath = join(
        dataDir,
        input.modelId,
        input.version,
        input.filename
      );

      try {
        await fs.access(filePath);
        // Return file info, actual file serving handled by HTTP middleware
        return {
          path: filePath,
          exists: true,
        };
      } catch {
        throw new Error('File not found');
      }
    }),

  // Update model metadata
  updateModelMetadata: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string().optional(),
        metadata: ModelMetadataSchema,
      })
    )
    .handler(async ({ input }) => {
      await initializeServices();

      await fsService.saveMetadata(
        input.modelId,
        input.version || null,
        input.metadata
      );

      // Commit the changes
      const commitMessage = `Update metadata for ${input.modelId}${input.version ? ` ${input.version}` : ''}`;
      await gitService.commitModelUpdate(input.modelId, commitMessage);

      return { success: true };
    }),

  // Delete a model completely
  deleteModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      await initializeServices();

      await fsService.deleteModel(input.id);
      await gitService.commitModelDeletion(input.id);

      return { success: true };
    }),

  // Delete a specific version
  deleteModelVersion: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await initializeServices();

      await fsService.deleteVersion(input.modelId, input.version);

      const commitMessage = `Delete ${input.modelId} ${input.version}`;
      await gitService.commitModelUpdate(input.modelId, commitMessage);

      return { success: true };
    }),

  // Get model history from git
  getModelHistory: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .handler(async ({ input }) => {
      await initializeServices();
      return await gitService.getModelHistory(input.modelId, input.limit);
    }),

  // Get repository status
  getRepositoryStatus: publicProcedure.handler(async () => {
    await initializeServices();
    return await gitService.getRepositoryStatus();
  }),

  // Get available tags across all models
  getAllTags: publicProcedure.handler(async () => {
    await initializeServices();
    const allModels = await fsService.listModels({
      page: 1,
      limit: 1000,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    const tagsSet = new Set<string>();
    for (const model of allModels.models) {
      for (const tag of model.latestMetadata.tags) {
        tagsSet.add(tag);
      }
    }

    return Array.from(tagsSet).sort();
  }),
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
