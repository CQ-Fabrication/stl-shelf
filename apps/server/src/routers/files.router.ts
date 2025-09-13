import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '@/lib/orpc';
import { modelService } from '@/services/models/model.service';
import { storageService } from '@/services/storage';
import { PerformanceMonitor, measureAsync } from '@/lib/performance';

export const filesRouter = {
  getModelFile: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
        filename: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const monitor = new PerformanceMonitor('getModelFile');
      const { organizationId } = context;

      try {
        const model = await measureAsync(
          'check_ownership',
          () => modelService.getModel(input.modelId),
          monitor
        );

        if (!model || model.organizationId !== organizationId) {
          throw new ORPCError('FORBIDDEN');
        }

        monitor.markStart('generate_key');
        const storageKey = storageService.generateStorageKey({
          modelId: input.modelId,
          version: input.version,
          filename: input.filename,
        });
        monitor.markEnd('generate_key');

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
};