import Statsig from "statsig-node";
import { env } from "@/lib/env";
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
    console.warn(
      "[Statsig] No STATSIG_SERVER_SECRET configured - running in disabled mode",
    );
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
      console.error("[Statsig] Failed to initialize:", error);
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
    console.warn(`[Statsig] Gate check failed for ${gateName}:`, error);
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
    console.warn(
      `[Statsig] Experiment fetch failed for ${experimentName}:`,
      error,
    );
    return {}; // Control variant
  }
}

/**
 * Log an event to Statsig
 * Silently fails if Statsig is unavailable (events are dropped)
 *
 * Type safety: Events with defined metadata in EventMetadata get strict typing.
 * Events without definitions accept Record<string, unknown> for flexibility.
 */
export async function logEvent<T extends EventName>(
  user: StatsigUser,
  eventName: T,
  value?: string | number,
  metadata?: T extends keyof EventMetadata ? EventMetadata[T] : Record<string, unknown>,
): Promise<void> {
  // Check if configured first (cheap check)
  if (!isStatsigConfigured()) {
    if (env.NODE_ENV === "development") {
      console.log(`[Statsig] Event (disabled):`, eventName, metadata);
    }
    return;
  }

  try {
    await initializeStatsig();

    // After init, check if actually ready (handles init errors)
    if (!isStatsigEnabled()) {
      return;
    }

    // Convert metadata to Record<string, string> as Statsig expects strings
    const stringifiedMetadata = metadata
      ? stringifyMetadata(metadata as Record<string, unknown>)
      : undefined;

    Statsig.logEvent(user, eventName, value, stringifiedMetadata);
  } catch (error) {
    console.warn(`[Statsig] Event logging failed for ${eventName}:`, error);
    // Events are dropped silently - acceptable for analytics
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
    console.warn("[Statsig] Failed to flush events:", error);
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
    console.warn("[Statsig] Shutdown failed:", error);
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
    console.log(`[Statsig] Received ${signal}, flushing events...`);
    try {
      await flushEvents();
      await shutdownStatsig();
      console.log("[Statsig] Graceful shutdown complete");
    } catch (error) {
      console.warn("[Statsig] Shutdown error:", error);
    }
  };

  // Handle common termination signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("beforeExit", () => gracefulShutdown("beforeExit"));

  shutdownHandlersRegistered = true;
}
