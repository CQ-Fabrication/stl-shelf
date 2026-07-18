// @vitest-environment node
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with an in-memory Postgres (PGlite) so the real usage
// snapshot SQL (COUNT / SUM over models → versions → files) runs.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

// Retention pulls in the S3 storage client and the model-delete service at
// import time; neither is exercised by getGraceDeadlineIfOverLimit.
vi.mock("@/server/services/storage", () => ({ storageService: {} }));
vi.mock("@/server/services/models/model-delete.service", () => ({ modelDeleteService: {} }));

import { computeEffectiveLimits } from "@/server/services/billing/addons.service";
import { SUBSCRIPTION_TIERS } from "@/lib/billing/config";
import { db } from "@/lib/db";
import { getGraceDeadlineIfOverLimit } from "./retention.service";

const ORG = "org_1";
const GIB = 1_073_741_824;

async function createSchema(): Promise<void> {
  await db.execute(sql`create table if not exists "models" (
    "id" uuid primary key default gen_random_uuid(),
    "organization_id" text not null,
    "deleted_at" timestamptz
  )`);
  await db.execute(sql`create table if not exists "model_versions" (
    "id" uuid primary key default gen_random_uuid(),
    "model_id" uuid not null
  )`);
  await db.execute(sql`create table if not exists "model_files" (
    "id" uuid primary key default gen_random_uuid(),
    "version_id" uuid not null,
    "size" integer not null
  )`);
}

// Seed one model with `fileSizes` (bytes) worth of files. Integer column caps a
// single file below 2 GB, so multi-GB usage is split across files.
async function seedUsage(fileSizes: number[]): Promise<void> {
  const modelId = randomUUID();
  const versionId = randomUUID();
  await db.execute(sql`insert into "models" ("id", "organization_id") values (${modelId}, ${ORG})`);
  await db.execute(
    sql`insert into "model_versions" ("id", "model_id") values (${versionId}, ${modelId})`,
  );
  for (const size of fileSizes) {
    await db.execute(
      sql`insert into "model_files" ("id", "version_id", "size") values (${randomUUID()}, ${versionId}, ${size})`,
    );
  }
}

beforeEach(async () => {
  await createSchema();
  await db.execute(sql`truncate "models", "model_versions", "model_files"`);
  // 2 GB total usage, over free (0.5 GB) but under free + a 1 TB add-on.
  await seedUsage([GIB, GIB]);
});

describe("getGraceDeadlineIfOverLimit", () => {
  it("does NOT set a grace deadline when an active add-on covers the usage (Codex P1-2)", async () => {
    // Tier reverted to free, but a 1 TB storage add-on still grants.
    const limits = computeEffectiveLimits("free", [
      { kind: "storage", grantBytes: 1024 * GIB, grantSeats: null },
    ]);

    const grace = await getGraceDeadlineIfOverLimit(ORG, limits);
    expect(grace).toBeNull();
  });

  it("sets a grace deadline when there is no add-on (free limits, the regression)", async () => {
    // Default arg = free limits: 2 GB > 0.5 GB → over → grace.
    const graceDefault = await getGraceDeadlineIfOverLimit(ORG);
    expect(graceDefault).toBeInstanceOf(Date);

    // Explicit free effective limits (no grants) behave identically.
    const freeLimits = computeEffectiveLimits("free", []);
    const graceExplicit = await getGraceDeadlineIfOverLimit(ORG, freeLimits);
    expect(graceExplicit).toBeInstanceOf(Date);
  });

  it("sets a grace deadline when usage exceeds free + add-on grants", async () => {
    // free (0.5 GB) + 1 GB grant = 1.5 GB effective; usage is 2 GB → over.
    const limits = computeEffectiveLimits("free", [
      { kind: "storage", grantBytes: GIB, grantSeats: null },
    ]);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + GIB);

    const grace = await getGraceDeadlineIfOverLimit(ORG, limits);
    expect(grace).toBeInstanceOf(Date);
  });
});
