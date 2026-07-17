// @vitest-environment node
import type { Order } from "@polar-sh/sdk/models/components/order.js";
import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Back the ledger's `db` with an in-memory Postgres (PGlite) so the real
// upsert / claim SQL runs. recordRefundedOrder uses db.query.billingOrder, so
// drizzle() must receive the { schema } option keyed by billingOrder.
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/lib/db/schema/billing");
  return {
    db: drizzle(new PGlite(), { schema: { billingOrder: schema.billingOrder } }),
    billingOrder: schema.billingOrder,
  };
});

vi.mock("@/lib/openpanel", () => ({ trackRevenue: vi.fn(), trackRefund: vi.fn() }));

import { billingOrder, db } from "@/lib/db";
import { trackRefund, trackRevenue } from "@/lib/openpanel";
import {
  deliverOrderRefund,
  deliverOrderRevenue,
  type OrderTrackingContext,
  recordPaidOrder,
  recordRefundedOrder,
} from "./order-ledger";

const trackRevenueMock = vi.mocked(trackRevenue);
const trackRefundMock = vi.mocked(trackRefund);

const ORDER_ID = "order_1";
const CTX: OrderTrackingContext = {
  organizationId: "org_1",
  profileId: "profile_1",
  tier: "pro",
};

// Only the fields the ledger reads matter; a full Order is unreasonable to
// build, so cast a minimal fixture via `as unknown as Order` (no `any`).
function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: ORDER_ID,
    customerId: "cus_1",
    productId: "prod_1",
    subscriptionId: "sub_1",
    billingReason: "subscription_create",
    currency: "USD",
    netAmount: 1000,
    totalAmount: 1000,
    taxAmount: 0,
    refundedAmount: 0,
    refundedTaxAmount: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    modifiedAt: new Date("2026-01-02T00:00:00.000Z"),
    paid: true,
    ...overrides,
  } as unknown as Order;
}

async function getOrderRow(id = ORDER_ID) {
  return db.query.billingOrder.findFirst({ where: eq(billingOrder.polarOrderId, id) });
}

beforeAll(async () => {
  const fs = await import("node:fs/promises");
  const migration = await fs.readFile(
    new URL("../../../drizzle/0018_round_corsair.sql", import.meta.url),
    "utf8",
  );
  for (const statement of migration.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    const idempotent = trimmed
      .replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ");
    await db.execute(sql.raw(idempotent));
  }
});

beforeEach(async () => {
  await db.execute(sql`truncate "billing_order"`);
  trackRevenueMock.mockReset();
  trackRefundMock.mockReset();
});

// PGlite is single-connection, so the true concurrency the claim guards against
// (two overlapping transactions racing pending -> processing) can't be
// reproduced here. These assert the serial path is exact and idempotent; the
// claim's race-safety is verified against real Postgres separately.
describe("deliverOrderRevenue", () => {
  it("claims once: a successful send completes and never double-tracks", async () => {
    trackRevenueMock.mockResolvedValue("sent");
    await recordPaidOrder(makeOrder(), CTX, new Date("2026-01-01T00:00:00.000Z"));

    await deliverOrderRevenue(ORDER_ID);
    await deliverOrderRevenue(ORDER_ID);

    expect(trackRevenueMock).toHaveBeenCalledTimes(1);
    const row = await getOrderRow();
    expect(row?.revenueState).toBe("completed");
    expect(row?.revenueTrackedAt).toBeInstanceOf(Date);
  });

  it("resets to pending on failure, then completes on retry", async () => {
    trackRevenueMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValue("sent");
    await recordPaidOrder(makeOrder(), CTX, new Date());

    await expect(deliverOrderRevenue(ORDER_ID)).rejects.toThrow();
    expect((await getOrderRow())?.revenueState).toBe("pending");

    await deliverOrderRevenue(ORDER_ID);
    expect(trackRevenueMock).toHaveBeenCalledTimes(2);
    expect((await getOrderRow())?.revenueState).toBe("completed");
  });

  it("stays retryable when OpenPanel is unconfigured (skipped)", async () => {
    trackRevenueMock.mockResolvedValue("skipped");
    await recordPaidOrder(makeOrder(), CTX, new Date());

    await expect(deliverOrderRevenue(ORDER_ID)).resolves.toBeUndefined();

    const row = await getOrderRow();
    expect(row?.revenueState).toBe("pending");
    expect(row?.revenueTrackedAt).toBeNull();
  });

  it("completes a zero-amount order without emitting an event", async () => {
    trackRevenueMock.mockResolvedValue("sent");
    await recordPaidOrder(makeOrder({ netAmount: 0 }), CTX, new Date());

    await deliverOrderRevenue(ORDER_ID);

    expect(trackRevenueMock).not.toHaveBeenCalled();
    expect((await getOrderRow())?.revenueState).toBe("completed");
  });

  it("preserves the state machine on recordPaidOrder re-delivery (webhook retry)", async () => {
    trackRevenueMock.mockResolvedValue("sent");
    await recordPaidOrder(makeOrder(), CTX, new Date());
    await deliverOrderRevenue(ORDER_ID);
    expect((await getOrderRow())?.revenueState).toBe("completed");

    // Webhook re-delivery must not reopen a completed revenue row.
    await recordPaidOrder(makeOrder(), CTX, new Date());
    expect((await getOrderRow())?.revenueState).toBe("completed");

    await deliverOrderRevenue(ORDER_ID);
    expect(trackRevenueMock).toHaveBeenCalledTimes(1);
  });
});

describe("deliverOrderRefund", () => {
  it("tracks refund deltas (partial then full) without overshooting", async () => {
    trackRefundMock.mockResolvedValue("sent");
    await recordPaidOrder(makeOrder({ totalAmount: 1000 }), CTX, new Date());

    // Partial refund of 300.
    await recordRefundedOrder(makeOrder({ refundedAmount: 300 }), CTX, new Date());
    expect((await getOrderRow())?.refundAnalyticsState).toBe("pending");

    await deliverOrderRefund(ORDER_ID);
    expect(trackRefundMock.mock.calls[0]?.[0]).toBe(300);
    let row = await getOrderRow();
    expect(row?.refundTrackedAmountMinor).toBe(300);
    expect(row?.refundAnalyticsState).toBe("completed");

    // Full refund of 1000 -> delta must be 700, not 1000.
    await recordRefundedOrder(makeOrder({ refundedAmount: 1000 }), CTX, new Date());
    expect((await getOrderRow())?.refundAnalyticsState).toBe("pending");

    await deliverOrderRefund(ORDER_ID);
    expect(trackRefundMock.mock.calls[1]?.[0]).toBe(700);

    row = await getOrderRow();
    expect(row?.refundTrackedAmountMinor).toBe(1000);
    expect(row?.refundAnalyticsState).toBe("completed");

    const sumOfDeltas = trackRefundMock.mock.calls.reduce((acc, call) => acc + (call[0] ?? 0), 0);
    expect(sumOfDeltas).toBe(1000);

    // A redundant delivery after completion is a no-op.
    await deliverOrderRefund(ORDER_ID);
    expect(trackRefundMock).toHaveBeenCalledTimes(2);
  });

  it("is idempotent when the same refunded amount is re-recorded", async () => {
    trackRefundMock.mockResolvedValue("sent");
    await recordPaidOrder(makeOrder({ totalAmount: 1000 }), CTX, new Date());
    await recordRefundedOrder(makeOrder({ refundedAmount: 1000 }), CTX, new Date());
    await deliverOrderRefund(ORDER_ID);
    expect((await getOrderRow())?.refundAnalyticsState).toBe("completed");
    expect(trackRefundMock).toHaveBeenCalledTimes(1);

    // Re-recording the SAME amount must not reopen the row.
    await recordRefundedOrder(makeOrder({ refundedAmount: 1000 }), CTX, new Date());
    expect((await getOrderRow())?.refundAnalyticsState).toBe("completed");

    await deliverOrderRefund(ORDER_ID);
    expect(trackRefundMock).toHaveBeenCalledTimes(1);
  });
});
