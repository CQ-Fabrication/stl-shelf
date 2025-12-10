import type { Context } from "hono";
import type { Auth } from "@/auth";
import type { BaseContext, Session } from "@/lib/context";

/**
 * Create base context for RPC handlers
 * @param c - Hono context
 * @param auth - Better Auth instance (created per-request with Hyperdrive)
 */
export async function createBaseContext(
  c: Context,
  auth: Auth
): Promise<BaseContext> {
  const ipAddress = extractClientIp(c);

  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    return {
      session: (sessionData as Session | null) ?? null,
      ipAddress,
    };
  } catch {
    return {
      session: null,
      ipAddress,
    };
  }
}

export function extractClientIp(c: Context): string | null {
  const forwarded = c.req.header("x-forwarded-for");
  const candidates = [
    c.req.header("cf-connecting-ip"),
    c.req.header("x-real-ip"),
    forwarded ? forwarded.split(",")[0]?.trim() : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}
