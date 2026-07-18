// @vitest-environment node
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with in-memory Postgres (PGlite): the rollup
// correctness lives in SQL semantics (ON CONFLICT increments on a
// NULLS NOT DISTINCT dedup key), not in JS logic.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { db } from "@/lib/db";
import { egressDailyRollups } from "@/lib/db/schema/metering";
import type { DeliveryPath } from "@/lib/metering/types";
import {
  deliveryKindForDisposition,
  recordPresignedIssuance,
  startDelivery,
} from "./delivery-metering";

const ORG = "org_metered";

async function createSchema(): Promise<void> {
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

function sourceOf(...chunkSizes: number[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const size = chunkSizes[index];
      if (size === undefined) {
        controller.close();
        return;
      }
      index += 1;
      controller.enqueue(new Uint8Array(size));
    },
  });
}

function failingSource(chunkSizes: number[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const size = chunkSizes[index];
      if (size === undefined) {
        controller.error(new Error("storage read failed"));
        return;
      }
      index += 1;
      controller.enqueue(new Uint8Array(size));
    },
  });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return total;
    }
    total += value.byteLength;
  }
}

async function getRow(deliveryPath: DeliveryPath, deliveryKind = "file_download") {
  const rows = await db
    .select()
    .from(egressDailyRollups)
    .where(
      and(
        eq(egressDailyRollups.deliveryPath, deliveryPath),
        eq(egressDailyRollups.deliveryKind, deliveryKind),
      ),
    );
  expect(rows.length).toBeLessThanOrEqual(1);
  return rows[0];
}

beforeEach(async () => {
  await db.execute(sql`drop table if exists "egress_daily_rollups"`);
  await createSchema();
});

describe("startDelivery + wrapStream", () => {
  it("records a completed delivery with real served bytes on both segments", async () => {
    const internal = startDelivery({
      organizationId: ORG,
      deliveryKind: "file_download",
      deliveryPath: "internal_storage_to_application",
      bytesRequested: 300,
    });
    const proxy = startDelivery({
      organizationId: ORG,
      deliveryKind: "file_download",
      deliveryPath: "application_proxy",
      bytesRequested: 300,
    });

    const total = await readAll(proxy.wrapStream(internal.wrapStream(sourceOf(100, 100, 100))));
    expect(total).toBe(300);

    // Two distinct rows — one per segment — never merged into one.
    const allRows = await db.select().from(egressDailyRollups);
    expect(allRows).toHaveLength(2);

    for (const path of ["internal_storage_to_application", "application_proxy"] as const) {
      const row = await getRow(path);
      expect(Number(row?.requestsStarted)).toBe(1);
      expect(Number(row?.requestsCompleted)).toBe(1);
      expect(Number(row?.requestsAborted)).toBe(0);
      expect(Number(row?.bytesServed)).toBe(300);
      expect(Number(row?.bytesRequested)).toBe(300);
    }
  });

  it("records an abort with partial bytesServed and the missing bytesAborted", async () => {
    const meter = startDelivery({
      organizationId: ORG,
      deliveryKind: "file_download",
      deliveryPath: "application_proxy",
      bytesRequested: 300,
    });

    const reader = meter.wrapStream(sourceOf(100, 100, 100)).getReader();
    const first = await reader.read();
    expect(first.value?.byteLength).toBe(100);
    await reader.cancel("client went away");

    const row = await getRow("application_proxy");
    expect(Number(row?.requestsAborted)).toBe(1);
    expect(Number(row?.requestsCompleted)).toBe(0);
    const served = Number(row?.bytesServed);
    expect(served).toBeGreaterThan(0);
    expect(served).toBeLessThan(300);
    // served + aborted always reconstructs the requested size
    expect(served + Number(row?.bytesAborted)).toBe(300);
  });

  it("records a mid-stream storage failure as failed with partial bytes", async () => {
    const meter = startDelivery({
      organizationId: ORG,
      deliveryKind: "file_download",
      deliveryPath: "internal_storage_to_application",
      bytesRequested: 300,
    });

    await expect(readAll(meter.wrapStream(failingSource([100])))).rejects.toThrow(
      "storage read failed",
    );

    const row = await getRow("internal_storage_to_application");
    expect(Number(row?.requestsFailed)).toBe(1);
    expect(Number(row?.requestsCompleted)).toBe(0);
    expect(Number(row?.bytesServed)).toBe(100);
  });

  it("supports explicit finalize for failures before streaming starts", async () => {
    const meter = startDelivery({
      organizationId: ORG,
      deliveryKind: "print_profile",
      deliveryPath: "application_proxy",
      bytesRequested: 500,
    });
    await meter.finalize("failed");
    // Idempotent: a second finalize (e.g. from a stream event) is a no-op.
    await meter.finalize("completed");

    const row = await getRow("application_proxy", "print_profile");
    expect(Number(row?.requestsStarted)).toBe(1);
    expect(Number(row?.requestsFailed)).toBe(1);
    expect(Number(row?.requestsCompleted)).toBe(0);
  });

  it("records a Range request flag (served whole today)", async () => {
    const meter = startDelivery({
      organizationId: ORG,
      deliveryKind: "file_download",
      deliveryPath: "application_proxy",
      bytesRequested: 100,
      rangeRequested: true,
    });
    await readAll(meter.wrapStream(sourceOf(100)));

    const row = await getRow("application_proxy");
    expect(Number(row?.rangeRequests)).toBe(1);
    expect(Number(row?.bytesServed)).toBe(100);
  });

  it("accumulates same-day deliveries into one row", async () => {
    for (const size of [100, 250]) {
      const meter = startDelivery({
        organizationId: ORG,
        deliveryKind: "file_download",
        deliveryPath: "application_proxy",
        bytesRequested: size,
      });
      await readAll(meter.wrapStream(sourceOf(size)));
    }

    const row = await getRow("application_proxy");
    expect(Number(row?.requestsStarted)).toBe(2);
    expect(Number(row?.requestsCompleted)).toBe(2);
    expect(Number(row?.bytesServed)).toBe(350);
  });
});

describe("ZIP segment separation", () => {
  it("records uncompressed-in and compressed-out as distinct rows, never summed", async () => {
    // storage→app: two source files, 1000 uncompressed bytes total
    for (const size of [600, 400]) {
      const internal = startDelivery({
        organizationId: ORG,
        deliveryKind: "version_zip",
        deliveryPath: "internal_storage_to_application",
        bytesRequested: size,
      });
      await readAll(internal.wrapStream(sourceOf(size)));
    }

    // app→browser: the compressed ZIP is smaller (unknown size upfront)
    const proxy = startDelivery({
      organizationId: ORG,
      deliveryKind: "version_zip",
      deliveryPath: "application_proxy",
      bytesRequested: 0,
    });
    await readAll(proxy.wrapStream(sourceOf(400)));

    const internalRow = await getRow("internal_storage_to_application", "version_zip");
    const proxyRow = await getRow("application_proxy", "version_zip");

    expect(Number(internalRow?.bytesServed)).toBe(1000);
    expect(Number(internalRow?.requestsStarted)).toBe(2); // one per storage read
    expect(Number(proxyRow?.bytesServed)).toBe(400);
    expect(Number(proxyRow?.requestsCompleted)).toBe(1);

    // Distinct rows, and no combined 1400-byte row anywhere.
    const allRows = await db.select().from(egressDailyRollups);
    expect(allRows).toHaveLength(2);
    expect(allRows.every((row) => Number(row.bytesServed) !== 1400)).toBe(true);
  });
});

describe("recordPresignedIssuance", () => {
  it("records issuance only: started + bytesRequested, nothing served", async () => {
    await recordPresignedIssuance({
      organizationId: ORG,
      deliveryKind: "api_download",
      bytesRequested: 1234,
    });
    await recordPresignedIssuance({
      organizationId: ORG,
      deliveryKind: "api_download",
      bytesRequested: 1234,
    });

    const row = await getRow("object_storage_direct", "api_download");
    expect(Number(row?.requestsStarted)).toBe(2);
    expect(Number(row?.bytesRequested)).toBe(2468);
    expect(Number(row?.requestsCompleted)).toBe(0);
    expect(Number(row?.bytesServed)).toBe(0);
  });
});

describe("deliveryKindForDisposition", () => {
  it("maps inline to preview_inline and everything else to file_download", () => {
    expect(deliveryKindForDisposition("inline")).toBe("preview_inline");
    expect(deliveryKindForDisposition("INLINE")).toBe("preview_inline");
    expect(deliveryKindForDisposition("attachment")).toBe("file_download");
    expect(deliveryKindForDisposition(null)).toBe("file_download");
  });
});
