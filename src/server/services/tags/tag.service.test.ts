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
import { TagNameTakenError, tagService } from "./tag.service";

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

async function getTagId(name: string): Promise<string> {
  const [row] = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name));
  if (!row) {
    throw new Error(`tag "${name}" not found`);
  }
  return row.id;
}

async function tagExists(name: string): Promise<boolean> {
  const rows = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name));
  return rows.length > 0;
}

async function linkCountForTag(tagId: string): Promise<number> {
  const rows = await db
    .select({ modelId: modelTags.modelId })
    .from(modelTags)
    .where(eq(modelTags.tagId, tagId));
  return rows.length;
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
      .select({ tagName: tags.name })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .where(eq(modelTags.modelId, MODEL_A));
    expect(links.map((t) => t.tagName)).toEqual(["calibration"]);
  });
});

// These exercise the lock->mutate->recount flow through the manager ops on the
// serial PGlite path. As with the locking suite above, the true concurrent race
// can't run here (single connection); the FOR UPDATE serialization is verified
// empirically against real Postgres per the PR #50 lock convention.
describe("createTag", () => {
  it("normalizes the name (trim + lowercase) and starts at usageCount 0", async () => {
    const created = await tagService.createTag({ organizationId: ORG, name: "  NewTag  " });

    expect(created.name).toBe("newtag");
    expect(created.usageCount).toBe(0);
    expect(await getUsageCount("newtag")).toBe(0);
  });

  it("persists an optional color", async () => {
    const created = await tagService.createTag({
      organizationId: ORG,
      name: "colored",
      color: "#ff0000",
    });

    expect(created.color).toBe("#ff0000");
  });

  it("throws TagNameTakenError carrying the existing id on a duplicate", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const benchyId = await getTagId("benchy");

    await expect(
      tagService.createTag({ organizationId: ORG, name: "BENCHY" }),
    ).rejects.toBeInstanceOf(TagNameTakenError);

    try {
      await tagService.createTag({ organizationId: ORG, name: "benchy" });
      expect.unreachable("expected TagNameTakenError");
    } catch (error) {
      expect(error).toBeInstanceOf(TagNameTakenError);
      expect((error as TagNameTakenError).existingTagId).toBe(benchyId);
    }
  });

  it("rejects an empty name", async () => {
    await expect(tagService.createTag({ organizationId: ORG, name: "   " })).rejects.toThrow(
      "Tag name is required",
    );
  });

  it("appears in getOrgTags as an orphan with usageCount 0", async () => {
    await tagService.createTag({ organizationId: ORG, name: "fresh" });

    const rows = await tagService.getOrgTags(ORG);
    const fresh = rows.find((r) => r.name === "fresh");

    expect(fresh).toBeDefined();
    expect(fresh?.usageCount).toBe(0);
  });
});

describe("renameTag", () => {
  it("renames a tag and preserves its usageCount", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    const result = await tagService.renameTag({ tagId, newName: "boat", organizationId: ORG });

    expect(result).toEqual({ status: "renamed" });
    expect(await tagExists("benchy")).toBe(false);
    expect(await getUsageCount("boat")).toBe(1);
  });

  it("normalizes the new name (trim + lowercase)", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await tagService.renameTag({ tagId, newName: "  BOAT  ", organizationId: ORG });

    expect(await tagExists("boat")).toBe(true);
  });

  it("is a no-op when the normalized name is unchanged", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    const result = await tagService.renameTag({ tagId, newName: "BENCHY", organizationId: ORG });

    expect(result).toEqual({ status: "unchanged" });
    expect(await getUsageCount("benchy")).toBe(1);
  });

  it("throws a typed error carrying the existing tag id on collision", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["boat"], ORG);
    const benchyId = await getTagId("benchy");
    const boatId = await getTagId("boat");

    await expect(
      tagService.renameTag({ tagId: benchyId, newName: "boat", organizationId: ORG }),
    ).rejects.toBeInstanceOf(TagNameTakenError);

    // Collision is surfaced, not merged: both tags remain intact.
    expect(await tagExists("benchy")).toBe(true);
    expect(await getUsageCount("boat")).toBe(1);

    try {
      await tagService.renameTag({ tagId: benchyId, newName: "boat", organizationId: ORG });
      expect.unreachable("expected TagNameTakenError");
    } catch (error) {
      expect(error).toBeInstanceOf(TagNameTakenError);
      expect((error as TagNameTakenError).existingTagId).toBe(boatId);
    }
  });

  it("rejects an empty name", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await expect(
      tagService.renameTag({ tagId, newName: "   ", organizationId: ORG }),
    ).rejects.toThrow("Tag name is required");
  });
});

describe("mergeTags", () => {
  it("relinks disjoint models and removes the source", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["boat"], ORG);
    const benchyId = await getTagId("benchy");
    const boatId = await getTagId("boat");

    const result = await tagService.mergeTags({
      sourceTagId: benchyId,
      targetTagId: boatId,
      organizationId: ORG,
    });

    expect(result).toEqual({ modelsRelinked: 1, alreadyHadTarget: 0 });
    expect(await tagExists("benchy")).toBe(false);
    // Target now carries both models; recount is exact.
    expect(await getUsageCount("boat")).toBe(2);
    expect(await linkCountForTag(boatId)).toBe(2);
  });

  it("respects the unique index when models already have both tags", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);
    const benchyId = await getTagId("benchy");
    const boatId = await getTagId("boat");

    const result = await tagService.mergeTags({
      sourceTagId: benchyId,
      targetTagId: boatId,
      organizationId: ORG,
    });

    // MODEL_A already had boat (overlap); MODEL_B is relinked.
    expect(result).toEqual({ modelsRelinked: 1, alreadyHadTarget: 1 });
    expect(await tagExists("benchy")).toBe(false);
    expect(await getUsageCount("boat")).toBe(2);
    expect(await linkCountForTag(boatId)).toBe(2);
  });

  it("rejects merging a tag into itself", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const benchyId = await getTagId("benchy");

    await expect(
      tagService.mergeTags({ sourceTagId: benchyId, targetTagId: benchyId, organizationId: ORG }),
    ).rejects.toThrow("Cannot merge a tag into itself");
  });
});

describe("deleteTag", () => {
  it("deletes an orphan tag and reports zero affected models", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.removeTagsFromModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    const result = await tagService.deleteTag({ tagId, organizationId: ORG });

    expect(result).toEqual({ affectedModels: 0 });
    expect(await tagExists("benchy")).toBe(false);
  });

  it("cascades link removal for an in-use tag and leaves other tags untouched", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy", "boat"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);
    const benchyId = await getTagId("benchy");
    const boatId = await getTagId("boat");

    const result = await tagService.deleteTag({ tagId: benchyId, organizationId: ORG });

    expect(result).toEqual({ affectedModels: 2 });
    expect(await tagExists("benchy")).toBe(false);
    expect(await linkCountForTag(benchyId)).toBe(0);
    // Sibling tag untouched.
    expect(await getUsageCount("boat")).toBe(1);
    expect(await linkCountForTag(boatId)).toBe(1);
  });

  it("throws when the tag belongs to another org", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await expect(tagService.deleteTag({ tagId, organizationId: "org_other" })).rejects.toThrow(
      "Tag not found",
    );
    expect(await tagExists("benchy")).toBe(true);
  });
});

describe("countModelsForTag", () => {
  it("counts only non-deleted linked models", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    await tagService.addTagsToModel(MODEL_B, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    expect(await tagService.countModelsForTag(tagId)).toBe(2);

    await db.update(models).set({ deletedAt: new Date() }).where(eq(models.id, MODEL_B));
    expect(await tagService.countModelsForTag(tagId)).toBe(1);
  });
});

describe("updateTagColor", () => {
  it("sets a valid hex color", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await tagService.updateTagColor({ tagId, color: "#ff0000", organizationId: ORG });

    const [row] = await db.select({ color: tags.color }).from(tags).where(eq(tags.id, tagId));
    expect(row?.color).toBe("#ff0000");
  });

  it("rejects an invalid color format", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await expect(
      tagService.updateTagColor({ tagId, color: "red", organizationId: ORG }),
    ).rejects.toThrow("Invalid tag color");
  });

  it("is org-scoped: a wrong org cannot recolor the tag", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    const tagId = await getTagId("benchy");

    await expect(
      tagService.updateTagColor({ tagId, color: "#00ff00", organizationId: "org_other" }),
    ).rejects.toThrow("Tag not found");

    const [row] = await db.select({ color: tags.color }).from(tags).where(eq(tags.id, tagId));
    expect(row?.color).toBeNull();
  });
});

describe("getOrgTags", () => {
  it("returns all org tags including orphans, with ids", async () => {
    await tagService.addTagsToModel(MODEL_A, ["benchy"], ORG);
    // Create an orphan tag (created then unlinked -> usageCount 0).
    await tagService.addTagsToModel(MODEL_B, ["orphan"], ORG);
    await tagService.removeTagsFromModel(MODEL_B, ["orphan"], ORG);

    const rows = await tagService.getOrgTags(ORG);

    const names = rows.map((r) => r.name);
    expect(names).toContain("benchy");
    expect(names).toContain("orphan");
    expect(rows.every((r) => typeof r.id === "string" && r.id.length > 0)).toBe(true);

    const orphan = rows.find((r) => r.name === "orphan");
    expect(orphan?.usageCount).toBe(0);
  });
});
