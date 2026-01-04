import Statsig from "statsig-node";
import { env } from "@/lib/env";
import { logDebugEvent, logErrorEvent } from "@/lib/logging";
import type {
  EventMetadata,
  EventName,
  ExperimentName,
  FeatureGateName,
  StatsigUser,
} from "./types";
import { getLocalOverrides, hasLocalOverrides } from "./overrides";

type InitState = "pending" | "initializing" | "ready" | "disabled" | "error";

let initState: InitState = "pending";
let initializationPromise: Promise<void> | null = null;
let shutdownHandlersRegistered = false;

/**
 * Initialize Statsig SDK (lazy singleton)
 * Safe to call multiple times - only initializes once
 * Uses proper locking to prevent race conditions
 */
export async function initializeStatsig(): Promise<void> {
  // Already initialized successfully
  if (initState === "ready" || initState === "disabled") return;

  // Already have an initialization in progress - wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Check if configured before starting initialization
  const serverSecret = env.STATSIG_SERVER_SECRET;
  if (!serverSecret) {
    if (env.NODE_ENV === "development") {
      logDebugEvent("Statsig disabled (no secret configured)", {
        component: "statsig",
      });
    }
    initState = "disabled";
    return;
  }

  // Mark as initializing and create promise SYNCHRONOUSLY to prevent race
  initState = "initializing";
  initializationPromise = (async () => {
    try {
      await Statsig.initialize(serverSecret, {
        environment: {
          tier:
            env.NODE_ENV === "production"
              ? "production"
              : env.NODE_ENV === "test"
                ? "staging"
                : "development",
        },
      });
      initState = "ready";
      console.log("[Statsig] Initialized successfully");

      // Register shutdown handlers once on successful initialization
      registerShutdownHandlers();
    } catch (error) {
      logErrorEvent("Statsig initialization failed", {
        error: error instanceof Error ? error.message : String(error),
        component: "statsig",
      });
      initState = "error";
      // Clear promise so next call can retry
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Check if Statsig is properly configured and ready
 */
export function isStatsigEnabled(): boolean {
  return initState === "ready";
}

/**
 * Check if Statsig is configured (has secret) but may not be initialized yet
 */
export function isStatsigConfigured(): boolean {
  return Boolean(env.STATSIG_SERVER_SECRET);
}

/**
 * Check a feature gate with fallback behavior
 *
 * Fallback rules (when Statsig unavailable):
 * - gate_* → false (conservative, feature off)
 * - ops_* → true (assume healthy state)
 */
export async function checkGate(
  user: StatsigUser,
  gateName: FeatureGateName,
): Promise<boolean> {
  // Check local overrides first (for development)
  if (hasLocalOverrides()) {
    const overrides = getLocalOverrides();
    if (gateName in overrides) {
      return Boolean(overrides[gateName]);
    }
  }

  if (!isStatsigEnabled()) {
    return getGateFallback(gateName);
  }

  try {
    await initializeStatsig();
    return Statsig.checkGateSync(user, gateName);
  } catch (error) {
    logDebugEvent("Statsig gate check failed", {
      gateName,
      error: error instanceof Error ? error.message : String(error),
      component: "statsig",
    });
    return getGateFallback(gateName);
  }
}

/**
 * Get experiment variant with fallback to control
 */
export async function getExperiment(
  user: StatsigUser,
  experimentName: ExperimentName,
): Promise<Record<string, unknown>> {
  // Check local overrides first
  if (hasLocalOverrides()) {
    const overrides = getLocalOverrides();
    if (experimentName in overrides) {
      const value = overrides[experimentName];
      if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
      }
      return { variant: value };
    }
  }

  if (!isStatsigEnabled()) {
    return {}; // Control variant (empty config)
  }

  try {
    await initializeStatsig();
    const experiment = Statsig.getExperimentSync(user, experimentName);
    return experiment.value;
  } catch (error) {
    logDebugEvent("Statsig experiment fetch failed", {
      experimentName,
      error: error instanceof Error ? error.message : String(error),
      component: "statsig",
    });
    return {}; // Control variant
  }
}

/**
 * Log an event to Statsig
 * Silently fails if Statsig is unavailable (events are dropped)
 *
 * Type safety: Events with defined metadata in EventMetadata get strict typing.
 * Events without definitions accept Record<string, unknown> for flexibility.
 *
 * Performance: Checks isStatsigEnabled() before awaiting init to avoid
 * unnecessary promise overhead on high-frequency events after initialization.
 */
export async function logEvent<T extends EventName>(
  user: StatsigUser,
  eventName: T,
  value?: string | number,
  metadata?: T extends keyof EventMetadata ? EventMetadata[T] : Record<string, unknown>,
): Promise<void> {
  // Fast path: check if configured first (cheap check)
  if (!isStatsigConfigured()) {
    if (env.NODE_ENV === "development") {
      console.log(`[Statsig] Event (disabled):`, eventName, metadata);
    }
    return;
  }

  // Fast path: if already initialized, skip async init check
  // This avoids promise overhead for high-frequency events
  if (isStatsigEnabled()) {
    try {
      const stringifiedMetadata = metadata
        ? stringifyMetadata(metadata as Record<string, unknown>)
        : undefined;
      Statsig.logEvent(user, eventName, value, stringifiedMetadata);
    } catch (error) {
      logDebugEvent("Statsig event logging failed", {
        eventName,
        error: error instanceof Error ? error.message : String(error),
        component: "statsig",
      });
    }
    return;
  }

  // Slow path: need to initialize first
  try {
    await initializeStatsig();

    // After init, check if actually ready (handles init errors)
    if (!isStatsigEnabled()) {
      if (env.NODE_ENV === "development") {
        logDebugEvent("Statsig event dropped (not initialized)", {
          eventName,
          component: "statsig",
        });
      }
      return;
    }

    // Convert metadata to Record<string, string> as Statsig expects strings
    const stringifiedMetadata = metadata
      ? stringifyMetadata(metadata as Record<string, unknown>)
      : undefined;

    Statsig.logEvent(user, eventName, value, stringifiedMetadata);
  } catch (error) {
    logDebugEvent("Statsig event logging failed", {
      eventName,
      error: error instanceof Error ? error.message : String(error),
      component: "statsig",
    });
  }
}

/**
 * Convert metadata values to strings for Statsig
 * Statsig expects Record<string, string> but we have numbers/booleans/arrays
 */
function stringifyMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    // Handle arrays and objects with JSON.stringify
    if (Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else if (typeof value === "object") {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Flush all pending events (call before process exit)
 */
export async function flushEvents(): Promise<void> {
  if (!isStatsigEnabled()) return;

  try {
    await Statsig.flush();
  } catch (error) {
    logDebugEvent("Statsig flush failed", {
      error: error instanceof Error ? error.message : String(error),
      component: "statsig",
    });
  }
}

/**
 * Shutdown Statsig client (call on server shutdown)
 */
export async function shutdownStatsig(): Promise<void> {
  if (initState !== "ready") return;

  try {
    await Statsig.shutdown();
    initState = "pending";
    initializationPromise = null;
  } catch (error) {
    logDebugEvent("Statsig shutdown failed", {
      error: error instanceof Error ? error.message : String(error),
      component: "statsig",
    });
  }
}

/**
 * Get fallback value for gates when Statsig is unavailable
 */
function getGateFallback(gateName: FeatureGateName): boolean {
  // ops_* gates default to true (assume healthy state)
  if (gateName.startsWith("ops_")) {
    return true;
  }
  // All other gates default to false (conservative)
  return false;
}

/**
 * Register process shutdown handlers for graceful event flushing
 * Ensures analytics events are sent before process exits
 *
 * Note: Only works in Node.js/Bun environments, not in edge/serverless runtimes
 * where these signals are not available.
 */
function registerShutdownHandlers(): void {
  // Prevent duplicate registration
  if (shutdownHandlersRegistered) return;

  // Check if we're in an environment that supports process signals
  if (typeof process === "undefined" || !process.on) {
    return;
  }

  const gracefulShutdown = async (signal: string) => {
    logDebugEvent("Statsig graceful shutdown started", {
      signal,
      component: "statsig",
    });
    try {
      await flushEvents();
      await shutdownStatsig();
    } catch (error) {
      logDebugEvent("Statsig graceful shutdown error", {
        signal,
        error: error instanceof Error ? error.message : String(error),
        component: "statsig",
      });
    }
  };

  // Handle common termination signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("beforeExit", () => gracefulShutdown("beforeExit"));

  shutdownHandlersRegistered = true;
}
