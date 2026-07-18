// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const modelsSchema = await import("@/lib/db/schema/models");
  return { db: drizzle(new PGlite(), { schema: { ...modelsSchema } }) };
});

vi.mock("@/server/services/storage", () => ({
  storageService: {
    generateStorageKey: vi.fn(() => "org_a/model/v1/artifacts/preview.png"),
    uploadFile: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    getFileUrl: vi.fn(() => "https://example/url"),
    defaultBucket: "test",
  },
}));

import { db } from "@/lib/db";
import { models, modelVersions } from "@/lib/db/schema/models";
import { modelFileService } from "./model-file.service";

const ORG_A = "org_a";
const MODEL_A = "00000000-0000-4000-8000-0000000000a0";
const VERSION_A = "00000000-0000-4000-8000-0000000000a1";
const OLD = new Date("2026-01-01T00:00:00.000Z");

async function createSchema(): Promise<void> {
  await db.execute(sql`
    create table if not exists "models" (
      "id" uuid primary key,
      "organization_id" text not null,
      "owner_id" text not null default 'u',
      "slug" text not null default 's',
      "name" text not null default 'n',
      "current_version" text not null default 'v1',
      "total_versions" integer not null default 1,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz
    )
  `);
  await db.execute(sql`
    create table if not exists "model_versions" (
      "id" uuid primary key,
      "model_id" uuid not null references "models"("id") on delete cascade,
      "version" text not null,
      "name" text not null,
      "description" text,
      "thumbnail_path" text,
      "print_settings" jsonb,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now()
    )
  `);
}

beforeEach(async () => {
  await db.execute(sql`drop table if exists "model_versions" cascade`);
  await db.execute(sql`drop table if exists "models" cascade`);
  await createSchema();
  await db.execute(sql`
    insert into "models" ("id", "organization_id", "updated_at")
    values (${MODEL_A}, ${ORG_A}, ${OLD.toISOString()})
  `);
  await db.execute(sql`
    insert into "model_versions" ("id", "model_id", "version", "name", "updated_at")
    values (${VERSION_A}, ${MODEL_A}, 'v1', 'v1', ${OLD.toISOString()})
  `);
});

describe("replaceVersionThumbnail", () => {
  it("bumps updatedAt on the version and the model (so the v cache-bust key changes)", async () => {
    const result = await modelFileService.replaceVersionThumbnail({
      versionId: VERSION_A,
      organizationId: ORG_A,
      image: new File([new Uint8Array([1, 2, 3])], "preview.png", { type: "image/png" }),
      extension: "png",
    });

    expect(result.success).toBe(true);

    const [version] = await db
      .select({ thumbnailPath: modelVersions.thumbnailPath, updatedAt: modelVersions.updatedAt })
      .from(modelVersions);
    expect(version?.thumbnailPath).toBe("org_a/model/v1/artifacts/preview.png");
    expect(version?.updatedAt.getTime()).toBeGreaterThan(OLD.getTime());

    const [model] = await db.select({ updatedAt: models.updatedAt }).from(models);
    expect(model?.updatedAt.getTime()).toBeGreaterThan(OLD.getTime());
  });
});
