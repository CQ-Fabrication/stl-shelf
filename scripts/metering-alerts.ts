import { runMeteringAlerts } from "@/server/services/metering/alerts";

/**
 * Metering alerts — informational only, no side effects on accounting data.
 * Recommended schedule: daily. Exits 1 when any alert fires so schedulers can
 * notice. See docs/metering.md.
 */

type Options = {
  providerStorageTbh: number | undefined;
  providerEgressTb: number | undefined;
};

const parseNumberArg = (arg: string, prefix: string): number => {
  const parsed = Number.parseFloat(arg.slice(prefix.length));
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid ${prefix} value: ${arg}`);
  }
  return parsed;
};

const parseOptions = (argv: string[]): Options => {
  let providerStorageTbh: number | undefined;
  let providerEgressTb: number | undefined;

  for (const arg of argv) {
    if (arg.startsWith("--provider-storage-tbh=")) {
      providerStorageTbh = parseNumberArg(arg, "--provider-storage-tbh=");
      continue;
    }
    if (arg.startsWith("--provider-egress-tb=")) {
      providerEgressTb = parseNumberArg(arg, "--provider-egress-tb=");
      continue;
    }
    throw new Error(
      `Unknown argument: ${arg} (expected --provider-storage-tbh=<n>, --provider-egress-tb=<n>)`,
    );
  }

  return { providerStorageTbh, providerEgressTb };
};

const run = async (options: Options) => {
  const { alerts } = await runMeteringAlerts(options);

  if (alerts.length === 0) {
    console.log("[metering] alerts: none");
    return;
  }

  console.log(`[metering] alerts: ${alerts.length} fired`);
  for (const alert of alerts) {
    console.log(`  [${alert.kind}] ${alert.message}`);
  }
  process.exit(1);
};

run(parseOptions(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[metering] alerts failed", error);
    process.exit(1);
  });
