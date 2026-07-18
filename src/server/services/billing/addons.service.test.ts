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
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now()
    )
  `);
}

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
    });
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_tb_2",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
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
    });
    expect((await getActiveAddonGrants(ORG)).length).toBe(1);

    const affected = await setAddonStatus("sub_revoke", "revoked");
    expect(affected).toEqual({ organizationId: ORG, addonSlug: "storage_500gb" });

    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit);
  });

  it("drops the grant when the add-on subscription is canceled", async () => {
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_cancel",
      productId: "prod_100",
      addon: BILLING_ADDONS.storage_100gb,
    });

    await setAddonStatus("sub_cancel", "canceled");
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
    });
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_gone",
      productId: "prod_100",
      addon: BILLING_ADDONS.storage_100gb,
    });

    // State reports only sub_keep still present, plus a brand-new sub_new.
    await reconcileOrgAddons(ORG, [
      { polarSubscriptionId: "sub_keep", productId: "prod_tb", addon: BILLING_ADDONS.storage_1tb },
      {
        polarSubscriptionId: "sub_new",
        productId: "prod_seat",
        addon: BILLING_ADDONS.seat_single,
      },
    ]);

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
    });

    await reconcileOrgAddons(ORG, []);

    expect((await getActiveAddonGrants(ORG)).length).toBe(0);
  });

  it("survives a tier resync: add-on grants outlive the tier subscription (the regression)", async () => {
    // Active 1 TB add-on, tier subscription being revoked → free.
    await upsertActiveAddon({
      organizationId: ORG,
      polarSubscriptionId: "sub_tb",
      productId: "prod_tb",
      addon: BILLING_ADDONS.storage_1tb,
    });

    // Reconcile keeps it (still present), tier falls to free.
    await reconcileOrgAddons(ORG, [
      { polarSubscriptionId: "sub_tb", productId: "prod_tb", addon: BILLING_ADDONS.storage_1tb },
    ]);

    const limits = computeEffectiveLimits("free", await getActiveAddonGrants(ORG));
    expect(limits.storageLimit).toBe(SUBSCRIPTION_TIERS.free.storageLimit + 1024 * GIB);
  });
});
