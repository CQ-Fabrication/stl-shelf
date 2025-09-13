import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '@/lib/orpc';
import { ModelListQuerySchema } from '@/types/model';
import { cacheService } from '@/services/cache';
import { storageService } from '@/services/storage';
import { modelQueryService } from '@/services/models/model-query.service';
import { PerformanceMonitor, measureAsync } from '@/lib/performance';

export const modelQueries = {
  listModels: protectedProcedure
    .input(ModelListQuerySchema)
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('listModels');
      const { organizationId } = context;

      try {
        const cacheKeyParams = { organizationId, ...input };

        monitor.markStart('cache_check');
        const cached = await cacheService.getCachedModelList(cacheKeyParams);
        const cacheTime = monitor.markEnd('cache_check');

        if (cached) {
          monitor.markCache(true, cacheTime);
          return cached;
        }

        monitor.markCache(false, cacheTime);

        const result = await modelQueryService
          .setMonitor(monitor)
          .listModels(input, organizationId);

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

  getModel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModel');
      const { organizationId } = context;

      try {
        monitor.markStart('cache_check');
        const cached = await cacheService.getCachedModel(
          input.id,
          organizationId
        );
        const cacheTime = monitor.markEnd('cache_check');

        if (cached) {
          monitor.markCache(true, cacheTime);
          return cached;
        }

        monitor.markCache(false, cacheTime);

        const model = await modelQueryService
          .setMonitor(monitor)
          .getModelWithAllData(input.id, organizationId);

        if (!model) {
          throw new ORPCError('NOT_FOUND', {
            message: `Model with id '${input.id}' not found`,
          });
        }

        // Generate presigned URLs for all files in all versions
        monitor.markStart('generate_urls');
        for (const version of model.versions) {
          for (const file of version.files) {
            const storageKey = storageService.generateStorageKey({
              modelId: model.id,
              version: version.version,
              filename: file.filename,
            });
            
            // Check cache first
            const cachedUrl = await cacheService.getCachedPresignedUrl(storageKey);
            if (cachedUrl) {
              (file as any).downloadUrl = cachedUrl.url;
            } else {
              // Generate new presigned URL
              const downloadUrl = await storageService.generateDownloadUrl(storageKey);
              (file as any).downloadUrl = downloadUrl;
              
              // Cache it
              await cacheService.cachePresignedUrl(storageKey, downloadUrl, 60);
            }
          }
        }
        monitor.markEnd('generate_urls');

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
};