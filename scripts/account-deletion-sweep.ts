import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { organization, session, user } from "@/lib/db/schema/auth";
import { accountDeletionRunItems, accountDeletionRuns } from "@/lib/db/schema/billing";
import { models } from "@/lib/db/schema/models";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";
import { sendAccountDeletionCompletedEmail } from "@/server/services/account-deletion-email.service";
import { polarService } from "@/server/services/billing/polar.service";
import { storageService } from "@/server/services/storage";

const DELETE_BATCH_SIZE = 1000;

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

const deleteOrganizationData = async (org: {
  id: string;
  name: string;
  polarCustomerId: string | null;
}) => {
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
    await tx.delete(apiKeys).where(eq(apiKeys.organizationId, org.id));
    await tx.delete(models).where(eq(models.organizationId, org.id));
    await tx
      .update(session)
      .set({ activeOrganizationId: null })
      .where(eq(session.activeOrganizationId, org.id));
    await tx.delete(organization).where(eq(organization.id, org.id));
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
        })
        .from(organization)
        .where(eq(organization.ownerId, account.id));

      let orgFailure = false;
      let userDeletedOrgs = 0;
      let userDeletedBytes = 0;
      let errorMessage: string | null = null;

      for (const org of ownedOrganizations) {
        try {
          const storageResult = await deleteOrganizationData(org);
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

      await db.insert(accountDeletionRunItems).values({
        runId: run.id,
        userId: account.id,
        userEmail: account.email,
        status: "deleted",
        deletedOrganizations: userDeletedOrgs,
        deletedBytes: userDeletedBytes,
        error: null,
      });

      await db.delete(user).where(eq(user.id, account.id));

      deletedUsers += 1;
      logAuditEvent("account_deletion.completed", {
        userId: account.id,
        organizationCount: ownedOrganizations.length,
      });

      console.log(`[account-deletion] user=${account.id} status=deleted`);
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
