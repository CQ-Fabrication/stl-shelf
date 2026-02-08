import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { account as accountTable, member, organization, session, user } from "@/lib/db/schema/auth";
import { accountDeletionRunItems, accountDeletionRuns } from "@/lib/db/schema/billing";
import { models } from "@/lib/db/schema/models";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";
import { sendAccountDeletionCompletedEmail } from "@/server/services/account-deletion-email.service";
import { polarService } from "@/server/services/billing/polar.service";
import { storageService } from "@/server/services/storage";

const DELETE_BATCH_SIZE = 1000;

const anonymizedEmailForUser = (userId: string) => `deleted+${userId}@deleted.stl-shelf.local`;

const deleteStorageByPrefix = async (prefix: string) => {
  let continuationToken: string | undefined;
  let deletedBytes = 0;
  let deletedCount = 0;

  while (true) {
    const {
      files,
      continuationToken: nextToken,
      isTruncated,
    } = await storageService.listFiles({
      prefix,
      limit: DELETE_BATCH_SIZE,
      continuationToken,
    });

    if (files.length > 0) {
      const sizeByKey = new Map(files.map((file) => [file.key, file.size]));
      const { deleted, failed } = await storageService.deleteFiles(files.map((file) => file.key));

      deletedCount += deleted.length;
      for (const key of deleted) {
        deletedBytes += sizeByKey.get(key) ?? 0;
      }

      if (failed.length > 0) {
        logErrorEvent("account_deletion.storage_delete_failed", {
          prefix,
          failedCount: failed.length,
          failures: failed.slice(0, 10),
        });
      }
    }

    if (!isTruncated) {
      break;
    }
    continuationToken = nextToken;
  }

  return { deletedBytes, deletedCount };
};

const getActiveOrganizationCountForUser = async (userId: string) => {
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
    .where(eq(member.userId, userId));

  return memberships.length;
};

const softDeleteUser = async (params: { userId: string; deletedAt: Date }) => {
  const { userId, deletedAt } = params;
  const [userRow] = await db
    .select({
      id: user.id,
      email: user.email,
      accountDeletionRequestedAt: user.accountDeletionRequestedAt,
      accountDeletionDeadline: user.accountDeletionDeadline,
      accountDeletionCompletedAt: user.accountDeletionCompletedAt,
      accountDeletionNoticeSentAt: user.accountDeletionNoticeSentAt,
      accountDeletionFinalNoticeSentAt: user.accountDeletionFinalNoticeSentAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userRow || userRow.accountDeletionCompletedAt) {
    return { changed: false as const, email: userRow?.email ?? null };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(session)
      .set({
        expiresAt: deletedAt,
        activeOrganizationId: null,
      })
      .where(eq(session.userId, userId));

    await tx
      .update(accountTable)
      .set({
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: null,
      })
      .where(eq(accountTable.userId, userId));

    await tx
      .update(user)
      .set({
        name: "Deleted User",
        email: anonymizedEmailForUser(userId),
        image: null,
        emailVerified: false,
        accountDeletionRequestedAt: userRow.accountDeletionRequestedAt ?? deletedAt,
        accountDeletionDeadline: userRow.accountDeletionDeadline ?? deletedAt,
        accountDeletionCanceledAt: null,
        accountDeletionCompletedAt: deletedAt,
        accountDeletionNoticeSentAt: userRow.accountDeletionNoticeSentAt ?? deletedAt,
        accountDeletionFinalNoticeSentAt: userRow.accountDeletionFinalNoticeSentAt ?? deletedAt,
      })
      .where(eq(user.id, userId));
  });

  return { changed: true as const, email: userRow.email };
};

const deleteOrganizationData = async (
  org: {
    id: string;
    name: string;
    polarCustomerId: string | null;
    accountDeletionRequestedAt: Date | null;
    accountDeletionDeadline: Date | null;
  },
  completedAt: Date,
) => {
  const storagePrefix = `${org.id}/`;
  const storageResult = await deleteStorageByPrefix(storagePrefix);

  if (org.polarCustomerId) {
    try {
      await polarService.deleteCustomer(org.polarCustomerId);
    } catch (error) {
      logErrorEvent("account_deletion.polar_customer_delete_failed", {
        organizationId: org.id,
        customerId: org.polarCustomerId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(apiKeys)
      .set({
        isActive: false,
      })
      .where(eq(apiKeys.organizationId, org.id));
    await tx
      .update(models)
      .set({
        deletedAt: completedAt,
      })
      .where(and(eq(models.organizationId, org.id), isNull(models.deletedAt)));
    await tx
      .update(session)
      .set({ activeOrganizationId: null })
      .where(eq(session.activeOrganizationId, org.id));
    await tx
      .update(organization)
      .set({
        graceDeadline: null,
        accountDeletionRequestedAt: org.accountDeletionRequestedAt ?? completedAt,
        accountDeletionDeadline: org.accountDeletionDeadline ?? completedAt,
        accountDeletionCanceledAt: null,
        accountDeletionCompletedAt: completedAt,
      })
      .where(eq(organization.id, org.id));
  });

  return storageResult;
};

const runSweep = async () => {
  const [run] = await db
    .insert(accountDeletionRuns)
    .values({ status: "running" })
    .returning({ id: accountDeletionRuns.id });

  if (!run?.id) {
    throw new Error("Failed to create account deletion run");
  }

  try {
    const now = new Date();
    const usersDue = await db
      .select({
        id: user.id,
        email: user.email,
        deadline: user.accountDeletionDeadline,
        finalNoticeSentAt: user.accountDeletionFinalNoticeSentAt,
      })
      .from(user)
      .where(
        and(
          isNotNull(user.accountDeletionDeadline),
          lte(user.accountDeletionDeadline, now),
          isNull(user.accountDeletionCanceledAt),
          isNull(user.accountDeletionCompletedAt),
        ),
      );

    console.log(`[account-deletion] sweep start: ${usersDue.length} user(s)`);

    let deletedUsers = 0;
    let deletedOrganizations = 0;
    let deletedBytes = 0;

    for (const account of usersDue) {
      const ownedOrganizations = await db
        .select({
          id: organization.id,
          name: organization.name,
          polarCustomerId: organization.polarCustomerId,
          accountDeletionRequestedAt: organization.accountDeletionRequestedAt,
          accountDeletionDeadline: organization.accountDeletionDeadline,
        })
        .from(organization)
        .where(
          and(
            eq(organization.ownerId, account.id),
            isNull(organization.accountDeletionCompletedAt),
          ),
        );

      let orgFailure = false;
      let userDeletedOrgs = 0;
      let userDeletedBytes = 0;
      let errorMessage: string | null = null;
      const impactedUserIds = new Set<string>([account.id]);

      for (const org of ownedOrganizations) {
        const orgMembers = await db
          .select({ userId: member.userId })
          .from(member)
          .where(eq(member.organizationId, org.id));
        for (const orgMember of orgMembers) {
          impactedUserIds.add(orgMember.userId);
        }

        try {
          const storageResult = await deleteOrganizationData(org, now);
          deletedOrganizations += 1;
          userDeletedOrgs += 1;
          deletedBytes += storageResult.deletedBytes;
          userDeletedBytes += storageResult.deletedBytes;
        } catch (error) {
          orgFailure = true;
          errorMessage = error instanceof Error ? error.message : "Unknown error";
          logErrorEvent("account_deletion.organization_delete_failed", {
            organizationId: org.id,
            error: errorMessage,
          });
        }
      }

      if (orgFailure) {
        await db.insert(accountDeletionRunItems).values({
          runId: run.id,
          userId: account.id,
          userEmail: account.email,
          status: "failed",
          deletedOrganizations: userDeletedOrgs,
          deletedBytes: userDeletedBytes,
          error: errorMessage ?? "Organization deletion failed",
        });

        console.log(`[account-deletion] user=${account.id} status=org_delete_failed`);
        continue;
      }

      if (account.email && account.deadline && !account.finalNoticeSentAt) {
        try {
          await sendAccountDeletionCompletedEmail({
            email: account.email,
            deletionDate: account.deadline,
          });

          await db
            .update(user)
            .set({ accountDeletionFinalNoticeSentAt: now })
            .where(eq(user.id, account.id));
        } catch (error) {
          logErrorEvent("account_deletion.email_final_failed", {
            userId: account.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      let ownerSoftDeleted = false;

      for (const userId of impactedUserIds) {
        const isOwner = userId === account.id;
        if (!isOwner) {
          const remainingOrgs = await getActiveOrganizationCountForUser(userId);
          if (remainingOrgs > 0) {
            continue;
          }
        }

        const deletionResult = await softDeleteUser({ userId, deletedAt: now });
        if (!deletionResult.changed) {
          continue;
        }

        if (isOwner) {
          ownerSoftDeleted = true;
        }

        await db.insert(accountDeletionRunItems).values({
          runId: run.id,
          userId,
          userEmail: deletionResult.email,
          status: "deleted",
          deletedOrganizations: isOwner ? userDeletedOrgs : 0,
          deletedBytes: isOwner ? userDeletedBytes : 0,
          error: null,
        });

        deletedUsers += 1;

        if (isOwner) {
          logAuditEvent("account_deletion.completed", {
            userId: account.id,
            organizationCount: ownedOrganizations.length,
          });
          console.log(`[account-deletion] user=${account.id} status=deleted`);
        } else {
          logAuditEvent("account_deletion.completed_orphaned_member", {
            triggerUserId: account.id,
            userId,
            organizationCount: 0,
          });
          console.log(`[account-deletion] user=${userId} status=deleted_orphaned`);
        }
      }

      if (!ownerSoftDeleted) {
        await db.insert(accountDeletionRunItems).values({
          runId: run.id,
          userId: account.id,
          userEmail: account.email,
          status: "failed",
          deletedOrganizations: userDeletedOrgs,
          deletedBytes: userDeletedBytes,
          error: "Owner still has active organizations; soft delete skipped",
        });

        console.log(`[account-deletion] user=${account.id} status=not_deleted_active_orgs`);
      }
    }

    await db
      .update(accountDeletionRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        totalUsers: usersDue.length,
        deletedUsers,
        deletedOrganizations,
        deletedBytes,
      })
      .where(eq(accountDeletionRuns.id, run.id));

    console.log(
      `[account-deletion] sweep done: deletedUsers=${deletedUsers} deletedOrgs=${deletedOrganizations} deletedBytes=${deletedBytes}`,
    );
  } catch (error) {
    await db
      .update(accountDeletionRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(accountDeletionRuns.id, run.id));

    throw error;
  }
};

runSweep()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[account-deletion] sweep failed", error);
    process.exit(1);
  });
