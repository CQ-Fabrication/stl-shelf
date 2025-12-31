import type { RouterClient } from "@orpc/server";
import { billingRouter } from "./billing";
import { modelsRouter } from "./models";

export const appRouter = {
  models: modelsRouter,
  billing: billingRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
