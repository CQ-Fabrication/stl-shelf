import type { RouteConfig } from "@hono/zod-openapi";
import type { RouterClient } from "@orpc/server";
import { modelsOpenApiRoutes, modelsRouter } from "./models";

export const appRouter = {
  models: modelsRouter,
};

export const openApiRoutes: RouteConfig[] = [...modelsOpenApiRoutes];
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
