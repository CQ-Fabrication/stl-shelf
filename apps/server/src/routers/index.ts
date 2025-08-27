import type { RouterClient } from '@orpc/server';
import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { publicProcedure } from '../lib/orpc';
import { cacheService } from '../services/cache';
import { gitService } from '../services/git';
import { modelService } from '../services/models/model.service';
import { modelQueryService } from '../services/models/model-query.service';
import { modelVersionService } from '../services/models/model-version.service';
import { storageService } from '../services/storage';
import { tagService } from '../services/tags/tag.service';
import { ModelListQuerySchema, ModelMetadataSchema } from '../types/model';

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // List all models with pagination and filtering - using database with cache
  listModels: publicProcedure
    .input(ModelListQuerySchema)
    .handler(async ({ input }) => {
      // Try cache first
      const cached = await cacheService.getCachedModelList(input);
      if (cached) {
        return cached;
      }

      // Get from database
      const result = await modelQueryService.listModels(input);

      // Cache result
      await cacheService.cacheModelList(input, result);

      return result;
    }),

  // Get a single model with all versions - using database with cache
  getModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      // Try cache first
      const cached = await cacheService.getCachedModel(input.id);
      if (cached) {
        return cached;
      }

      // Get from database
      const model = await modelQueryService.getModelWithAllData(input.id);
      if (!model) {
        throw new ORPCError('NOT_FOUND', {
          message: `Model with id '${input.id}' not found`,
        });
      }

      // Cache result
      await cacheService.cacheModel(input.id, model);

      return model;
    }),

  // Get model file download URL - using storage service
  getModelFile: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
        filename: z.string(),
      })
    )
    .handler(async ({ input }) => {
      // Generate storage key
      const storageKey = storageService.generateStorageKey({
        modelId: input.modelId,
        version: input.version,
        filename: input.filename,
      });

      // Check if file exists
      const exists = await storageService.fileExists(storageKey);
      if (!exists) {
        throw new ORPCError('NOT_FOUND', {
          message: 'File not found',
        });
      }

      // Generate presigned download URL
      const downloadUrl = await storageService.generateDownloadUrl(storageKey);

      return {
        downloadUrl,
        exists: true,
      };
    }),

  // Update model metadata - using database service
  updateModelMetadata: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string().optional(),
        metadata: ModelMetadataSchema,
      })
    )
    .handler(async ({ input }) => {
      if (input.version) {
        // Update specific version
        await modelVersionService.updateModelVersion(
          input.modelId,
          input.version,
          input.metadata
        );
      } else {
        // Update model itself
        await modelService.updateModel(input.modelId, input.metadata);
      }

      // Update tags if provided
      if (input.metadata.tags) {
        await tagService.updateModelTags(input.modelId, input.metadata.tags);
      }

      // Invalidate cache
      await cacheService.invalidateModel(input.modelId);

      // Try to commit the changes - but don't fail if Git has issues
      try {
        const commitMessage = `Update metadata for ${input.modelId}${input.version ? ` ${input.version}` : ''}`;
        await gitService.commitModelUpdate(input.modelId, commitMessage);
      } catch (error) {
        console.error(
          'Git commit failed for metadata update:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Continue without Git - metadata is still saved
      }

      return { success: true };
    }),

  // Delete a model completely - using database service
  deleteModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      // Get model to find associated files before deletion
      const model = await modelQueryService.getModelWithAllData(input.id);
      if (model) {
        // Delete all associated files from storage
        const storageKeys: string[] = [];
        for (const version of model.versions) {
          for (const file of version.files) {
            const storageKey = storageService.generateStorageKey({
              modelId: input.id,
              version: version.version,
              filename: file.filename,
            });
            storageKeys.push(storageKey);
          }
        }

        if (storageKeys.length > 0) {
          await storageService.deleteFiles(storageKeys);
        }
      }

      // Delete from database
      await modelService.deleteModel(input.id);

      // Invalidate cache
      await cacheService.invalidateModel(input.id);

      // Try to commit the deletion - but don't fail if Git has issues
      try {
        await gitService.commitModelDeletion(input.id);
      } catch (error) {
        console.error(
          'Git commit failed for model deletion:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Continue without Git - model is still deleted
      }

      return { success: true };
    }),

  // Delete a specific version - using database service
  deleteModelVersion: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
      })
    )
    .handler(async ({ input }) => {
      // Get version to find associated files before deletion
      const model = await modelQueryService.getModelWithAllData(input.modelId);
      const version = model?.versions.find((v) => v.version === input.version);

      if (version) {
        // Delete associated files from storage
        const storageKeys = version.files.map((file) =>
          storageService.generateStorageKey({
            modelId: input.modelId,
            version: input.version,
            filename: file.filename,
          })
        );

        if (storageKeys.length > 0) {
          await storageService.deleteFiles(storageKeys);
        }
      }

      // Delete from database
      await modelVersionService.deleteModelVersion(
        input.modelId,
        input.version
      );

      // Invalidate cache
      await cacheService.invalidateModel(input.modelId);

      // Try to commit the version deletion - but don't fail if Git has issues
      try {
        const commitMessage = `Delete ${input.modelId} ${input.version}`;
        await gitService.commitModelUpdate(input.modelId, commitMessage);
      } catch (error) {
        console.error(
          'Git commit failed for version deletion:',
          error instanceof Error ? error.message : 'Unknown error'
        );
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
    .handler(async ({ input }) => {
      try {
        return await gitService.getModelHistory(input.modelId, input.limit);
      } catch (error) {
        console.error(
          'Git history failed:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        // Return empty history if Git fails
        return [];
      }
    }),

  // Get repository status - using git service
  getRepositoryStatus: publicProcedure.handler(async () => {
    try {
      return await gitService.getRepositoryStatus();
    } catch (error) {
      console.error(
        'Git status failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Return default status if Git fails
      return {
        isClean: true,
        staged: [],
        modified: [],
        untracked: [],
      };
    }
  }),

  // Get available tags across all models - using database service with cache
  getAllTags: publicProcedure.handler(async () => {
    // Try cache first
    const cached = await cacheService.getCachedTagList();
    if (cached) {
      return cached;
    }

    // Get from database
    const tags = await tagService.getAllTags();
    const tagNames = tags.map((tag) => tag.name);

    // Cache result
    await cacheService.cacheTagList(tagNames);

    return tagNames;
  }),

  // Get Git configuration status - using git service
  getGitStatus: publicProcedure.handler(async () => {
    try {
      const repoStatus = await gitService.getRepositoryStatus();
      const remotes = await gitService.getRemotes();
      const currentBranch = await gitService.getCurrentBranch();

      return {
        branch: currentBranch,
        remotes,
        repository: repoStatus,
        hasRemote: remotes.length > 0,
        isClean: repoStatus.isClean,
      };
    } catch (error) {
      console.error(
        'Git status check failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
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
