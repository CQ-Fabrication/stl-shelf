import * as Sentry from "@sentry/react";
import type { EnhancedErrorContext } from "@/lib/error-context";
import {
  collectHydrationDiagnostics,
  isHydrationMismatchError,
  isHydrationMismatchMessage,
} from "@/lib/error-tracking/hydration-diagnostics";

let initialized = false;

export const initClientErrorTracking = () => {
  if (import.meta.env.SSR) return;
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    beforeSend(event, hint) {
      const hasHydrationMismatch =
        isHydrationMismatchError(hint.originalException) ||
        isHydrationMismatchMessage(event.message ?? "") ||
        (event.exception?.values ?? []).some((value) =>
          isHydrationMismatchMessage(value.value ?? ""),
        );

      if (!hasHydrationMismatch) {
        return event;
      }

      const diagnostics = collectHydrationDiagnostics();
      event.tags = {
        ...event.tags,
        react_error_kind: "hydration_mismatch",
        hydration_has_extension_markers: String(diagnostics.extensionMarkers.length > 0),
        hydration_prefers_reduced_motion:
          diagnostics.prefersReducedMotion === null
            ? "unknown"
            : String(diagnostics.prefersReducedMotion),
      };
      event.extra = {
        ...event.extra,
        hydration_diagnostics: diagnostics,
      };
      event.fingerprint = [
        ...(event.fingerprint ?? ["{{ default }}"]),
        "hydration_mismatch",
        diagnostics.extensionMarkers.length > 0
          ? "with_extension_markers"
          : "without_extension_markers",
      ];

      return event;
    },
  });
  initialized = true;
};

/**
 * Set Sentry user context when user authenticates
 * Call this on login/session restore
 */
export const setSentryUser = (userId: string | null, organizationId: string | null) => {
  if (import.meta.env.SSR) return;
  initClientErrorTracking();

  if (userId) {
    Sentry.setUser({ id: userId });
    Sentry.setTag("organization_id", organizationId ?? "none");
  } else {
    Sentry.setUser(null);
    Sentry.setTag("organization_id", "none");
  }
};

/**
 * Capture client exception with enhanced context
 */
export const captureClientException = (error: unknown, context: EnhancedErrorContext) => {
  if (import.meta.env.SSR) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  initClientErrorTracking();

  Sentry.withScope((scope) => {
    // Tags for filtering in Sentry dashboard
    scope.setTag("error_id", context.errorId);
    scope.setTag("route", context.route);
    scope.setTag("action_type", context.action.type ?? "none");
    scope.setTag("subscription_tier", context.subscription?.tier ?? "none");
    scope.setTag("online", String(context.device.online));

    if (context.device.memoryPressure) {
      scope.setTag("memory_pressure", context.device.memoryPressure);
    }

    // User context
    if (context.userId) {
      scope.setUser({ id: context.userId });
      scope.setTag("organization_id", context.organizationId ?? "none");
    }

    // Extra context for debugging (visible in Sentry event details)
    // Flatten nested objects to ensure full depth is captured
    scope.setExtra("timestamp", context.timestamp);

    // Action context (flattened)
    scope.setExtra("action_type", context.action.type);
    scope.setExtra("action_modelId", context.action.modelId);
    scope.setExtra("action_fileId", context.action.fileId);
    scope.setExtra("action_versionId", context.action.versionId);
    if (context.action.metadata) {
      scope.setExtra("action_metadata", JSON.stringify(context.action.metadata));
    }

    // Subscription context (flattened)
    if (context.subscription) {
      scope.setExtra("subscription_tier", context.subscription.tier);
      scope.setExtra("subscription_storageUsedBytes", context.subscription.storageUsedBytes);
      scope.setExtra("subscription_modelCount", context.subscription.modelCount);
    }

    // Device context (flattened)
    scope.setExtra("device_viewport_width", context.device.viewport.width);
    scope.setExtra("device_viewport_height", context.device.viewport.height);
    scope.setExtra("device_memoryPressure", context.device.memoryPressure);
    scope.setExtra("device_online", context.device.online);

    Sentry.captureException(error);
  });
};
