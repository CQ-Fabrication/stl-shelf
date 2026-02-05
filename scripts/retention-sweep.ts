import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { billingRetentionRunItems, billingRetentionRuns } from "@/lib/db/schema/billing";
import { enforceRetentionForOrganization } from "@/server/services/billing/retention.service";

const runSweep = async () => {
  const [run] = await db
    .insert(billingRetentionRuns)
    .values({ status: "running" })
    .returning({ id: billingRetentionRuns.id });

  if (!run?.id) {
    throw new Error("Failed to create retention run");
  }

  try {
    const orgs = await db
      .select({ id: organization.id })
      .from(organization)
      .where(isNotNull(organization.graceDeadline));

    console.log(`[retention] sweep start: ${orgs.length} org(s)`);

    let cleaned = 0;
    let deletedBytes = 0;
    let deletedModels = 0;

    for (const org of orgs) {
      const result = await enforceRetentionForOrganization(org.id);

      if (result.status === "cleanup_done") {
        cleaned += 1;
        deletedBytes += result.deletedBytes;
        deletedModels += result.deletedModelIds.length;
      }

      await db.insert(billingRetentionRunItems).values({
        runId: run.id,
        organizationId: org.id,
        status: result.status,
        deletedModels: result.deletedModelIds.length,
        deletedBytes: result.deletedBytes,
        retentionDeadline: result.retentionDeadline ?? null,
      });

      console.log(
        `[retention] org=${org.id} status=${result.status} deletedModels=${result.deletedModelIds.length} deletedBytes=${result.deletedBytes}`,
      );
    }

    await db
      .update(billingRetentionRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        totalOrganizations: orgs.length,
        cleanedOrganizations: cleaned,
        deletedModels,
        deletedBytes,
      })
      .where(eq(billingRetentionRuns.id, run.id));

    console.log(
      `[retention] sweep done: cleaned=${cleaned} deletedModels=${deletedModels} deletedBytes=${deletedBytes}`,
    );
  } catch (error) {
    await db
      .update(billingRetentionRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(billingRetentionRuns.id, run.id));

    throw error;
  }
};

runSweep()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[retention] sweep failed", error);
    process.exit(1);
  });
