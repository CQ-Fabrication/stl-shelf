// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Back the service's `db` with an in-memory Postgres (PGlite) so the real
// upsert / reconcile SQL is exercised (ON CONFLICT, NOT IN, status filters).
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  return { db: drizzle(new PGlite()) };
});

import { BILLING_ADDONS, SUBSCRIPTION_TIERS } from "@/lib/billing/config";
import { db } from "@/lib/db";
import { organizationAddons } from "@/lib/db/schema/billing";
import {
  computeEffectiveLimits,
  getActiveAddonGrants,
  reconcileOrgAddons,
  setAddonStatus,
  upsertActiveAddon,
} from "./addons.service";

const ORG = "org_1";
const GIB = 1_073_741_824;

async function createSchema(): Promise<void> {
  await db.execute(sql`create table if not exists "organization" ("id" text primary key)`);
  await db.execute(sql`
    create table if not exists "organization_addons" (
      "id" uuid primary key default gen_random_uuid(),
      "organization_id" text not null references "organization"("id") on delete cascade,
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
    )
  `);
}

// Monotonic event timestamps: each call is strictly newer than the last, so the
// per-subscription ordering guard applies the write. Tests that exercise
// staleness pass explicit out-of-order values instead.
let clock = 0;
const nextTs = () => new Date(Date.UTC(2026, 0, 1) + clock++ * 1000);

async function rowCount(): Promise<number> {
  const rows = await db.select({ id: organizationAddons.id }).from(organizationAddons);
  return rows.length;
}

beforeEach(async () => {
  await createSchema();
  await db.execute(sql`truncate "organization", "organization_addons" cascade`);
  await db.execute(sql`insert into "organization" ("id") values (${ORG})`);
});

describe("computeEffectiveLimits", () => {
  it("returns exactly the tier config when there are no add-ons (tier-only orgs unchanged)", () => {
    for (const tier of ["free", "basic", "pro"] as const) {
      const config = SUBSCRIPTION_TIERS[tier];
      expect(computeEffectiveLimits(tier, [])).toEqual({
        storageLimit: config.storageLimit,
        memberLimit: config.maxMembers,
        modelCountLimit: config.modelCountLimit,
      });
    }
  });

  it("keeps an unlimited (-1) model-count limit unchanged", () => {
    const limits = computeEffectiveLimits("pro", [
      { kind: "storage", grantBytes: 100 * GIB, grantSeats: null },
    ]);
    expect(limits.modelCountLimit).toBe(-1);
  });

  it("adds a storage grant on top of the tier storage limit", () => {
    const limits = computeEffectiveLimits("free", [
      { kind: "storage", grantBytes: 100 * GIB, grantSeats: null },
    ]);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 100 * GIB);
    expect(limits.memberLimit).toBe(SUBSCRIPTION_TIERS.free.maxMembers);
  });

  it("adds a seat grant on top of the tier member limit", () => {
    const limits = computeEffectiveLimits("pro", [
      { kind: "seats", grantBytes: null, grantSeats: 5 },
    ]);
    expect(limits.memberLimit).toBe(SUBSCRIPTION_TIERS.pro.maxMembers + 5);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.pro.storageLimit);
  });

  it("sums multiple grants of the same kind", () => {
    const limits = computeEffectiveLimits("basic", [
      { kind: "storage", grantBytes: 1024 * GIB, grantSeats: null },
      { kind: "storage", grantBytes: 1024 * GIB, grantSeats: null },
    ]);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.basic.storageLimit + 2 * 1024 * GIB);
  });
});

describe("add-on rows", () => {
  it("applies an add-on purchase: effective storage = tier + grant", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_storage_1",
      productId: "prod_storage_100",
      addon: BILLING_ADDONS.storage_100gb,
      eventTimestamp: nextTs(),
    });

    const grants = await getActiveAddonGrants(ORG);
    const limits = computeEffectiveLimits("free", grants);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 100 * GIB);
  });

  it("cumulates two add-on subscriptions (+2 TB)", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_tb_1",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: nextTs(),
    });
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_tb_2",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: nextTs(),
    });

    expect(await rowCount()).toBe(2);
    const limits = computeEffectiveLimits("basic", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.basic.storageLimit + 2 * 1024 * GIB);
  });

  it("is idempotent on re-delivery of the same subscription id (no double grant)", async () => {
    for (let i = 0; i < 3; i++) {
      await upsertActiveAddon({
        organizationId: ORG,
        polarSubscriptionId: "sub_dupe",
        productId: "prod_tb",
        addon: BILLING_ADDONS.storage_1tb,
        eventTimestamp: nextTs(),
      });
    }

    expect(await rowCount()).toBe(1);
    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 1024 * GIB);
  });

  it("drops the grant when the add-on subscription is revoked", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_revoke",
      productId: "prod_500",
      addon: BILLING_ADDONS.storage_500gb,
      eventTimestamp: nextTs(),
    });
    expect((await getActiveAddonGrants(ORG)).length).toBe(1);

    const applied = await setAddonStatus("sub_revoke", "revoked", nextTs());
    expect(applied).toBe(true);

    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit);
  });

  it("keeps granting while canceled (until period end), then drops on revoke", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_cancel",
      productId: "prod_100",
      addon: BILLING_ADDONS.storage_100gb,
      eventTimestamp: nextTs(),
    });

    // Canceled = cancellation scheduled; access continues until revoked.
    await setAddonStatus("sub_cancel", "canceled", nextTs());
    const canceledLimits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(canceledLimits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 100 * GIB);

    // Revoked = access actually ended; the grant stops.
    await setAddonStatus("sub_cancel", "revoked", nextTs());
    const revokedLimits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(revokedLimits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit);
  });

  it("reconcile revokes a canceled-but-granting add-on that is absent from customer state", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_canceled_gone",
      productId: "prod_100",
      addon: BILLING_ADDONS.storage_100gb,
      eventTimestamp: nextTs(),
    });
    await setAddonStatus("sub_canceled_gone", "canceled", nextTs());
    expect((await getActiveAddonGrants(ORG)).length).toBe(1);

    await reconcileOrgAddons(ORG, [], nextTs());

    expect((await getActiveAddonGrants(ORG)).length).toBe(0);
  });
});

describe("per-subscription event ordering (org watermark decoupling)", () => {
  // Codex P1-1: tier and add-on subscriptions are independent webhook streams.
  // A newer tier event advances the ORG watermark, but add-on writes must be
  // ordered on the add-on row's own lastEventAt, not the org watermark — so a
  // delayed add-on revoke still lands.
  it("applies a delayed add-on revoke even though a later tier event advanced the org watermark", async () => {
    // Add-on created at T0 (row.lastEventAt = T0).
    const t0 = nextTs();
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_delayed",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: t0,
    });
    expect((await getActiveAddonGrants(ORG)).length).toBe(1);

    // A tier webhook fires at T2 and advances the org-level billingLastWebhookAt
    // (org state, not the add-on row). The revoke below carries T1 with
    // T0 < T1 < T2: older than the org watermark, newer than the add-on row.
    const t1 = nextTs(); // T1
    nextTs(); // T2 (the tier event's timestamp — not consulted for add-on writes)

    const applied = await setAddonStatus("sub_delayed", "revoked", t1);
    expect(applied).toBe(true);

    // Grant is gone: the add-on no longer keeps granting forever.
    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit);
  });

  it("skips an add-on event older than the row's own lastEventAt (per-subscription staleness)", async () => {
    const tNew = new Date(Date.UTC(2026, 5, 1));
    const tOld = new Date(Date.UTC(2026, 0, 1));

    // Row's lastEventAt advanced to tNew.
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_stale",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: tNew,
    });

    // A revoke that predates the row is stale → skipped, grant survives.
    const applied = await setAddonStatus("sub_stale", "revoked", tOld);
    expect(applied).toBe(false);

    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 1024 * GIB);
  });

  it("skips a stale upsert that would otherwise re-activate a revoked add-on", async () => {
    const tNew = new Date(Date.UTC(2026, 5, 1));
    const tOld = new Date(Date.UTC(2026, 0, 1));

    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_reactivate",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: tNew,
    });
    await setAddonStatus("sub_reactivate", "revoked", new Date(Date.UTC(2026, 6, 1)));
    expect((await getActiveAddonGrants(ORG)).length).toBe(0);

    // A delayed "created" (active) with an old timestamp must not resurrect it.
    const applied = await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_reactivate",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: tOld,
    });
    expect(applied).toBe(false);
    expect((await getActiveAddonGrants(ORG)).length).toBe(0);
  });
});

describe("reconcileOrgAddons (customer.state_changed)", () => {
  it("keeps present add-on subs active and revokes ones missing from the state", async () => {
    // Seed two active add-ons.
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_keep",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: nextTs(),
    });
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_gone",
      productId: "prod_100",
      addon: BILLING_ADDONS.storage_100gb,
      eventTimestamp: nextTs(),
    });

    // State reports only sub_keep still present, plus a brand-new sub_new.
    await reconcileOrgAddons(
      ORG,
      [
        {
          polarSubscriptionId: "sub_keep",
          productId: "prod_tb",
          addon: BILLING_ADDONS.storage_1tb,
        },
        {
          polarSubscriptionId: "sub_new",
          productId: "prod_seat",
          addon: BILLING_ADDONS.seat_single,
        },
      ],
      nextTs(),
    );

    const grants = await getActiveAddonGrants(ORG);
    // sub_keep (1 TB storage) + sub_new (1 seat) survive; sub_gone revoked.
    expect(grants.length).toBe(2);
    const limits = computeEffectiveLimits("free", grants);
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 1024 * GIB);
    expect(limits.memberLimit).toBe(SUBSCRIPTION_TIERS.free.maxMembers + 1);
  });

  it("revokes all active add-ons when the state reports none", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_a",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: nextTs(),
    });

    await reconcileOrgAddons(ORG, [], nextTs());

    expect((await getActiveAddonGrants(ORG)).length).toBe(0);
  });

  it("survives a tier resync: add-on grants outlive the tier subscription (the regression)", async () => {
    // Active 1 TB add-on, tier subscription being revoked → free.
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_tb",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: nextTs(),
    });

    // Reconcile keeps it (still present), tier falls to free.
    await reconcileOrgAddons(
      ORG,
      [{ polarSubscriptionId: "sub_tb", productId: "prod_tb", addon: BILLING_ADDONS.storage_1tb }],
      nextTs(),
    );

    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 1024 * GIB);
  });

  it("overrides rows regardless of lastEventAt (full-truth snapshot wins over per-row staleness)", async () => {
    // Row's lastEventAt is far in the future.
    const tFuture = new Date(Date.UTC(2027, 0, 1));
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_future",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
      eventTimestamp: tFuture,
    });
    expect((await getActiveAddonGrants(ORG)).length).toBe(1);

    // A reconcile with an OLDER timestamp that reports the sub as absent still
    // revokes it — state_changed is the full truth and overrides per-row order.
    await reconcileOrgAddons(ORG, [], new Date(Date.UTC(2026, 0, 1)));
    expect((await getActiveAddonGrants(ORG)).length).toBe(0);
  });
});
