import { promises as fs } from 'node:fs';
import type { RouterClient } from '@orpc/server';
import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { publicProcedure } from '../lib/orpc';
import { constructSecurePath } from '../lib/security';
import { ModelListQuerySchema, ModelMetadataSchema } from '../types/model';

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // List all models with pagination and filtering - using read service with cache
  listModels: publicProcedure
    .input(ModelListQuerySchema)
    .handler(async ({ input, context }) => {
      return await context.services.filesystem.listModels(input);
    }),

  // Get a single model with all versions - using read service with cache
  getModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const model = await context.services.filesystem.getModel(input.id);
      if (!model) {
        throw new ORPCError('NOT_FOUND', {
          message: `Model with id '${input.id}' not found`,
        });
      }
      return model;
    }),

  // Get model file content (for downloads) - with security validation
  getModelFile: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
        filename: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      // Use secure path construction
      const filePath = constructSecurePath(
        context.dataDir,
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
        throw new ORPCError('NOT_FOUND', {
          message: 'File not found',
        });
      }
    }),

  // Update model metadata - using shared filesystem service
  updateModelMetadata: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string().optional(),
        metadata: ModelMetadataSchema,
      })
    )
    .handler(async ({ input, context }) => {
      // Save metadata (this will validate and sanitize inputs)
      await context.services.filesystem.saveMetadata(
        input.modelId,
        input.version || null,
        input.metadata
      );

      // Try to commit the changes - but don't fail if Git has issues
      try {
        const commitMessage = `Update metadata for ${input.modelId}${input.version ? ` ${input.version}` : ''}`;
        await context.services.git.commitModelUpdate(input.modelId, commitMessage);
      } catch (error) {
        console.error('Git commit failed for metadata update:', error.message);
        // Continue without Git - metadata is still saved
      }

      return { success: true };
    }),

  // Delete a model completely - using shared filesystem service
  deleteModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await context.services.filesystem.deleteModel(input.id);
      
      // Try to commit the deletion - but don't fail if Git has issues
      try {
        await context.services.git.commitModelDeletion(input.id);
      } catch (error) {
        console.error('Git commit failed for model deletion:', error.message);
        // Continue without Git - model is still deleted
      }

      return { success: true };
    }),

  // Delete a specific version - using shared filesystem service
  deleteModelVersion: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      await context.services.filesystem.deleteVersion(input.modelId, input.version);

      // Try to commit the version deletion - but don't fail if Git has issues
      try {
        const commitMessage = `Delete ${input.modelId} ${input.version}`;
        await context.services.git.commitModelUpdate(input.modelId, commitMessage);
      } catch (error) {
        console.error('Git commit failed for version deletion:', error.message);
        // Continue without Git - version is still deleted
      }

      return { success: true };
    }),

  // Get model history from git - using git service
  getModelHistory: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .handler(async ({ input, context }) => {
      try {
        return await context.services.git.getModelHistory(input.modelId, input.limit);
      } catch (error) {
        console.error('Git history failed:', error.message);
        // Return empty history if Git fails
        return [];
      }
    }),

  // Get repository status - using git service
  getRepositoryStatus: publicProcedure.handler(async ({ context }) => {
    try {
      return await context.services.git.getRepositoryStatus();
    } catch (error) {
      console.error('Git status failed:', error.message);
      // Return default status if Git fails
      return {
        isClean: true,
        staged: [],
        modified: [],
        untracked: [],
      };
    }
  }),

  // Get available tags across all models - using read service
  getAllTags: publicProcedure.handler(async ({ context }) => {
    const allModels = await context.services.filesystem.listModels({
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

  // Get Git configuration status - using git service
  getGitStatus: publicProcedure.handler(async ({ context }) => {
    try {
      const repoStatus = await context.services.git.getRepositoryStatus();
      const remotes = await context.services.git.getRemotes();
      const currentBranch = await context.services.git.getCurrentBranch();

      return {
        branch: currentBranch,
        remotes,
        repository: repoStatus,
        hasRemote: remotes.length > 0,
        isClean: repoStatus.isClean,
      };
    } catch (error) {
      console.error('Git status check failed:', error.message);
      // Return default Git status if Git fails
      return {
        branch: 'main',
        remotes: [],
        repository: {
          isClean: true,
          staged: [],
          modified: [],
          untracked: [],
        },
        hasRemote: false,
        isClean: true,
      };
    }
  }),
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
