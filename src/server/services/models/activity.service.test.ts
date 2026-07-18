// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with an in-memory Postgres (PGlite) so the real keyset
// SQL and the LEFT JOIN fallbacks are exercised end-to-end.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { activityService } from "./activity.service";

const ORG_A = "org_a";
const ORG_B = "org_b";
const USER_1 = "user_1";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

async function createSchema(): Promise<void> {
  await db.execute(sql`create table if not exists "organization" ("id" text primary key)`);
  await db.execute(sql`
    create table if not exists "user" (
      "id" text primary key,
      "name" text not null,
      "email" text not null,
      "image" text
    )
  `);
  await db.execute(sql`
    create table if not exists "models" (
      "id" uuid primary key,
      "organization_id" text not null,
      "name" text not null,
      "slug" text not null,
      "deleted_at" timestamptz
    )
  `);
  await db.execute(sql`
    create table if not exists "model_versions" (
      "id" uuid primary key,
      "model_id" uuid not null,
      "version" text not null,
      "name" text not null
    )
  `);
  await db.execute(sql`
    create table if not exists "model_file_events" (
      "id" uuid primary key default gen_random_uuid(),
      "event" text not null,
      "file_id" uuid not null,
      "version_id" uuid not null,
      "model_id" uuid not null,
      "organization_id" text not null,
      "filename" text not null,
      "original_name" text not null,
      "extension" text not null,
      "size" integer not null,
      "storage_key" text not null,
      "model_name" text,
      "version_label" text,
      "actor_id" text not null,
      "ip_address" text,
      "created_at" timestamptz not null default now()
    )
  `);
}

type EventOverrides = {
  id: string;
  organizationId?: string;
  event?: string;
  modelId?: string;
  versionId?: string;
  modelName?: string | null;
  actorId?: string;
  createdAt: string;
};

async function insertEvent(o: EventOverrides): Promise<void> {
  await db.execute(sql`
    insert into "model_file_events" (
      "id", "event", "file_id", "version_id", "model_id", "organization_id",
      "filename", "original_name", "extension", "size", "storage_key",
      "model_name", "version_label", "actor_id", "created_at"
    ) values (
      ${o.id}, ${o.event ?? "removed"}, ${NIL_UUID}, ${o.versionId ?? NIL_UUID},
      ${o.modelId ?? NIL_UUID}, ${o.organizationId ?? ORG_A},
      'part.stl', 'part.stl', 'stl', 100, 'key/part.stl',
      ${o.modelName ?? "Legacy Model"}, 'v1', ${o.actorId ?? USER_1},
      ${o.createdAt}
    )
  `);
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(async () => {
  await createSchema();
  await db.execute(
    sql`truncate "organization", "user", "models", "model_versions", "model_file_events"`,
  );
  await db.execute(sql`insert into "organization" ("id") values (${ORG_A}), (${ORG_B})`);
  await db.execute(
    sql`insert into "user" ("id", "name", "email", "image") values (${USER_1}, 'Alice', 'a@x.io', null)`,
  );
});

describe("listOrgActivity", () => {
  it("paginates in stable reverse-chron order without gaps or dups", async () => {
    // 5 events, ascending created_at; two share a timestamp to exercise the id tiebreak.
    await insertEvent({ id: uuid(1), createdAt: "2026-01-01T00:00:00.000Z" });
    await insertEvent({ id: uuid(2), createdAt: "2026-01-02T00:00:00.000Z" });
    await insertEvent({ id: uuid(3), createdAt: "2026-01-03T00:00:00.000Z" });
    await insertEvent({ id: uuid(4), createdAt: "2026-01-03T00:00:00.000Z" });
    await insertEvent({ id: uuid(5), createdAt: "2026-01-04T00:00:00.000Z" });

    const page1 = await activityService.listOrgActivity({ organizationId: ORG_A, limit: 2 });
    expect(page1.events.map((e) => e.id)).toEqual([uuid(5), uuid(4)]);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await activityService.listOrgActivity({
      organizationId: ORG_A,
      limit: 2,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.events.map((e) => e.id)).toEqual([uuid(3), uuid(2)]);

    const page3 = await activityService.listOrgActivity({
      organizationId: ORG_A,
      limit: 2,
      cursor: page2.nextCursor ?? undefined,
    });
    expect(page3.events.map((e) => e.id)).toEqual([uuid(1)]);
    expect(page3.nextCursor).toBeNull();

    // Full walk visited every event exactly once.
    const seen = [...page1.events, ...page2.events, ...page3.events].map((e) => e.id);
    expect(new Set(seen).size).toBe(5);
  });

  it("falls back to the tombstone modelName for deleted / missing models", async () => {
    // A soft-deleted model must not resolve as a live link.
    await db.execute(sql`
      insert into "models" ("id", "organization_id", "name", "slug", "deleted_at")
      values (${uuid(10)}, ${ORG_A}, 'Ghost', 'ghost', now())
    `);
    await insertEvent({
      id: uuid(11),
      modelId: uuid(10),
      modelName: "Ghost",
      createdAt: "2026-01-05T00:00:00.000Z",
    });

    const { events } = await activityService.listOrgActivity({ organizationId: ORG_A });
    expect(events[0]?.model).toBeNull();
    expect(events[0]?.modelName).toBe("Ghost");
  });

  it("resolves the live model when it still exists", async () => {
    await db.execute(sql`
      insert into "models" ("id", "organization_id", "name", "slug")
      values (${uuid(20)}, ${ORG_A}, 'Alive', 'alive')
    `);
    await insertEvent({ id: uuid(21), modelId: uuid(20), createdAt: "2026-01-06T00:00:00.000Z" });

    const { events } = await activityService.listOrgActivity({ organizationId: ORG_A });
    expect(events[0]?.model).toEqual({ id: uuid(20), name: "Alive", slug: "alive" });
  });

  it("returns a null actor when the actorId matches no user (system events)", async () => {
    await insertEvent({
      id: uuid(30),
      actorId: "system:retention",
      createdAt: "2026-01-07T00:00:00.000Z",
    });

    const { events } = await activityService.listOrgActivity({ organizationId: ORG_A });
    expect(events[0]?.actor).toBeNull();

    // A real actor still resolves.
    await insertEvent({ id: uuid(31), actorId: USER_1, createdAt: "2026-01-08T00:00:00.000Z" });
    const next = await activityService.listOrgActivity({ organizationId: ORG_A });
    expect(next.events[0]?.actor).toEqual({ id: USER_1, name: "Alice", image: null });
  });

  it("never leaks events across organizations", async () => {
    await insertEvent({
      id: uuid(40),
      organizationId: ORG_A,
      createdAt: "2026-01-09T00:00:00.000Z",
    });
    await insertEvent({
      id: uuid(41),
      organizationId: ORG_B,
      createdAt: "2026-01-10T00:00:00.000Z",
    });

    const a = await activityService.listOrgActivity({ organizationId: ORG_A });
    expect(a.events.map((e) => e.id)).toEqual([uuid(40)]);

    const b = await activityService.listOrgActivity({ organizationId: ORG_B });
    expect(b.events.map((e) => e.id)).toEqual([uuid(41)]);
  });
});
