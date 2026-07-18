import { runReconciliation } from "@/server/services/metering/reconciliation";

/**
 * Bucket ↔ ledger reconciliation. Dry-run by default; --apply fixes the
 * ledger and writes a "reconciliation" snapshot. Recommended schedule: daily.
 * See docs/metering.md.
 */

type Options = {
  apply: boolean;
  driftThresholdBytes: number | undefined;
};

const parseOptions = (argv: string[]): Options => {
  let apply = false;
  let driftThresholdBytes: number | undefined;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--dry-run") {
      apply = false;
      continue;
    }

    if (arg.startsWith("--drift-threshold-bytes=")) {
      const parsed = Number.parseInt(arg.slice("--drift-threshold-bytes=".length), 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error(`Invalid --drift-threshold-bytes value: ${arg}`);
      }
      driftThresholdBytes = parsed;
      continue;
    }

    // A typo must never silently fall through to a real run.
    throw new Error(
      `Unknown argument: ${arg} (expected --apply, --dry-run, --drift-threshold-bytes=<n>)`,
    );
  }

  return { apply, driftThresholdBytes };
};

const run = async (options: Options) => {
  const summary = await runReconciliation(options);
  console.log(
    `[metering] reconcile${summary.applied ? " (APPLY)" : " (dry-run)"}: bucket=${summary.scannedObjects} ledger=${summary.ledgerLiveRows} missingInLedger=${summary.missingInLedger} ghosts=${summary.ghostLedgerRows} sizeMismatches=${summary.sizeMismatches} driftBytes=${summary.driftBytes}`,
  );
  if (!summary.applied) {
    console.log("[metering] dry-run only — no rows written. Re-run with --apply to persist.");
  }
};

run(parseOptions(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[metering] reconcile failed", error);
    process.exit(1);
  });
