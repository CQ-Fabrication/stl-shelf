import type { RouterClient } from "@orpc/server";
import { modelsRouter } from "./models";

export const appRouter = {
  models: modelsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
