import { z } from 'zod';
import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '@/lib/orpc';
import { ModelMetadataSchema } from '@/types/model';
import { modelService } from '@/services/models/model.service';
import { modelVersionService } from '@/services/models/model-version.service';
import { modelQueryService } from '@/services/models/model-query.service';
import { tagService } from '@/services/tags/tag.service';
import { cacheService } from '@/services/cache';
import { storageService } from '@/services/storage';

export const modelMutations = {
  updateModelMetadata: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string().optional(),
        metadata: ModelMetadataSchema,
      })
    )
    .handler(async ({ input, context }) => {
      const { organizationId, session } = context;

      const model = await modelService.getModel(input.modelId);
      if (!model || model.organizationId !== organizationId) {
        throw new ORPCError('FORBIDDEN');
      }

      if (input.version) {
        await modelVersionService.updateModelVersion(
          input.modelId,
          input.version,
          input.metadata
        );
      } else {
        await modelService.updateModel(input.modelId, input.metadata);
      }

      if (input.metadata.tags) {
        await tagService.updateModelTags(
          input.modelId,
          input.metadata.tags,
          organizationId
        );
      }

      await cacheService.invalidateModel(input.modelId, organizationId);

      return { success: true };
    }),

  deleteModel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const { organizationId } = context;

      const model = await modelService.getModel(input.id);
      if (!model || model.organizationId !== organizationId) {
        throw new ORPCError('FORBIDDEN');
      }

      // Soft delete the model
      await modelService.deleteModel(input.id);
      
      // TODO: Implement anonymization for deleted models
      // This will be addressed in a future iteration to:
      // - Remove PII from deleted records after retention period
      // - Maintain referential integrity while protecting privacy
      // - Schedule background job for deferred anonymization

      // Note: Storage files are retained for now to support restoration
      // They will be cleaned up after the retention period expires

      await cacheService.invalidateModel(input.id, organizationId);

      return { success: true };
    }),

  deleteModelVersion: protectedProcedure
    .input(
      z.object({
        modelId: z.string(),
        version: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const { organizationId } = context;

      const model = await modelService.getModel(input.modelId);
      if (!model || model.organizationId !== organizationId) {
        throw new ORPCError('FORBIDDEN');
      }

      const fullModel = await modelQueryService.getModelWithAllData(
        input.modelId,
        organizationId
      );
      const version = fullModel?.versions.find(
        (v) => v.version === input.version
      );

      if (version) {
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

      await modelVersionService.deleteModelVersion(
        input.modelId,
        input.version
      );

      await cacheService.invalidateModel(input.modelId, organizationId);

      return { success: true };
    }),
};
