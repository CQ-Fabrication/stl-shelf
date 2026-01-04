import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema/auth";

export type AuthenticatedContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  organizationId: string;
  userId: string;
  memberRole: string;
  ipAddress: string | null;
};

/**
 * Auth middleware for protected server functions
 * Validates session and organization membership
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const headers = request?.headers;

  if (!headers) {
    throw new Error("Request headers not available");
  }

  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) {
    throw new Error("No active organization");
  }

  // SECURITY: Verify user is actually a member of this organization
  const [membership] = await db
    .select({ id: member.id, role: member.role })
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  // Get IP address from headers
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;

  return next({
    context: {
      session,
      organizationId,
      userId: session.user.id,
      memberRole: membership.role,
      ipAddress,
    } satisfies AuthenticatedContext,
  });
});
