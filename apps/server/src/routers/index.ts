import type { RouterClient } from "@orpc/server";

export const appRouter = {};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
