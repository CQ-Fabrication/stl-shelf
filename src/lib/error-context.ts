import { errorContextStore } from "@/stores/error-context.store";

/**
 * Session context passed from authenticated routes
 */
export interface SessionContext {
  userId: string | null;
  organizationId: string | null;
  subscriptionTier: string | null;
  storageUsedBytes: number | null;
  modelCount: number | null;
}

/**
 * Device context for debugging rendering/performance issues
 */
export interface DeviceContext {
  viewport: { width: number; height: number };
  memoryPressure: "normal" | "low" | "critical" | null;
  online: boolean;
}

/**
 * Enhanced error context for Sentry
 */
export interface EnhancedErrorContext {
  // Correlation
  errorId: string;
  userId: string | null;
  organizationId: string | null;
  route: string;
  timestamp: number;

  // What were they doing
  action: {
    type: string | null;
    modelId: string | null;
    fileId: string | null;
    versionId: string | null;
    metadata?: Record<string, unknown>;
  };

  // Subscription constraints
  subscription: {
    tier: string;
    storageUsedBytes: number;
    modelCount: number;
  } | null;

  // Device context
  device: DeviceContext;
}

/**
 * Get memory pressure level from Performance Memory API (Chrome only)
 */
const getMemoryPressure = (): "normal" | "low" | "critical" | null => {
  if (typeof window === "undefined") return null;

  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };

  if (!perf.memory) return null;

  const ratio = perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit;
  if (ratio > 0.9) return "critical";
  if (ratio > 0.7) return "low";
  return "normal";
};

/**
 * Get device context
 */
const getDeviceContext = (): DeviceContext => {
  if (typeof window === "undefined") {
    return {
      viewport: { width: 0, height: 0 },
      memoryPressure: null,
      online: true,
    };
  }

  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    memoryPressure: getMemoryPressure(),
    online: navigator.onLine,
  };
};

/**
 * Gather full error context for Sentry reporting
 */
export const gatherErrorContext = (
  errorId: string,
  route: string,
  session?: SessionContext | null,
): EnhancedErrorContext => {
  const { lastAction } = errorContextStore.state;

  return {
    // Correlation
    errorId,
    userId: session?.userId ?? null,
    organizationId: session?.organizationId ?? null,
    route,
    timestamp: Date.now(),

    // Action context from store
    action: {
      type: lastAction.type,
      modelId: lastAction.modelId,
      fileId: lastAction.fileId,
      versionId: lastAction.versionId,
      metadata: lastAction.metadata,
    },

    // Subscription context
    subscription: session?.subscriptionTier
      ? {
          tier: session.subscriptionTier,
          storageUsedBytes: session.storageUsedBytes ?? 0,
          modelCount: session.modelCount ?? 0,
        }
      : null,

    // Device context
    device: getDeviceContext(),
  };
};
