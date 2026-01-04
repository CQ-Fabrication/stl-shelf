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

let initialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Statsig SDK (lazy singleton)
 * Safe to call multiple times - only initializes once
 */
export async function initializeStatsig(): Promise<void> {
  if (initialized) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const serverSecret = env.STATSIG_SERVER_SECRET;

    if (!serverSecret) {
      console.warn(
        "[Statsig] No STATSIG_SERVER_SECRET configured - running in disabled mode",
      );
      initialized = true;
      return;
    }

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
      initialized = true;
      console.log("[Statsig] Initialized successfully");
    } catch (error) {
      console.error("[Statsig] Failed to initialize:", error);
      initialized = true; // Mark as initialized to prevent retry loops
    }
  })();

  return initializationPromise;
}

/**
 * Check if Statsig is properly configured and initialized
 */
export function isStatsigEnabled(): boolean {
  return initialized && Boolean(env.STATSIG_SERVER_SECRET);
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
 */
export async function logEvent<T extends EventName>(
  user: StatsigUser,
  eventName: T,
  value?: string | number,
  metadata?: T extends keyof EventMetadata ? EventMetadata[T] : never,
): Promise<void> {
  if (!isStatsigEnabled()) {
    if (env.NODE_ENV === "development") {
      console.log(`[Statsig] Event (disabled):`, eventName, metadata);
    }
    return;
  }

  try {
    await initializeStatsig();
    Statsig.logEvent(
      user,
      eventName,
      value,
      metadata as Record<string, string> | undefined,
    );
  } catch (error) {
    console.warn(`[Statsig] Event logging failed for ${eventName}:`, error);
    // Events are dropped silently - acceptable for analytics
  }
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
  if (!initialized) return;

  try {
    await Statsig.shutdown();
    initialized = false;
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
