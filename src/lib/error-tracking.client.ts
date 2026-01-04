import * as Sentry from "@sentry/react";

type ErrorContext = Record<string, unknown>;

let initialized = false;

export const initClientErrorTracking = () => {
  if (import.meta.env.SSR) return;
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  });
  initialized = true;
};

export const captureClientException = (error: unknown, context?: ErrorContext) => {
  if (import.meta.env.SSR) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  initClientErrorTracking();
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
};
