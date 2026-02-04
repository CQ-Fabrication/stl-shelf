import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getAccountDeletionDeadline } from "@/lib/account-deletion";
import { db } from "@/lib/db";
import { organization, user } from "@/lib/db/schema/auth";
import { env } from "@/lib/env";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";
import { authMiddleware, type AuthenticatedContext } from "@/server/middleware/auth";
import { polarService } from "@/server/services/billing/polar.service";
import { sendAccountDeletionRequestedEmail } from "@/server/services/account-deletion-email.service";

const requestDeletionSchema = z.object({
  password: z.string().min(1),
});

const getOwnedOrganizations = async (userId: string) => {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      subscriptionId: organization.subscriptionId,
      polarCustomerId: organization.polarCustomerId,
    })
    .from(organization)
    .where(eq(organization.ownerId, userId));
};

export const getAccountDeletionStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const [row] = await db
      .select({
        requestedAt: user.accountDeletionRequestedAt,
        deadline: user.accountDeletionDeadline,
        canceledAt: user.accountDeletionCanceledAt,
        completedAt: user.accountDeletionCompletedAt,
      })
      .from(user)
      .where(eq(user.id, context.userId))
      .limit(1);

    if (!row) {
      throw new Error("User not found");
    }

    const ownedOrganizations = await getOwnedOrganizations(context.userId);

    const status = row.completedAt
      ? ("completed" as const)
      : row.canceledAt
        ? ("canceled" as const)
        : row.deadline
          ? ("scheduled" as const)
          : ("none" as const);

    return {
      status,
      requestedAt: row.requestedAt?.toISOString() ?? null,
      deadline: row.deadline?.toISOString() ?? null,
      ownedOrganizationCount: ownedOrganizations.length,
    };
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(requestDeletionSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof requestDeletionSchema>;
      context: AuthenticatedContext;
    }) => {
      const headers = getRequestHeaders();
      await auth.api.verifyPassword({
        headers,
        body: { password: data.password },
      });

      const now = new Date();
      const deadline = getAccountDeletionDeadline(now);

      const [userRow] = await db
        .select({
          email: user.email,
          accountDeletionDeadline: user.accountDeletionDeadline,
          accountDeletionCanceledAt: user.accountDeletionCanceledAt,
          accountDeletionNoticeSentAt: user.accountDeletionNoticeSentAt,
        })
        .from(user)
        .where(eq(user.id, context.userId))
        .limit(1);

      if (!userRow?.email) {
        throw new Error("User not found");
      }

      if (userRow.accountDeletionDeadline && !userRow.accountDeletionCanceledAt) {
        return {
          status: "scheduled",
          deadline: userRow.accountDeletionDeadline.toISOString(),
        };
      }

      const ownedOrganizations = await getOwnedOrganizations(context.userId);
      const ownedOrgIds = ownedOrganizations.map((org) => org.id);

      await db.transaction(async (tx) => {
        await tx
          .update(user)
          .set({
            accountDeletionRequestedAt: now,
            accountDeletionDeadline: deadline,
            accountDeletionCanceledAt: null,
            accountDeletionCompletedAt: null,
            accountDeletionFinalNoticeSentAt: null,
          })
          .where(eq(user.id, context.userId));

        if (ownedOrgIds.length > 0) {
          await tx
            .update(organization)
            .set({
              accountDeletionRequestedAt: now,
              accountDeletionDeadline: deadline,
              accountDeletionCanceledAt: null,
              accountDeletionCompletedAt: null,
            })
            .where(inArray(organization.id, ownedOrgIds));
        }
      });

      for (const org of ownedOrganizations) {
        if (!org.subscriptionId) continue;
        try {
          await polarService.revokeSubscription(org.subscriptionId);
        } catch (error) {
          logErrorEvent("billing.account_deletion.subscription_revoke_failed", {
            organizationId: org.id,
            subscriptionId: org.subscriptionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      try {
        await sendAccountDeletionRequestedEmail({
          email: userRow.email,
          deletionDate: deadline,
          manageUrl: `${env.WEB_URL}/profile`,
        });

        await db
          .update(user)
          .set({ accountDeletionNoticeSentAt: now })
          .where(eq(user.id, context.userId));
      } catch (error) {
        logErrorEvent("billing.account_deletion.email_failed", {
          userId: context.userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      logAuditEvent("account_deletion_requested", {
        userId: context.userId,
        organizationCount: ownedOrganizations.length,
      });

      return {
        status: "scheduled",
        deadline: deadline.toISOString(),
      };
    },
  );

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const now = new Date();

    const ownedOrganizations = await getOwnedOrganizations(context.userId);
    const ownedOrgIds = ownedOrganizations.map((org) => org.id);

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          accountDeletionRequestedAt: null,
          accountDeletionDeadline: null,
          accountDeletionCanceledAt: now,
          accountDeletionCompletedAt: null,
          accountDeletionNoticeSentAt: null,
          accountDeletionFinalNoticeSentAt: null,
        })
        .where(eq(user.id, context.userId));

      if (ownedOrgIds.length > 0) {
        await tx
          .update(organization)
          .set({
            accountDeletionRequestedAt: null,
            accountDeletionDeadline: null,
            accountDeletionCanceledAt: now,
            accountDeletionCompletedAt: null,
          })
          .where(inArray(organization.id, ownedOrgIds));
      }
    });

    logAuditEvent("account_deletion_canceled", {
      userId: context.userId,
      organizationCount: ownedOrganizations.length,
    });

    return { success: true };
  });
