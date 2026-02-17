import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, session as sessionTable } from "@/lib/db/schema/auth";
import { isAtLeast, type Role } from "@/lib/permissions";
import { getLiveSession } from "@/server/utils/live-session";

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
  try {
    const session = await getLiveSession(headers);
    return session;
  } catch (error) {
    console.error("Failed to get live session:", error);
    return null;
  }
});

/**
 * List organizations for the current user.
 *
 * Uses the server-side auth API which has access to the full
 * organization data including custom fields.
 */
export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await getLiveSession(headers);

  if (!session?.user?.id) {
    return { organizations: [] };
  }

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .innerJoin(
      organization,
      and(
        eq(member.organizationId, organization.id),
        isNull(organization.accountDeletionCompletedAt),
      ),
    )
    .where(eq(member.userId, session.user.id));
  const activeOrganizationIds = new Set(memberships.map((membership) => membership.organizationId));

  const result = await auth.api.listOrganizations({ headers });
  const organizations = (result ?? []).filter((org) => activeOrganizationIds.has(org.id));

  if (session.session?.id) {
    const activeOrganizationId = session.session.activeOrganizationId;
    if (activeOrganizationId && !activeOrganizationIds.has(activeOrganizationId)) {
      await db
        .update(sessionTable)
        .set({ activeOrganizationId: organizations[0]?.id ?? null })
        .where(eq(sessionTable.id, session.session.id));
    }
  }

  return { organizations };
});

/**
 * Get the active organization for the current session.
 *
 * Returns the full organization object including custom fields.
 */
export const getActiveOrganizationFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await getLiveSession(headers);
  if (!session?.session?.activeOrganizationId) {
    return null;
  }

  const result = await auth.api.getFullOrganization({ headers });
  if (!result) {
    return null;
  }

  const [liveOrganization] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(and(eq(organization.id, result.id), isNull(organization.accountDeletionCompletedAt)))
    .limit(1);

  if (!liveOrganization) {
    return null;
  }

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
    const session = await getLiveSession(headers);
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .innerJoin(
        organization,
        and(
          eq(member.organizationId, organization.id),
          isNull(organization.accountDeletionCompletedAt),
        ),
      )
      .where(
        and(eq(member.userId, session.user.id), eq(member.organizationId, data.organizationId)),
      )
      .limit(1);

    if (!membership) {
      throw new Error("Invalid organization");
    }

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
  const session = await getLiveSession(headers);

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
    .innerJoin(
      organization,
      and(
        eq(member.organizationId, organization.id),
        isNull(organization.accountDeletionCompletedAt),
      ),
    )
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

export const listUserSessionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await getLiveSession(headers);

  if (!session?.user?.id || !session.session?.id) {
    throw new Error("Unauthorized");
  }

  const sessions = await db
    .select({
      id: sessionTable.id,
      createdAt: sessionTable.createdAt,
      updatedAt: sessionTable.updatedAt,
      expiresAt: sessionTable.expiresAt,
      ipAddress: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
    })
    .from(sessionTable)
    .where(eq(sessionTable.userId, session.user.id))
    .orderBy(desc(sessionTable.updatedAt));

  return sessions.map((userSession) => ({
    ...userSession,
    isCurrent: userSession.id === session.session.id,
  }));
});

export const revokeSessionByIdFn = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }: { data: { sessionId: string } }) => {
    const headers = getRequestHeaders();
    const session = await getLiveSession(headers);

    if (!session?.user?.id || !session.session?.id) {
      throw new Error("Unauthorized");
    }

    if (data.sessionId === session.session.id) {
      throw new Error("Cannot revoke current session");
    }

    const [deletedSession] = await db
      .delete(sessionTable)
      .where(
        and(
          eq(sessionTable.id, data.sessionId),
          eq(sessionTable.userId, session.user.id),
          ne(sessionTable.id, session.session.id),
        ),
      )
      .returning({ id: sessionTable.id });

    return { success: Boolean(deletedSession) };
  });

export const revokeOtherSessionsFn = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await getLiveSession(headers);

  if (!session?.user?.id || !session.session?.id) {
    throw new Error("Unauthorized");
  }

  const revokedSessions = await db
    .delete(sessionTable)
    .where(and(eq(sessionTable.userId, session.user.id), ne(sessionTable.id, session.session.id)))
    .returning({ id: sessionTable.id });

  return { success: true, revokedCount: revokedSessions.length };
});
