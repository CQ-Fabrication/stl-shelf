import { db, apiKeys } from "@/lib/db";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { organization } from "@/lib/db/schema/auth";

type ApiKeyValidationResult =
  | { valid: true; organizationId: string; apiKeyId: string; scopes: string[] }
  | { valid: false; error: string; status: number };

/**
 * Hash an API key for secure storage comparison
 * Uses SHA-256 for consistent hashing
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new API key
 * Returns the plain key (to show user once) and the hash (for storage)
 */
export async function generateApiKey(): Promise<{
  key: string;
  keyHash: string;
  keyPrefix: string;
}> {
  // Generate a random 32-byte key
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  // Convert to base64url format for URL-safe key
  const key = `stl_${Buffer.from(randomBytes).toString("base64url")}`;
  const keyHash = await hashApiKey(key);
  const keyPrefix = key.substring(0, 12); // "stl_" + first 8 chars

  return { key, keyHash, keyPrefix };
}

/**
 * Validate an API key from request headers
 * Expects header: X-API-Key: stl_xxxx...
 */
export async function validateApiKey(request: Request): Promise<ApiKeyValidationResult> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return {
      valid: false,
      error: "Missing API key. Include X-API-Key header.",
      status: 401,
    };
  }

  if (!apiKey.startsWith("stl_")) {
    return {
      valid: false,
      error: "Invalid API key format.",
      status: 401,
    };
  }

  try {
    const keyHash = await hashApiKey(apiKey);

    // Find the API key in database
    const [foundKey] = await db
      .select({
        id: apiKeys.id,
        organizationId: apiKeys.organizationId,
        scopes: apiKeys.scopes,
      })
      .from(apiKeys)
      .innerJoin(
        organization,
        and(
          eq(apiKeys.organizationId, organization.id),
          isNull(organization.accountDeletionCompletedAt),
        ),
      )
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.isActive, true),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
        ),
      )
      .limit(1);

    if (!foundKey) {
      return {
        valid: false,
        error: "Invalid or expired API key.",
        status: 401,
      };
    }

    // Update last used timestamp (non-blocking)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, foundKey.id))
      .catch(() => {
        // Silently ignore errors updating lastUsedAt
      });

    return {
      valid: true,
      organizationId: foundKey.organizationId,
      apiKeyId: foundKey.id,
      scopes: foundKey.scopes,
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return {
      valid: false,
      error: "Internal server error during authentication.",
      status: 500,
    };
  }
}

/**
 * Check if the API key has the required scope
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes(requiredScope) || scopes.includes("*");
}
