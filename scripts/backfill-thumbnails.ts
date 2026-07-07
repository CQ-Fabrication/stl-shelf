import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { modelFiles, models, modelVersions } from "@/lib/db/schema/models";
import {
  recomputeThumbnailKey,
  selectThumbnailCandidate,
} from "@/server/services/models/thumbnail.service";

type Options = {
  dryRun: boolean;
  organizationId: string | null;
  limit: number | null;
};

const parseOptions = (argv: string[]): Options => {
  let dryRun = false;
  let organizationId: string | null = null;
  let limit: number | null = null;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--org=")) {
      const value = arg.slice("--org=".length).trim();
      organizationId = value.length > 0 ? value : null;
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

    // A typo like --dryrun must never silently fall through to a real run
    throw new Error(`Unknown argument: ${arg} (expected --dry-run, --org=<id>, --limit=<n>)`);
  }

  return { dryRun, organizationId, limit };
};

const runBackfill = async (options: Options) => {
  const { dryRun, organizationId, limit } = options;

  const filters = [isNull(modelVersions.thumbnailPath), isNull(models.deletedAt)];
  if (organizationId) {
    filters.push(eq(models.organizationId, organizationId));
  }

  const baseQuery = db
    .select({
      versionId: modelVersions.id,
      version: modelVersions.version,
      modelId: models.id,
      modelName: models.name,
      organizationId: models.organizationId,
    })
    .from(modelVersions)
    .innerJoin(models, eq(modelVersions.modelId, models.id))
    .where(and(...filters));

  const versions = await (limit ? baseQuery.limit(limit) : baseQuery);

  console.log(
    `[thumbnails] backfill start: ${versions.length} version(s)${organizationId ? ` org=${organizationId}` : ""}${dryRun ? " (dry-run)" : ""}`,
  );

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const version of versions) {
    scanned += 1;

    const files = await db
      .select({
        extension: modelFiles.extension,
        storageKey: modelFiles.storageKey,
      })
      .from(modelFiles)
      .where(eq(modelFiles.versionId, version.versionId));

    // Dry-run must not write anything: recomputeThumbnailKey uploads the
    // extracted 3MF preview to storage, so only inspect the candidate here.
    if (dryRun) {
      const candidate = selectThumbnailCandidate(files);
      if (!candidate) {
        skipped += 1;
        console.log(
          `[thumbnails] version=${version.versionId} model="${version.modelName}" (${version.modelId}) no-candidate`,
        );
        continue;
      }
      const source = candidate.kind === "image" ? candidate.key : candidate.storageKey;
      console.log(
        `[thumbnails] version=${version.versionId} model="${version.modelName}" (${version.modelId}) dry-run-would-derive-from ${source}`,
      );
      continue;
    }

    const key = await recomputeThumbnailKey({
      files,
      organizationId: version.organizationId,
      modelId: version.modelId,
      version: version.version,
    });

    if (!key) {
      skipped += 1;
      console.log(
        `[thumbnails] version=${version.versionId} model="${version.modelName}" (${version.modelId}) no-candidate`,
      );
      continue;
    }

    await db
      .update(modelVersions)
      .set({ thumbnailPath: key, updatedAt: new Date() })
      .where(and(eq(modelVersions.id, version.versionId), isNull(modelVersions.thumbnailPath)));

    updated += 1;
    console.log(
      `[thumbnails] version=${version.versionId} model="${version.modelName}" (${version.modelId}) updated ${key}`,
    );
  }

  console.log(
    `[thumbnails] backfill done: scanned=${scanned} updated=${updated} skipped=${skipped}`,
  );
};

runBackfill(parseOptions(process.argv.slice(2)))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[thumbnails] backfill failed", error);
    process.exit(1);
  });
