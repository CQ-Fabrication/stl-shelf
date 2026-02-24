import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, isNull } from "drizzle-orm";
import { CONSENT_REQUIRED_ERROR_MESSAGE } from "@/lib/consent-errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema/auth";
import { validateAuthenticatedConsent } from "@/server/services/consent/validate-consent";

export type AuthenticatedContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  organizationId: string;
  userId: string;
  memberRole: string;
  ipAddress: string | null;
  accountDeletionRequestedAt: Date | null;
  accountDeletionDeadline: Date | null;
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

  const [userState] = await db
    .select({
      accountDeletionRequestedAt: user.accountDeletionRequestedAt,
      accountDeletionDeadline: user.accountDeletionDeadline,
      accountDeletionCompletedAt: user.accountDeletionCompletedAt,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userState) {
    throw new Error("User not found");
  }

  if (userState.accountDeletionCompletedAt) {
    throw new Error("Account deleted");
  }

  // SECURITY: Verify user is actually a member of this organization
  const [membership] = await db
    .select({ id: member.id, role: member.role })
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
    throw new Error("Not a member of this organization");
  }

  const consentStatus = await validateAuthenticatedConsent(session.user.id);
  if (!consentStatus.valid) {
    throw new Error(CONSENT_REQUIRED_ERROR_MESSAGE);
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
      accountDeletionRequestedAt: userState.accountDeletionRequestedAt ?? null,
      accountDeletionDeadline: userState.accountDeletionDeadline ?? null,
    } satisfies AuthenticatedContext,
  });
});
