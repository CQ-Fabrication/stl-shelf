import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meteringRuns } from "@/lib/db/schema/metering";
import type { MeteringJobKind } from "@/lib/metering/types";

/**
 * Run bookkeeping shared by all metering jobs: one `metering_runs` row per
 * run, running → completed|failed, with a job-specific `details` summary.
 * Gap detection ("which hourly run was skipped") reads this table.
 */
export async function withMeteringRun<T extends Record<string, unknown>>(
  jobKind: MeteringJobKind,
  job: () => Promise<T>,
): Promise<T> {
  const [run] = await db
    .insert(meteringRuns)
    .values({ jobKind })
    .returning({ id: meteringRuns.id });

  try {
    const details = await job();
    if (run) {
      await db
        .update(meteringRuns)
        .set({ status: "completed", completedAt: new Date(), details })
        .where(eq(meteringRuns.id, run.id));
    }
    return details;
  } catch (error) {
    if (run) {
      await db
        .update(meteringRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          details: { error: error instanceof Error ? error.message : "Unknown error" },
        })
        .where(eq(meteringRuns.id, run.id));
    }
    throw error;
  }
}
