import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import { protectedProcedure } from '@/lib/orpc';
import { measureAsync, PerformanceMonitor } from '@/lib/performance';
import { cacheService } from '@/services/cache';
import { modelService } from '@/services/models/model.service';
import { modelQueryService } from '@/services/models/model-query.service';

export const modelVersions = {
  getModelVersions: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        offset: z.number().optional().default(0),
        limit: z.number().optional().default(5),
      })
    )
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModelVersions');
      const { organizationId } = context;

      try {
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
          return cached;
        }

        monitor.markCache(false, cacheTime);

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

        const result = await modelQueryService
          .setMonitor(monitor)
          .getModelVersionsPaginated(
            input.modelId,
            organizationId,
            input.offset,
            input.limit
          );

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

  getModelHistory: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .handler(() => {
      return [];
    }),
};
