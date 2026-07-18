// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory bucket for the mocked storage service.
const { objects, getLiveSessionMock } = vi.hoisted(() => ({
  objects: new Map<string, Uint8Array>(),
  getLiveSessionMock: vi.fn(),
}));

// Schema-aware PGlite: resolvers, consumer services (relational queries) and
// metering rollups all run their REAL SQL against in-memory Postgres.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const modelsSchema = await import("@/lib/db/schema/models");
  const meteringSchema = await import("@/lib/db/schema/metering");
  const authSchema = await import("@/lib/db/schema/auth");
  return {
    db: drizzle(new PGlite(), {
      schema: { ...modelsSchema, ...meteringSchema, ...authSchema },
    }),
  };
});

vi.mock("@/server/services/storage", () => ({
  storageService: {
    getFileMetadata: vi.fn(async (key: string) => {
      const body = objects.get(key);
      if (!body) {
        throw new Error(`NoSuchKey: ${key}`);
      }
      return {
        size: body.byteLength,
        contentType: "image/png",
        etag: `etag-${key}`,
        lastModified: new Date(),
        metadata: {},
      };
    }),
    getFileStream: vi.fn(async (key: string, options: { range?: string } = {}) => {
      const body = objects.get(key);
      if (!body) {
        throw new Error(`NoSuchKey: ${key}`);
      }
      let slice = body;
      const match = options.range ? /^bytes=(\d+)-(\d+)$/.exec(options.range) : null;
      if (match) {
        slice = body.slice(Number(match[1]), Number(match[2]) + 1);
      }
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(slice);
          controller.close();
        },
      });
    }),
  },
}));

vi.mock("@/server/utils/live-session", () => ({ getLiveSession: getLiveSessionMock }));
vi.mock("@/server/utils/request-security", () => ({
  isTrustedRequestOrigin: () => true,
  crossSiteBlockedResponse: () => new Response(null, { status: 403 }),
}));
vi.mock("@/server/utils/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true }),
  getClientIp: () => "127.0.0.1",
}));

import { db } from "@/lib/db";
import { egressDailyRollups } from "@/lib/db/schema/metering";
import { Route as ProfileThumbnailRoute } from "@/routes/api/thumbnails/print-profile/$profileId";
import { Route as VersionThumbnailRoute } from "@/routes/api/thumbnails/version/$versionId";
import { modelDetailService } from "@/server/services/models/model-detail.service";
import { modelListService } from "@/server/services/models/model-list.service";
import { printProfileService } from "@/server/services/models/print-profile.service";
import {
  resolvePrintProfileThumbnailKey,
  resolveVersionThumbnailKey,
} from "./thumbnail-delivery.service";

const ORG_A = "org_a";
const ORG_B = "org_b";
const USER_1 = "user_1";
const MODEL_A = "00000000-0000-4000-8000-0000000000a0";
const MODEL_DELETED = "00000000-0000-4000-8000-0000000000d0";
const VERSION_A = "00000000-0000-4000-8000-0000000000a1";
const VERSION_NO_THUMB = "00000000-0000-4000-8000-0000000000a2";
const VERSION_DELETED = "00000000-0000-4000-8000-0000000000d1";
const FILE_A = "00000000-0000-4000-8000-0000000000f1";
const PROFILE_A = "00000000-0000-4000-8000-0000000000e1";

const THUMB_KEY = `${ORG_A}/${MODEL_A}/v1/artifacts/preview-extracted.png`;
const PROFILE_THUMB_KEY = `${ORG_A}/${MODEL_A}/v1/artifacts/profile-thumb.png`;
const THUMB_BYTES = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

type RouteHandler = (ctx: {
  request: Request;
  params: Record<string, string>;
}) => Promise<Response>;

const getHandler = (route: unknown): RouteHandler => {
  const options = (route as { options: { server: { handlers: { GET: RouteHandler } } } }).options;
  return options.server.handlers.GET;
};

const versionThumbGET = getHandler(VersionThumbnailRoute);
const profileThumbGET = getHandler(ProfileThumbnailRoute);

const request = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/thumbnails/test", { headers });

const withSession = (organizationId: string | null) => {
  getLiveSessionMock.mockResolvedValue(
    organizationId ? { session: { activeOrganizationId: organizationId } } : null,
  );
};

async function rollupRows() {
  return db.select().from(egressDailyRollups);
}

async function createSchema(): Promise<void> {
  await db.execute(sql`
    create table if not exists "user" ("id" text primary key, "name" text, "image" text)
  `);
  await db.execute(sql`
    create table if not exists "models" (
      "id" uuid primary key,
      "organization_id" text not null,
      "owner_id" text not null,
      "slug" text not null,
      "name" text not null,
      "description" text,
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
  await db.execute(sql`
    create table if not exists "model_files" (
      "id" uuid primary key,
      "version_id" uuid not null references "model_versions"("id") on delete cascade,
      "filename" text not null,
      "original_name" text not null,
      "size" bigint not null default 0,
      "mime_type" text,
      "extension" text not null default 'png',
      "storage_key" text not null,
      "storage_url" text,
      "storage_bucket" text not null default 'test'
    )
  `);
  await db.execute(sql`
    create table if not exists "print_profiles" (
      "id" uuid primary key,
      "version_id" uuid not null references "model_versions"("id") on delete cascade,
      "printer_name" text not null,
      "printer_name_normalized" text not null,
      "file_id" uuid not null references "model_files"("id") on delete cascade,
      "thumbnail_path" text,
      "slicer_type" text,
      "metadata" jsonb,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists "tags" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text not null,
      "name" text not null
    )
  `);
  await db.execute(sql`
    create table if not exists "model_tags" (
      "id" uuid primary key default gen_random_uuid(),
      "model_id" uuid not null,
      "tag_id" uuid not null
    )
  `);
  await db.execute(sql`
    create table if not exists "egress_daily_rollups" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text,
      "usage_date" date not null,
      "delivery_kind" text not null,
      "delivery_path" text not null,
      "requests_started" bigint not null default 0,
      "requests_completed" bigint not null default 0,
      "requests_aborted" bigint not null default 0,
      "requests_failed" bigint not null default 0,
      "bytes_requested" bigint not null default 0,
      "bytes_served" bigint not null default 0,
      "bytes_aborted" bigint not null default 0,
      "range_requests" bigint not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "egress_daily_rollups_dedup_idx"
        unique nulls not distinct
        ("organization_id","usage_date","delivery_kind","delivery_path")
    )
  `);
}

async function seed(): Promise<void> {
  await db.execute(sql`insert into "user" ("id", "name") values (${USER_1}, 'Test User')`);
  await db.execute(sql`
    insert into "models" ("id", "organization_id", "owner_id", "slug", "name", "current_version")
    values
      (${MODEL_A}, ${ORG_A}, ${USER_1}, 'model-a', 'Model A', 'v1'),
      (${MODEL_DELETED}, ${ORG_A}, ${USER_1}, 'model-del', 'Deleted Model', 'v1')
  `);
  await db.execute(sql`update "models" set "deleted_at" = now() where "id" = ${MODEL_DELETED}`);
  await db.execute(sql`
    insert into "model_versions" ("id", "model_id", "version", "name", "thumbnail_path")
    values
      (${VERSION_A}, ${MODEL_A}, 'v1', 'v1', ${THUMB_KEY}),
      (${VERSION_NO_THUMB}, ${MODEL_A}, 'v2', 'v2', null),
      (${VERSION_DELETED}, ${MODEL_DELETED}, 'v1', 'v1', ${THUMB_KEY})
  `);
  await db.execute(sql`
    insert into "model_files" ("id", "version_id", "filename", "original_name", "size", "storage_key")
    values (${FILE_A}, ${VERSION_A}, 'plate.3mf', 'plate.3mf', 1000, 'some-key')
  `);
  await db.execute(sql`
    insert into "print_profiles"
      ("id", "version_id", "printer_name", "printer_name_normalized", "file_id", "thumbnail_path")
    values (${PROFILE_A}, ${VERSION_A}, 'Printer', 'printer', ${FILE_A}, ${PROFILE_THUMB_KEY})
  `);

  objects.set(THUMB_KEY, THUMB_BYTES);
  objects.set(PROFILE_THUMB_KEY, new Uint8Array([9, 9, 9]));
}

beforeEach(async () => {
  vi.clearAllMocks();
  objects.clear();
  await db.execute(sql`drop table if exists "egress_daily_rollups" cascade`);
  await db.execute(sql`drop table if exists "print_profiles" cascade`);
  await db.execute(sql`drop table if exists "model_tags" cascade`);
  await db.execute(sql`drop table if exists "tags" cascade`);
  await db.execute(sql`drop table if exists "model_files" cascade`);
  await db.execute(sql`drop table if exists "model_versions" cascade`);
  await db.execute(sql`drop table if exists "models" cascade`);
  await db.execute(sql`drop table if exists "user" cascade`);
  await createSchema();
  await seed();
});

describe("cross-org denial (MANDATORY)", () => {
  it("denies org B's session access to org A's version thumbnail: 404, zero bytes metered", async () => {
    withSession(ORG_B);
    const response = await versionThumbGET({
      request: request(),
      params: { versionId: VERSION_A },
    });

    expect(response.status).toBe(404);
    // Nothing served, nothing metered — for org A or anyone.
    expect(await rollupRows()).toHaveLength(0);
  });

  it("denies org B's session access to org A's print-profile thumbnail: 404, nothing metered", async () => {
    withSession(ORG_B);
    const response = await profileThumbGET({
      request: request(),
      params: { profileId: PROFILE_A },
    });

    expect(response.status).toBe(404);
    expect(await rollupRows()).toHaveLength(0);
  });

  it("resolvers return null for the wrong org and the key for the right org", async () => {
    expect(await resolveVersionThumbnailKey(VERSION_A, ORG_B)).toBeNull();
    expect(await resolveVersionThumbnailKey(VERSION_A, ORG_A)).toBe(THUMB_KEY);
    expect(await resolvePrintProfileThumbnailKey(PROFILE_A, ORG_B)).toBeNull();
    expect(await resolvePrintProfileThumbnailKey(PROFILE_A, ORG_A)).toBe(PROFILE_THUMB_KEY);
  });
});

describe("authentication", () => {
  it("rejects unauthenticated requests with 401", async () => {
    withSession(null);
    const response = await versionThumbGET({
      request: request(),
      params: { versionId: VERSION_A },
    });
    expect(response.status).toBe(401);
    expect(await rollupRows()).toHaveLength(0);
  });
});

describe("authorized delivery", () => {
  it("serves the thumbnail with private caching headers and meters both segments", async () => {
    withSession(ORG_A);
    const response = await versionThumbGET({
      request: request(),
      params: { versionId: VERSION_A },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=86400");
    expect(response.headers.get("ETag")).toBe(`"etag-${THUMB_KEY}"`);
    const body = new Uint8Array(await response.arrayBuffer());
    expect(body).toEqual(THUMB_BYTES);

    const rows = await rollupRows();
    expect(rows).toHaveLength(2);
    const paths = rows.map((row) => row.deliveryPath).sort();
    expect(paths).toEqual(["application_proxy", "internal_storage_to_application"]);
    for (const row of rows) {
      expect(row.organizationId).toBe(ORG_A);
      expect(row.deliveryKind).toBe("thumbnail");
      expect(Number(row.bytesServed)).toBe(THUMB_BYTES.byteLength);
      expect(Number(row.requestsCompleted)).toBe(1);
    }
  });

  it("answers If-None-Match with a bodiless 304 metered as a zero-byte completed request", async () => {
    withSession(ORG_A);
    const response = await versionThumbGET({
      request: request({ "if-none-match": `"etag-${THUMB_KEY}"` }),
      params: { versionId: VERSION_A },
    });

    expect(response.status).toBe(304);
    expect(await response.arrayBuffer()).toHaveProperty("byteLength", 0);

    const rows = await rollupRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deliveryPath).toBe("application_proxy");
    expect(Number(rows[0]?.requestsCompleted)).toBe(1);
    expect(Number(rows[0]?.bytesServed)).toBe(0);
    expect(Number(rows[0]?.bytesRequested)).toBe(0);
  });

  it("serves Range requests as 206 with the correct slice and records rangeRequests", async () => {
    withSession(ORG_A);
    const response = await versionThumbGET({
      request: request({ range: "bytes=2-5" }),
      params: { versionId: VERSION_A },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 2-5/${THUMB_BYTES.byteLength}`);
    const body = new Uint8Array(await response.arrayBuffer());
    expect(body).toEqual(new Uint8Array([2, 3, 4, 5]));

    const rows = await rollupRows();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(Number(row.rangeRequests)).toBe(1);
      expect(Number(row.bytesRequested)).toBe(4);
      expect(Number(row.bytesServed)).toBe(4);
    }
  });

  it("returns 404 for a version without a thumbnail", async () => {
    withSession(ORG_A);
    const response = await versionThumbGET({
      request: request(),
      params: { versionId: VERSION_NO_THUMB },
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a soft-deleted model's thumbnail", async () => {
    withSession(ORG_A);
    const response = await versionThumbGET({
      request: request(),
      params: { versionId: VERSION_DELETED },
    });
    expect(response.status).toBe(404);
  });

  it("serves the print-profile thumbnail for the owning org", async () => {
    withSession(ORG_A);
    const response = await profileThumbGET({
      request: request(),
      params: { profileId: PROFILE_A },
    });
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(3);
  });
});

describe("consumer services emit proxy URLs (no presigned)", () => {
  it("getModelVersions returns /api/thumbnails/version/... for versions with a thumbnail", async () => {
    const versions = await modelDetailService.getModelVersions(MODEL_A, ORG_A);
    const withThumb = versions.find((version) => version.id === VERSION_A);
    const withoutThumb = versions.find((version) => version.id === VERSION_NO_THUMB);

    expect(withThumb?.thumbnailUrl).toBe(`/api/thumbnails/version/${VERSION_A}`);
    expect(withoutThumb?.thumbnailUrl).toBeNull();
  });

  it("listModels returns the current version's proxy thumbnail URL", async () => {
    const { models: list } = await modelListService.listModels({ organizationId: ORG_A });
    const modelA = list.find((model) => model.id === MODEL_A);

    expect(modelA?.thumbnailUrl).toBe(`/api/thumbnails/version/${VERSION_A}`);
  });

  it("listProfiles returns /api/thumbnails/print-profile/... URLs", async () => {
    const profiles = await printProfileService.listProfiles(VERSION_A, ORG_A);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.thumbnailUrl).toBe(`/api/thumbnails/print-profile/${PROFILE_A}`);
  });
});
