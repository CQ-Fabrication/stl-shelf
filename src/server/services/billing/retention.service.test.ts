// @vitest-environment node
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with an in-memory Postgres (PGlite) so the real usage
// snapshot SQL (COUNT / SUM over models → versions → files) and the retention
// sweep's queries run for real. The schema map enables db.query.organization.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { organization } = await import("@/lib/db/schema/auth");
  const { organizationAddons } = await import("@/lib/db/schema/billing");
  const { modelFiles, models, modelVersions } = await import("@/lib/db/schema/models");
  return {
    db: drizzle(new PGlite(), {
      schema: { organization, organizationAddons, modelFiles, models, modelVersions },
    }),
  };
});

// The sweep deletes object storage best-effort; nothing here asserts on it.
vi.mock("@/server/services/storage", () => ({
  storageService: {
    deleteFiles: vi.fn(async () => ({ failed: [] as string[] })),
  },
}));

// Soft-delete for real against the mocked db so post-cleanup usage snapshots
// reflect the deletions, without dragging in the full model-delete service.
vi.mock("@/server/services/models/model-delete.service", () => ({
  modelDeleteService: {
    deleteModel: vi.fn(async ({ modelId }: { modelId: string }) => {
      const { db } = await import("@/lib/db");
      const { sql: sqlTag } = await import("drizzle-orm");
      await db.execute(sqlTag`update "models" set "deleted_at" = now() where "id" = ${modelId}`);
    }),
  },
}));

import { computeEffectiveLimits } from "@/server/services/billing/addons.service";
import { SUBSCRIPTION_TIERS } from "@/lib/billing/config";
import { db } from "@/lib/db";
import { enforceRetentionForOrganization, getGraceDeadlineIfOverLimit } from "./retention.service";

const ORG = "org_1";
const GIB = 1_073_741_824;
const DAY_MS = 24 * 60 * 60 * 1000;

async function createSchema(): Promise<void> {
  await db.execute(sql`create table if not exists "organization" (
    "id" text primary key,
    "subscription_tier" text,
    "grace_deadline" timestamp,
    "current_storage" bigint,
    "current_model_count" integer
  )`);
  await db.execute(sql`create table if not exists "organization_addons" (
    "id" uuid primary key default gen_random_uuid(),
    "organization_id" text not null,
    "polar_subscription_id" text not null unique,
    "product_id" text not null,
    "addon_slug" text not null,
    "kind" text not null,
    "grant_bytes" bigint,
    "grant_seats" integer,
    "status" text not null default 'active',
    "last_event_at" timestamptz,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now()
  )`);
  await db.execute(sql`create table if not exists "models" (
    "id" uuid primary key default gen_random_uuid(),
    "organization_id" text not null,
    "created_at" timestamptz not null default now(),
    "deleted_at" timestamptz
  )`);
  await db.execute(sql`create table if not exists "model_versions" (
    "id" uuid primary key default gen_random_uuid(),
    "model_id" uuid not null,
    "thumbnail_path" text
  )`);
  await db.execute(sql`create table if not exists "model_files" (
    "id" uuid primary key default gen_random_uuid(),
    "version_id" uuid not null,
    "storage_key" text,
    "size" integer not null
  )`);
}

async function seedOrg(graceDeadline: Date | null): Promise<void> {
  await db.execute(
    sql`insert into "organization" ("id", "subscription_tier", "grace_deadline")
        values (${ORG}, 'free', ${graceDeadline})`,
  );
}

// Seed one model whose files total `fileSizes` bytes. Integer column caps a
// single file below 2 GB, so multi-GB usage is split across files. `createdAt`
// fixes the deletion order (the sweep deletes oldest first).
async function seedModel(fileSizes: number[], createdAt: Date): Promise<string> {
  const modelId = randomUUID();
  const versionId = randomUUID();
  await db.execute(
    sql`insert into "models" ("id", "organization_id", "created_at")
        values (${modelId}, ${ORG}, ${createdAt})`,
  );
  await db.execute(
    sql`insert into "model_versions" ("id", "model_id") values (${versionId}, ${modelId})`,
  );
  for (const size of fileSizes) {
    await db.execute(
      sql`insert into "model_files" ("id", "version_id", "size") values (${randomUUID()}, ${versionId}, ${size})`,
    );
  }
  return modelId;
}

async function seedStorageAddon(grantBytes: number): Promise<void> {
  await db.execute(
    sql`insert into "organization_addons"
        ("organization_id", "polar_subscription_id", "product_id", "addon_slug", "kind", "grant_bytes", "status")
        values (${ORG}, ${randomUUID()}, 'prod_storage', 'storage_test', 'storage', ${grantBytes}, 'active')`,
  );
}

// The service's `db` is typed as postgres-js drizzle (execute → RowList), but
// the mock backs it with pglite whose execute returns `{ rows }` — cast to the
// actual runtime shape.
async function queryRows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  const result = await db.execute(query);
  return (result as unknown as { rows: T[] }).rows;
}

async function aliveModelIds(): Promise<string[]> {
  const rows = await queryRows<{ id: string }>(
    sql`select "id" from "models" where "deleted_at" is null order by "created_at"`,
  );
  return rows.map((row) => row.id);
}

async function orgGraceDeadline(): Promise<Date | null> {
  const rows = await queryRows<{ grace_deadline: Date | null }>(
    sql`select "grace_deadline" from "organization" where "id" = ${ORG}`,
  );
  return rows[0]?.grace_deadline ?? null;
}

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

beforeEach(async () => {
  await createSchema();
  await db.execute(
    sql`truncate "organization", "organization_addons", "models", "model_versions", "model_files"`,
  );
});

describe("getGraceDeadlineIfOverLimit", () => {
  beforeEach(async () => {
    // 2 GB usage, over free (0.5 GB) but under free + a 1 TB add-on.
    await seedModel([GIB, GIB], daysAgo(30));
  });

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

describe("enforceRetentionForOrganization (effective limits)", () => {
  it("is a no-op when an active add-on covers the usage (over free, within effective)", async () => {
    // Grace 15 days ago → past the retention window, so the sweep WOULD act.
    await seedOrg(daysAgo(15));
    await seedStorageAddon(1024 * GIB);
    const m1 = await seedModel([GIB], daysAgo(30));
    const m2 = await seedModel([GIB], daysAgo(20));

    const result = await enforceRetentionForOrganization(ORG);

    // 2 GB usage ≤ free (0.5 GB) + 1 TB grant → nothing to clean up.
    expect(result.status).toBe("cleanup_skipped");
    expect(result.deletedModelIds).toEqual([]);
    expect(await aliveModelIds()).toEqual([m1, m2]);
    expect(await orgGraceDeadline()).toBeNull();
  });

  it("deletes down to EFFECTIVE limits and stops (not down to bare free)", async () => {
    await seedOrg(daysAgo(15));
    await seedStorageAddon(GIB); // effective storage = 0.5 GB + 1 GB = 1.5 GB
    const m1 = await seedModel([GIB], daysAgo(30));
    const m2 = await seedModel([GIB], daysAgo(20));
    const m3 = await seedModel([GIB], daysAgo(10));

    const result = await enforceRetentionForOrganization(ORG);

    // 3 GB usage: delete m1 (→ 2 GB, still over 1.5 GB), delete m2 (→ 1 GB,
    // within 1.5 GB) → STOP. Free-limit logic would have deleted m3 too.
    expect(result.status).toBe("cleanup_done");
    expect(result.deletedModelIds).toEqual([m1, m2]);
    expect(result.deletedBytes).toBe(2 * GIB);
    expect(await aliveModelIds()).toEqual([m3]);
    // 1 GB ≤ 1.5 GB effective → back within limits, grace cleared.
    expect(await orgGraceDeadline()).toBeNull();
  });

  it("behaves as before for a free org with no add-ons (regression)", async () => {
    await seedOrg(daysAgo(15));
    const m1 = await seedModel([GIB], daysAgo(30));
    const m2 = await seedModel([400_000_000], daysAgo(20));
    const m3 = await seedModel([400_000_000], daysAgo(10));

    const result = await enforceRetentionForOrganization(ORG);

    // 1.8 GB usage vs free 0.5 GB: delete m1 (→ 800 MB, over), delete m2
    // (→ 400 MB, within free) → STOP; m3 survives, exactly as before the fix.
    expect(result.status).toBe("cleanup_done");
    expect(result.deletedModelIds).toEqual([m1, m2]);
    expect(await aliveModelIds()).toEqual([m3]);
    expect(await orgGraceDeadline()).toBeNull();
  });
});
