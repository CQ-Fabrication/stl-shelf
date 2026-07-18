import { runHourlySnapshot } from "@/server/services/metering/storage-snapshot";

/**
 * Hourly storage snapshot from the object ledger. Idempotent within the hour
 * (re-run upserts the same rows). Recommended schedule: hourly.
 * See docs/metering.md.
 */
const run = async () => {
  const summary = await runHourlySnapshot();
  console.log(
    `[metering] snapshot ${summary.snapshotHour}: orgs=${summary.organizations} objects=${summary.totalObjects} logical=${summary.totalLogicalBytes} billable=${summary.totalBillableBytes}`,
  );
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[metering] snapshot failed", error);
    process.exit(1);
  });
