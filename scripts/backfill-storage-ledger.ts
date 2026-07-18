import { db } from "@/lib/db";
import { storageObjects } from "@/lib/db/schema/metering";
import { deriveObjectAttribution, type ObjectKind, toBillableBytes } from "@/lib/metering/types";
import { storageService } from "@/server/services/storage";

/**
 * Backfill the storage_objects ledger from the live bucket.
 *
 * Pages ListObjects over the WHOLE bucket, upserts one ledger row per key from
 * object metadata (deriving org/kind/model from the key), and marks NOTHING
 * deleted — every listed object exists, so `deleted_at` stays null. Idempotent:
 * re-running upserts the same rows (ON CONFLICT storage_key). Objects created
 * after a run are picked up by the next run or by the live choke-point hook.
 *
 * DRY-RUN IS THE DEFAULT. Pass --apply to actually write rows.
 * Follows scripts/backfill-thumbnails.ts CLI/run conventions.
 */

type Options = {
  apply: boolean;
  prefix: string | null;
  limit: number | null;
};

const parseOptions = (argv: string[]): Options => {
  let apply = false;
  let prefix: string | null = null;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--dry-run") {
      // Explicit dry-run is the default; accepted so it never looks like a typo.
      apply = false;
      continue;
    }

    if (arg.startsWith("--prefix=")) {
      const value = arg.slice("--prefix=".length).trim();
      prefix = value.length > 0 ? value : null;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      limit = parsed;
      continue;
    }

    // A typo like --aply must never silently fall through to a real run.
    throw new Error(
      `Unknown argument: ${arg} (expected --apply, --dry-run, --prefix=<p>, --limit=<n>)`,
    );
  }

  return { apply, prefix, limit };
};

const runBackfill = async (options: Options) => {
  const { apply, prefix, limit } = options;

  console.log(
    `[ledger] backfill start${prefix ? ` prefix=${prefix}` : ""}${limit ? ` limit=${limit}` : ""}${apply ? " (APPLY)" : " (dry-run)"}`,
  );

  let continuationToken: string | undefined;
  let scanned = 0;
  let upserted = 0;
  let headFallbacks = 0;
  const kindCounts: Record<ObjectKind, number> = {
    source: 0,
    slicer: 0,
    artifact: 0,
    temp: 0,
    unknown: 0,
  };
  let unattributed = 0;

  do {
    const page = await storageService.listFiles({ prefix: prefix ?? undefined, continuationToken });

    for (const file of page.files) {
      if (limit !== null && scanned >= limit) {
        continuationToken = undefined;
        break;
      }
      scanned += 1;

      // ListObjectsV2 returns Size; HeadObject only when the list reports 0.
      let sizeBytes = file.size;
      if (sizeBytes === 0) {
        try {
          const meta = await storageService.getFileMetadata(file.key);
          sizeBytes = meta.size;
          headFallbacks += 1;
        } catch {
          // keep 0 — the 64 KB floor still applies for billable bytes
        }
      }

      const attribution = deriveObjectAttribution(file.key);
      kindCounts[attribution.objectKind] += 1;
      if (attribution.organizationId === null) {
        unattributed += 1;
      }

      if (!apply) {
        continue;
      }

      await db
        .insert(storageObjects)
        .values({
          storageKey: file.key,
          organizationId: attribution.organizationId,
          objectKind: attribution.objectKind,
          sizeBytes,
          billableBytes: toBillableBytes(sizeBytes),
          modelId: attribution.modelId,
        })
        .onConflictDoUpdate({
          target: storageObjects.storageKey,
          set: {
            organizationId: attribution.organizationId,
            objectKind: attribution.objectKind,
            sizeBytes,
            billableBytes: toBillableBytes(sizeBytes),
            modelId: attribution.modelId,
            deletedAt: null,
            updatedAt: new Date(),
          },
        });
      upserted += 1;
    }

    continuationToken = limit !== null && scanned >= limit ? undefined : page.continuationToken;
  } while (continuationToken);

  console.log(
    `[ledger] backfill done: scanned=${scanned} upserted=${upserted} headFallbacks=${headFallbacks} unattributed=${unattributed}`,
  );
  console.log(
    `[ledger] by kind: source=${kindCounts.source} slicer=${kindCounts.slicer} artifact=${kindCounts.artifact} temp=${kindCounts.temp} unknown=${kindCounts.unknown}`,
  );
  if (!apply) {
    console.log("[ledger] dry-run only — no rows written. Re-run with --apply to persist.");
  }
};

runBackfill(parseOptions(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[ledger] backfill failed", error);
    process.exit(1);
  });
