import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member } from "@/lib/db/schema/auth";
import { isAtLeast, type Role } from "@/lib/permissions";

/**
 * Get session on the server with proper cookie access.
 *
 * This is required for SSR because the client-side authClient
 * cannot access cookies during server-side rendering. When beforeLoad
 * runs on the server, it needs to use this server function to check
 * the session with the original request's cookies.
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session;
});

/**
 * List organizations for the current user.
 *
 * Uses the server-side auth API which has access to the full
 * organization data including custom fields.
 */
export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return { organizations: [] };
  }

  const result = await auth.api.listOrganizations({ headers });
  return { organizations: result ?? [] };
});

/**
 * Get the active organization for the current session.
 *
 * Returns the full organization object including custom fields.
 */
export const getActiveOrganizationFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const result = await auth.api.getFullOrganization({ headers });
  return result;
});

/**
 * Set active organization for the current session.
 *
 * This updates the session's activeOrganizationId so subsequent
 * requests know which organization context to use.
 */
export const setActiveOrganizationFn = createServerFn({ method: "POST" })
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    await auth.api.setActiveOrganization({
      headers,
      body: { organizationId: data.organizationId },
    });
    return { success: true };
  });

/**
 * Get current user's member role and permission flags.
 *
 * Used for route guards and UI permission checks.
 * Returns null if user is not authenticated or has no active organization.
 */
export const getMemberRoleFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return null;
  }

  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) {
    return null;
  }

  // Get member role from database
  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!membership) {
    return null;
  }

  const role = membership.role as Role;

  return {
    role,
    isOwner: role === "owner",
    isAdmin: isAtLeast(role, "admin"),
    canAccessSettings: isAtLeast(role, "admin"),
    canAccessMembers: isAtLeast(role, "admin"),
    canAccessBilling: role === "owner",
  };
});
