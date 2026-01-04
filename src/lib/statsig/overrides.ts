import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@/lib/env";

const OVERRIDES_FILE = "statsig.local.json";

type OverrideValue = boolean | string | number | Record<string, unknown>;
type Overrides = Record<string, OverrideValue>;

let cachedOverrides: Overrides | null = null;
let lastLoadAttempt = 0;
const CACHE_TTL_MS = 5000; // Reload every 5 seconds in dev

/**
 * Check if local overrides file exists
 * Only enabled in development mode
 */
export function hasLocalOverrides(): boolean {
  if (env.NODE_ENV === "production") {
    return false;
  }

  return existsSync(getOverridesPath());
}

/**
 * Get local overrides from statsig.local.json
 * Returns empty object if file doesn't exist or is invalid
 */
export function getLocalOverrides(): Overrides {
  if (env.NODE_ENV === "production") {
    return {};
  }

  const now = Date.now();

  // Use cache if fresh
  if (cachedOverrides !== null && now - lastLoadAttempt < CACHE_TTL_MS) {
    return cachedOverrides;
  }

  lastLoadAttempt = now;

  try {
    const filePath = getOverridesPath();

    if (!existsSync(filePath)) {
      cachedOverrides = {};
      return cachedOverrides;
    }

    const content = readFileSync(filePath, "utf-8");
    cachedOverrides = JSON.parse(content) as Overrides;

    return cachedOverrides;
  } catch (error) {
    console.warn("[Statsig] Failed to load local overrides:", error);
    cachedOverrides = {};
    return cachedOverrides;
  }
}

/**
 * Get a specific override value
 */
export function getOverride<T extends OverrideValue>(key: string, defaultValue: T): T {
  const overrides = getLocalOverrides();

  if (key in overrides) {
    return overrides[key] as T;
  }

  return defaultValue;
}

/**
 * Clear the override cache (useful for testing or after file changes)
 *
 * The override cache has a TTL of 5 seconds. Call this function to:
 * - Force immediate cache refresh
 * - Reset cache state in tests
 * - Manually invalidate after external file changes
 *
 * Note: In typical development, the TTL handles automatic refresh.
 * Use this for testing or programmatic cache control.
 */
export function clearOverrideCache(): void {
  cachedOverrides = null;
  lastLoadAttempt = 0;
}

/**
 * Get the path to the overrides file
 */
function getOverridesPath(): string {
  // Look for file in project root
  return join(process.cwd(), OVERRIDES_FILE);
}
