import { and, countDistinct, desc, eq, gte, isNull, lt, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  egressDailyRollups,
  storageHourlySnapshots,
  storageObjects,
} from "@/lib/db/schema/metering";
import { hoursInMonth, monthBounds } from "@/server/services/metering/monthly-report";

/**
 * Metering cross-checks for a month. Informational and side-effect free (reads
 * only, no run row): prints each check with its delta and exits 1 when any
 * check is out of tolerance. Recommended: monthly, BEFORE comparing with the
 * provider invoice. See docs/metering.md.
 *
 * Checks:
 *  1. ledger totals vs latest reconciliation snapshot (bucket truth) — delta %
 *  2. rollup segment consistency — proxy bytesServed must not exceed internal
 *     bytes read beyond tolerance (more out than in ⇒ double counting)
 *  3. hourly snapshot coverage ratio for the month
 */

type Options = { month: string; tolerance: number };

const previousMonth = (): string => {
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonth = new Date(firstOfThisMonth.getTime() - 1);
  return `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
};

const parseOptions = (argv: string[]): Options => {
  let month: string | null = null;
  let tolerance = 0.02;

  for (const arg of argv) {
    if (arg.startsWith("--month=")) {
      month = arg.slice("--month=".length);
      continue;
    }
    if (arg.startsWith("--tolerance=")) {
      const parsed = Number.parseFloat(arg.slice("--tolerance=".length));
      if (Number.isNaN(parsed) || parsed < 0 || parsed >= 1) {
        throw new Error(`Invalid --tolerance value: ${arg} (expected 0..1, e.g. 0.02)`);
      }
      tolerance = parsed;
      continue;
    }
    throw new Error(`Unknown argument: ${arg} (expected --month=YYYY-MM, --tolerance=<0..1>)`);
  }

  return { month: month ?? previousMonth(), tolerance };
};

const run = async ({ month, tolerance }: Options) => {
  const { start, end } = monthBounds(month);
  const hours = hoursInMonth(month);
  const failures: string[] = [];

  console.log(`[metering] verify ${month} (tolerance ${(tolerance * 100).toFixed(1)}%)`);

  // 1. Ledger vs latest reconciliation snapshot.
  const [ledger] = await db
    .select({ total: sum(storageObjects.sizeBytes) })
    .from(storageObjects)
    .where(isNull(storageObjects.deletedAt));
  const ledgerBytes = Number(ledger?.total ?? 0);

  const [latestRecon] = await db
    .select({ snapshotHour: storageHourlySnapshots.snapshotHour })
    .from(storageHourlySnapshots)
    .where(eq(storageHourlySnapshots.source, "reconciliation"))
    .orderBy(desc(storageHourlySnapshots.snapshotHour))
    .limit(1);

  if (latestRecon) {
    const [recon] = await db
      .select({ total: sum(storageHourlySnapshots.logicalBytes) })
      .from(storageHourlySnapshots)
      .where(
        and(
          eq(storageHourlySnapshots.source, "reconciliation"),
          eq(storageHourlySnapshots.snapshotHour, latestRecon.snapshotHour),
        ),
      );
    const reconBytes = Number(recon?.total ?? 0);
    const base = Math.max(ledgerBytes, reconBytes, 1);
    const delta = Math.abs(ledgerBytes - reconBytes) / base;
    const line = `ledger ${ledgerBytes} vs reconciliation ${reconBytes} bytes (@${latestRecon.snapshotHour.toISOString()}) — delta ${(delta * 100).toFixed(2)}%`;
    if (delta > tolerance) {
      failures.push(`ledger/reconciliation drift: ${line}`);
      console.log(`  [FAIL] ${line}`);
    } else {
      console.log(`  [ok]   ${line}`);
    }
  } else {
    console.log("  [skip] no reconciliation snapshot yet — run metering:reconcile --apply first");
  }

  // 2. Segment consistency for the month: served out must not exceed read in.
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const monthWhere = and(
    gte(egressDailyRollups.usageDate, startDate),
    lt(egressDailyRollups.usageDate, endDate),
  );
  const pathTotal = async (deliveryPath: string): Promise<number> => {
    const [row] = await db
      .select({ total: sum(egressDailyRollups.bytesServed) })
      .from(egressDailyRollups)
      .where(and(monthWhere, eq(egressDailyRollups.deliveryPath, deliveryPath)));
    return Number(row?.total ?? 0);
  };
  const proxyBytes = await pathTotal("application_proxy");
  const internalBytes = await pathTotal("internal_storage_to_application");
  const segmentLine = `proxy served ${proxyBytes} vs internal read ${internalBytes} bytes`;
  if (proxyBytes > internalBytes * (1 + tolerance)) {
    failures.push(`segment inconsistency (possible double count): ${segmentLine}`);
    console.log(`  [FAIL] ${segmentLine}`);
  } else {
    console.log(`  [ok]   ${segmentLine}`);
  }

  // 3. Snapshot coverage.
  const [coverage] = await db
    .select({ hoursSampled: countDistinct(storageHourlySnapshots.snapshotHour) })
    .from(storageHourlySnapshots)
    .where(
      and(
        eq(storageHourlySnapshots.source, "ledger"),
        gte(storageHourlySnapshots.snapshotHour, start),
        lt(storageHourlySnapshots.snapshotHour, end),
      ),
    );
  const hoursSampled = Number(coverage?.hoursSampled ?? 0);
  const ratio = hours > 0 ? hoursSampled / hours : 0;
  const coverageLine = `snapshot coverage ${hoursSampled}/${hours} hours (${(ratio * 100).toFixed(1)}%)`;
  if (ratio < 1 - tolerance) {
    failures.push(`insufficient snapshot coverage: ${coverageLine}`);
    console.log(`  [FAIL] ${coverageLine}`);
  } else {
    console.log(`  [ok]   ${coverageLine}`);
  }

  if (failures.length > 0) {
    console.error(`[metering] verify: ${failures.length} check(s) out of tolerance`);
    process.exit(1);
  }
  console.log("[metering] verify: all checks within tolerance");
};

run(parseOptions(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[metering] verify failed", error);
    process.exit(1);
  });
