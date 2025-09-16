import type { MiddlewareHandler } from "hono";
import { auth } from "@/auth";
import type { Session } from "@/lib/context";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const session = (await auth.api.getSession({
      headers: c.req.raw.headers,
    })) as Session | null;

    if (!session?.user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const organizationId = session.session?.activeOrganizationId;
    if (!organizationId) {
      return c.json({ error: "No active organization" }, 403);
    }

    c.set("session", session);
    c.set("organizationId", organizationId);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
};
