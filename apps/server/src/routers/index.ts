import type { RouterClient } from '@orpc/server';
import { filesRouter } from './files.router';
import { healthRouter } from './health.router';
import { modelMutations } from './models/mutations';
import { modelQueries } from './models/queries';
import { modelVersions } from './models/versions';
import { tagsRouter } from './tags.router';

export const appRouter = {
  // Health
  ...healthRouter,

  // Models domain
  listModels: modelQueries.listModels,
  getModel: modelQueries.getModel,
  updateModelMetadata: modelMutations.updateModelMetadata,
  deleteModel: modelMutations.deleteModel,
  deleteModelVersion: modelMutations.deleteModelVersion,
  getModelVersions: modelVersions.getModelVersions,
  getModelHistory: modelVersions.getModelHistory,

  // Files domain
  getModelFile: filesRouter.getModelFile,

  // Tags domain
  getAllTags: tagsRouter.getAllTags,

};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
