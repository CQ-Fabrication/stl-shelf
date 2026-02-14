import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, session as sessionTable, user } from "@/lib/db/schema/auth";

export const getLiveSession = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id) {
    return null;
  }

  const [userState] = await db
    .select({ completedAt: user.accountDeletionCompletedAt })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userState || userState.completedAt) {
    return null;
  }

  const activeOrganizationId = session.session?.activeOrganizationId;
  if (!activeOrganizationId || !session.session?.id) {
    return session;
  }

  const [liveMembership] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(
      organization,
      and(
        eq(member.organizationId, organization.id),
        isNull(organization.accountDeletionCompletedAt),
      ),
    )
    .where(and(eq(member.organizationId, activeOrganizationId), eq(member.userId, session.user.id)))
    .limit(1);

  if (liveMembership) {
    return session;
  }

  await db
    .update(sessionTable)
    .set({ activeOrganizationId: null })
    .where(eq(sessionTable.id, session.session.id));

  return {
    ...session,
    session: {
      ...session.session,
      activeOrganizationId: null,
    },
  };
};
