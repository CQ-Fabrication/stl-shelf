import { buildMonthlyReport } from "@/server/services/metering/monthly-report";
import { withMeteringRun } from "@/server/services/metering/metering-run";

/**
 * Monthly usage + estimated cost report. Read-only over the metering tables
 * (only writes its own metering_runs bookkeeping row). Recommended schedule:
 * monthly, after the month closes. See docs/metering.md.
 */

const previousMonth = (): string => {
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonth = new Date(firstOfThisMonth.getTime() - 1);
  return `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
};

const parseMonth = (argv: string[]): string => {
  let month: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--month=")) {
      month = arg.slice("--month=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg} (expected --month=YYYY-MM)`);
  }
  return month ?? previousMonth();
};

const eur = (value: number): string => `€${value.toFixed(4)}`;
const tb = (value: number): string => `${value.toFixed(6)} TB`;
const tbh = (value: number): string => `${value.toFixed(6)} TB-h`;

const run = async (month: string) => {
  await withMeteringRun("monthly_report", async () => {
    const report = await buildMonthlyReport(month);
    const { costs, usage, snapshotCoverage } = report;

    console.log(`\n[metering] Monthly report — ${report.month} (${report.hoursInMonth}h)`);
    console.log(
      `  pricing era: effective from ${report.pricing.effectiveFrom} (${report.pricing.currency}, VAT ${report.pricing.vat})`,
    );
    console.log(
      `  snapshot coverage: ${snapshotCoverage.hoursSampled}/${snapshotCoverage.hoursInMonth} hours sampled (${(snapshotCoverage.ratio * 100).toFixed(1)}%)`,
    );

    console.log("\n  Object Storage (stl-shelf bucket)");
    console.log(`    base fee (capped):        ${eur(costs.baseFeeEur)}`);
    console.log(
      `    storage:                  ${tbh(usage.storageTbh)} used / ${tbh(costs.includedStorageTbh)} included → overage ${tbh(costs.storageOverageTbh)} = ${eur(costs.storageOverageCostEur)}`,
    );
    console.log(
      `    direct egress (ESTIMATE): ${tb(usage.directEgressTbEstimate)} / ${tb(costs.includedObjectEgressTb)} included → overage ${tb(costs.objectEgressOverageTbEstimate)} = ${eur(costs.objectEgressOverageCostEurEstimate)} (estimate)`,
    );
    console.log(
      `    internal OS→app (free):   ${tb(report.freeTraffic.internalStorageToApplicationTb)}`,
    );
    console.log(
      `    ingress (free):           ${tb(report.freeTraffic.ingressTb)} (uploads not yet metered)`,
    );

    console.log("\n  Server");
    console.log(
      `    external egress:          ${tb(usage.proxyEgressTb)} / ${tb(costs.serverIncludedEgressTb)} included → overage ${tb(costs.serverOverageTb)} = ${eur(costs.serverOverageCostEur)}`,
    );

    console.log(`\n  TOTAL ESTIMATED COST:       ${eur(costs.totalEstimatedCostEur)} (excl. VAT)`);

    console.log(`\n  Attribution — ${report.attribution.note}`);
    for (const row of [...report.attribution.rows, report.attribution.unattributed]) {
      const name = row.organizationId ?? "(unattributed)";
      console.log(
        `    ${name}: storage ${tbh(row.storageTbh)} (${row.shareOfStorageTbhPct.toFixed(1)}%), proxy ${tb(row.egressByPath.applicationProxyTb)}, direct-est ${tb(row.egressByPath.objectStorageDirectTbEstimate)}, internal ${tb(row.egressByPath.internalStorageToApplicationTb)} | marginal ${eur(row.marginalCostEur)} | pro-rata (analytical) ${eur(row.proRataAllocationEur)}`,
      );
    }

    console.log("\n  Account caveats:");
    for (const caveat of report.accountCaveats) {
      console.log(`    - ${caveat}`);
    }
    console.log("");

    return {
      month: report.month,
      totalEstimatedCostEur: costs.totalEstimatedCostEur,
      snapshotCoverageRatio: snapshotCoverage.ratio,
    };
  });
};

run(parseMonth(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[metering] report failed", error);
    process.exit(1);
  });
