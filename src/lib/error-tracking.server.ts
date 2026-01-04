import * as Sentry from "@sentry/bun";
import { env } from "@/lib/env";

type ErrorContext = Record<string, unknown>;

let initialized = false;

const initServerErrorTracking = () => {
  if (initialized) return;
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
  initialized = true;
};

export const captureServerException = (error: unknown, context?: ErrorContext) => {
  if (!env.SENTRY_DSN) return;
  initServerErrorTracking();
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
