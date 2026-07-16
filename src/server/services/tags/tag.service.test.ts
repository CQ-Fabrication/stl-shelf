// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with an in-memory Postgres (PGlite) so the real
// upsert/recount SQL is exercised — usageCount drift lived in SQL semantics,
// not in JS logic.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { models, modelTags, tags } from "@/lib/db/schema/models";
import { tagService } from "./tag.service";

const ORG = "org_1";
const MODEL_A = "00000000-0000-4000-8000-00000000000a";
const MODEL_B = "00000000-0000-4000-8000-00000000000b";

async function createSchema(): Promise<void> {
  await db.execute(sql`create table if not exists "organization" ("id" text primary key)`);
  await db.execute(sql`
    create table if not exists "models" (
      "id" uuid primary key,
      "organization_id" text not null references "organization"("id") on delete cascade,
      "name" text not null,
      "deleted_at" timestamptz,
      "updated_at" timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists "tags" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text not null references "organization"("id") on delete cascade,
      "name" text not null,
      "type_id" uuid,
      "color" text,
      "description" text,
      "usage_count" integer not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "tags_org_name_idx" unique ("organization_id", "name")
    )
  `);
  await db.execute(sql`
    create table if not exists "model_tags" (
      "id" uuid primary key default gen_random_uuid(),
      "model_id" uuid not null references "models"("id") on delete cascade,
      "tag_id" uuid not null references "tags"("id") on delete cascade,
      "created_at" timestamptz not null default now(),
      constraint "model_tags_model_tag_idx" unique ("model_id", "tag_id")
    )
  `);
}

async function getUsageCount(name: string): Promise<number | undefined> {
  const rows = await db
    .select({ usageCount: tags.usageCount })
    .from(tags)
    .where(eq(tags.name, name));
  return rows[0]?.usageCount;
}

beforeEach(async () => {
  await createSchema();
  await db.execute(sql`truncate "organization", "models", "tags", "model_tags" cascade`);
  await db.execute(sql`insert into "organization" ("id") values (${ORG})`);
  await db.execute(sql`
    insert into "models" ("id", "organization_id", "name")
    values (${MODEL_A}, ${ORG}, 'Model A'), (${MODEL_B}, ${ORG}, 'Model B')
  `);
});

describe("addTagsToModel", () => {
  it("creates new tags with usageCount 1", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
    expect(await getUsageCount("boat")).toBe(1);
  });

  it("counts one per linked model when a tag is shared", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);

    expect(await getUsageCount("benchy")).toBe(2);
  });

  it("does not inflate the count when re-adding an already linked tag", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
  });
});

describe("updateModelTags", () => {
  it("keeps counts stable on a no-op update", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);

    await tagService.updateModelTags(MODEL_A, ["benchy", "boat"], ORG);
    await tagService.updateModelTags(MODEL_A, ["benchy", "boat"], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
    expect(await getUsageCount("boat")).toBe(1);
  });

  it("decrements removed tags and increments added ones", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);

    await tagService.updateModelTags(MODEL_A, ["boat", "calibration"], ORG);

    expect(await getUsageCount("benchy")).toBe(0);
    expect(await getUsageCount("boat")).toBe(1);
    expect(await getUsageCount("calibration")).toBe(1);
  });

  it("zeroes counts when clearing all tags", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);

    await tagService.updateModelTags(MODEL_A, [], ORG);

    expect(await getUsageCount("benchy")).toBe(0);
  });

  it("does not touch counts contributed by other models", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);

    await tagService.updateModelTags(MODEL_A, [], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
  });
});

describe("removeTagsFromModel", () => {
  it("decrements only the unlinked model's contribution", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);

    await tagService.removeTagsFromModel(MODEL_A, ["benchy"], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
    expect(await getUsageCount("boat")).toBe(1);
  });
});

describe("recountTagsForModel", () => {
  it("excludes soft-deleted models from counts", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);

    await db.update(models).set({ deletedAt: new Date() }).where(eq(models.id, MODEL_A));
    await tagService.recountTagsForModel(MODEL_A);

    expect(await getUsageCount("benchy")).toBe(1);
  });

  it("restores counts when a model is undeleted", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await db.update(models).set({ deletedAt: new Date() }).where(eq(models.id, MODEL_A));
    await tagService.recountTagsForModel(MODEL_A);
    expect(await getUsageCount("benchy")).toBe(0);

    await db.update(models).set({ deletedAt: null }).where(eq(models.id, MODEL_A));
    await tagService.recountTagsForModel(MODEL_A);
    expect(await getUsageCount("benchy")).toBe(1);
  });
});

describe("backfill migration", () => {
  it("0017 recomputes drifted counts to match live links", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);
    // Simulate historical drift from the old increment-on-save behavior
    await db.update(tags).set({ usageCount: 99 }).where(eq(tags.name, "benchy"));
    await db.update(models).set({ deletedAt: new Date() }).where(eq(models.id, MODEL_B));

    const fs = await import("node:fs/promises");
    const migration = await fs.readFile(
      new URL("../../../../drizzle/0017_tag_usage_count_backfill.sql", import.meta.url),
      "utf8",
    );
    await db.execute(sql.raw(migration));

    expect(await getUsageCount("benchy")).toBe(1);
  });
});

// The FOR UPDATE locks that serialize concurrent recounts can't reproduce the
// true race here: PGlite is single-connection, so two overlapping transactions
// can't run. These assert the locked flow still yields exact counts on the
// serial path; the concurrent race is verified empirically against real
// Postgres (see the PR description).
describe("tag row locking (serial flow)", () => {
  it("keeps counts exact across add / remove / update / soft-delete", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);
    expect(await getUsageCount("benchy")).toBe(2);

    await tagService.removeTagsFromModel(MODEL_A, ["benchy"], ORG);
    expect(await getUsageCount("benchy")).toBe(1);

    await tagService.updateModelTags(MODEL_A, ["benchy"], ORG);
    expect(await getUsageCount("benchy")).toBe(2);

    await db.update(models).set({ deletedAt: new Date() }).where(eq(models.id, MODEL_B));
    await tagService.recountTagsForModel(MODEL_B);
    expect(await getUsageCount("benchy")).toBe(1);
  });

  it("addTagsToModel opens its own transaction when none is passed", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);

    expect(await getUsageCount("benchy")).toBe(1);
    expect(await getUsageCount("boat")).toBe(1);
  });
});

describe("modelTags links", () => {
  it("updateModelTags replaces the link set", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);

    await tagService.updateModelTags(MODEL_A, ["calibration"], ORG);

    const links = await db
      .select({ tagId: modelTags.tagId })
      .from(modelTags)
      .where(eq(modelTags.modelId, MODEL_A));
    expect(links).toHaveLength(1);

    const modelTagNames = await tagService.getModelTags(MODEL_A);
    expect(modelTagNames.map((t) => t.tagName)).toEqual(["calibration"]);
  });
});
