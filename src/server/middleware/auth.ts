import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema/auth";
import { legalDocuments, userConsents } from "@/lib/db/schema/consent";

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

  // Check consent validity
  const [consent] = await db
    .select({
      termsPrivacyAccepted: userConsents.termsPrivacyAccepted,
      termsPrivacyVersion: userConsents.termsPrivacyVersion,
    })
    .from(userConsents)
    .where(eq(userConsents.userId, session.user.id))
    .limit(1);

  // Get latest T&C version
  const [latestDoc] = await db
    .select({ version: legalDocuments.version })
    .from(legalDocuments)
    .where(eq(legalDocuments.type, "terms_and_conditions"))
    .orderBy(desc(legalDocuments.publishedAt))
    .limit(1);

  // If consent exists and is valid, or if there's no legal document yet, allow access
  const consentValid =
    !latestDoc?.version || // No T&C published yet
    (consent?.termsPrivacyAccepted && consent.termsPrivacyVersion === latestDoc.version);

  if (!consentValid) {
    throw new Error("Consent required: Please accept our updated terms to continue");
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
