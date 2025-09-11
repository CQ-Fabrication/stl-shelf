import type { RouterClient } from '@orpc/server';
import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { publicProcedure } from '@/lib/orpc';
import { measureAsync, PerformanceMonitor } from '@/lib/performance';
import { cacheService } from '@/services/cache';
import { gitService } from '@/services/git';
import { modelService } from '@/services/models/model.service';
import { modelQueryService } from '@/services/models/model-query.service';
import { modelVersionService } from '@/services/models/model-version.service';
import { storageService } from '@/services/storage';
import { tagService } from '@/services/tags/tag.service';
import { ModelListQuerySchema, ModelMetadataSchema } from '@/types/model';

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),

  // List all models with pagination and filtering - using database with cache
  listModels: publicProcedure
    .input(ModelListQuerySchema)
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('listModels');

      try {
        const session = (context as any)?.session;
        const organizationId = session?.session?.activeOrganizationId as
          | string
          | undefined;

        if (!(session?.user?.id && organizationId)) {
          throw new ORPCError('UNAUTHORIZED', {
            message: 'No active organization',
          });
        }

        // Try cache first (keyed per organization)
        const cacheKeyParams = { organizationId, ...input };

        monitor.markStart('cache_check');
        const cached = await cacheService.getCachedModelList(cacheKeyParams);
        const cacheTime = monitor.markEnd('cache_check');

        if (cached) {
          monitor.markCache(true, cacheTime);
          monitor.log();
          return cached;
        }

        monitor.markCache(false, cacheTime);

        // Get from database
        const result = await modelQueryService
          .setMonitor(monitor)
          .listModels(input, organizationId);

        // Cache result
        await measureAsync(
          'cache_write',
          () => cacheService.cacheModelList(cacheKeyParams, result),
          monitor
        );

        return result;
      } finally {
        monitor.log();
      }
    }),

  // Get a single model with all versions - using database with cache
  getModel: publicProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModel');

      try {
        const session = (context as any)?.session;
        const organizationId = session?.session?.activeOrganizationId as
          | string
          | undefined;

        if (!(session?.user?.id && organizationId)) {
          throw new ORPCError('UNAUTHORIZED', {
            message: 'No active organization',
          });
        }

        // Try cache first
        monitor.markStart('cache_check');
        const cached = await cacheService.getCachedModel(
          input.id,
          organizationId
        );
        const cacheTime = monitor.markEnd('cache_check');

        if (cached) {
          monitor.markCache(true, cacheTime);
          monitor.log();
          return cached;
        }

        monitor.markCache(false, cacheTime);

        // Get from database
        const model = await modelQueryService
          .setMonitor(monitor)
          .getModelWithAllData(input.id, organizationId);

        if (!model) {
          throw new ORPCError('NOT_FOUND', {
            message: `Model with id '${input.id}' not found`,
          });
        }

        // Cache result
        await measureAsync(
          'cache_write',
          () => cacheService.cacheModel(input.id, model, organizationId),
          monitor
        );

        return model;
      } finally {
        monitor.log();
      }
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
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModelFile');

      try {
        const session = (context as any)?.session;
        const organizationId = session?.session?.activeOrganizationId as
          | string
          | undefined;

        if (!(session?.user?.id && organizationId)) {
          throw new ORPCError('UNAUTHORIZED', {
            message: 'No active organization',
          });
        }

        // Check model ownership
        const model = await measureAsync(
          'check_ownership',
          () => modelService.getModel(input.modelId),
          monitor
        );

        if (!model || model.organizationId !== organizationId)
          throw new ORPCError('FORBIDDEN');

        // Generate storage key
        monitor.markStart('generate_key');
        const storageKey = storageService.generateStorageKey({
          modelId: input.modelId,
          version: input.version,
          filename: input.filename,
        });
        monitor.markEnd('generate_key');

        // Check if file exists
        const exists = await measureAsync(
          'check_exists',
          () => storageService.fileExists(storageKey),
          monitor
        );

        if (!exists) {
          throw new ORPCError('NOT_FOUND', {
            message: 'File not found',
          });
        }

        // Generate presigned download URL
        const downloadUrl = await measureAsync(
          'generate_url',
          () => storageService.generateDownloadUrl(storageKey),
          monitor
        );

        return {
          downloadUrl,
          exists: true,
        };
      } finally {
        monitor.log();
      }
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
    .handler(async ({ input, context }) => {
      const session = (context as any)?.session;
      const organizationId = session?.session?.activeOrganizationId as
        | string
        | undefined;
      const userId = session?.user?.id as string | undefined;

      if (!(userId && organizationId)) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No active organization',
        });
      }

      const model = await modelService.getModel(input.modelId);
      if (!model || model.organizationId !== organizationId)
        throw new ORPCError('FORBIDDEN');
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
      await cacheService.invalidateModel(input.modelId, userId);

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
    .handler(async ({ input, context }) => {
      const session = (context as any)?.session;
      const organizationId = session?.session?.activeOrganizationId as
        | string
        | undefined;

      if (!(session?.user?.id && organizationId)) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No active organization',
        });
      }

      const owned = await modelService.getModel(input.id);
      if (!owned || owned.organizationId !== organizationId)
        throw new ORPCError('FORBIDDEN');
      // Get model to find associated files before deletion
      const model = await modelQueryService.getModelWithAllData(
        input.id,
        organizationId
      );
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
      await cacheService.invalidateModel(input.id, organizationId);

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
    .handler(async ({ input, context }) => {
      const session = (context as any)?.session;
      const organizationId = session?.session?.activeOrganizationId as
        | string
        | undefined;

      if (!(session?.user?.id && organizationId)) {
        throw new ORPCError('UNAUTHORIZED', {
          message: 'No active organization',
        });
      }

      const modelOwned = await modelService.getModel(input.modelId);
      if (!modelOwned || modelOwned.organizationId !== organizationId)
        throw new ORPCError('FORBIDDEN');
      // Get version to find associated files before deletion
      const model = await modelQueryService.getModelWithAllData(
        input.modelId,
        organizationId
      );
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
      await cacheService.invalidateModel(input.modelId, organizationId);

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

  // Get paginated model versions
  getModelVersions: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        offset: z.number().optional().default(0),
        limit: z.number().optional().default(5),
      })
    )
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModelVersions');

      try {
        const session = (context as any)?.session;
        const organizationId = session?.session?.activeOrganizationId as
          | string
          | undefined;

        if (!(session?.user?.id && organizationId)) {
          throw new ORPCError('UNAUTHORIZED', {
            message: 'No active organization',
          });
        }

        // Try cache first
        monitor.markStart('cache_check');
        const cached = await cacheService.getCachedModelVersions(
          input.modelId,
          input.offset,
          input.limit,
          organizationId
        );
        const cacheTime = monitor.markEnd('cache_check');

        if (cached) {
          monitor.markCache(true, cacheTime);
          monitor.log();
          return cached;
        }

        monitor.markCache(false, cacheTime);

        // Check model ownership
        const model = await measureAsync(
          'check_ownership',
          () => modelService.getModel(input.modelId),
          monitor
        );

        if (!model || model.organizationId !== organizationId) {
          throw new ORPCError('NOT_FOUND', {
            message: `Model with id '${input.modelId}' not found`,
          });
        }

        // Get paginated versions
        const result = await modelQueryService
          .setMonitor(monitor)
          .getModelVersionsPaginated(
            input.modelId,
            organizationId,
            input.offset,
            input.limit
          );

        // Cache result
        await measureAsync(
          'cache_write',
          () =>
            cacheService.cacheModelVersions(
              input.modelId,
              input.offset,
              input.limit,
              result,
              organizationId
            ),
          monitor
        );

        return result;
      } finally {
        monitor.log();
      }
    }),

  // Get model history from git - NOT IMPLEMENTED YET
  getModelHistory: publicProcedure
    .input(
      z.object({
        modelId: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .handler(async () => {
      // Git service not implemented yet - return empty array
      // This endpoint will be implemented when Git integration is added
      return [];
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
  getAllTags: publicProcedure.handler(async ({ context }) => {
    const session = (context as any)?.session;
    const organizationId = session?.session?.activeOrganizationId as
      | string
      | undefined;

    if (!(session?.user?.id && organizationId)) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'No active organization',
      });
    }

    const tagNames = await tagService.getAllTagsForOrganization(organizationId);
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
