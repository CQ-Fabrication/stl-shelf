import * as Sentry from "@sentry/bun";
import { env } from "@/lib/env";

type ErrorContext = Record<string, unknown>;

let initialized = false;
const hasBunRuntime = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

const initServerErrorTracking = () => {
  if (initialized) return;
  if (!env.SENTRY_DSN || !hasBunRuntime) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
  initialized = true;
};

export const captureServerException = (error: unknown, context?: ErrorContext) => {
  if (!env.SENTRY_DSN || !hasBunRuntime) return;
  initServerErrorTracking();
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
