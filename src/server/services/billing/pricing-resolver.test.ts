// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/server/services/billing/polar.service", () => ({ polarService: {} }));
vi.mock("@/lib/logging", () => ({ logErrorEvent: vi.fn() }));

import { logErrorEvent } from "@/lib/logging";
import { resolveAddonPricingItems, resolveWithLastKnown } from "./pricing-resolver";

const PRICE = { amount: 499, currency: "USD" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveWithLastKnown", () => {
  it("serves a fresh Polar value and stores it as last-known-good", async () => {
    const lastKnown = new Map<string, typeof PRICE>();

    const result = await resolveWithLastKnown({
      surface: "addons",
      slug: "storage_100gb",
      lastKnown,
      key: "storage_100gb",
      fetchValue: () => Promise.resolve(PRICE),
    });

    expect(result).toEqual({ value: PRICE, live: true });
    expect(lastKnown.get("storage_100gb")).toEqual(PRICE);
    expect(logErrorEvent).not.toHaveBeenCalled();
  });

  it("reports a fetch failure and returns null when there is no cache", async () => {
    const result = await resolveWithLastKnown<typeof PRICE>({
      surface: "tiers",
      slug: "pro_month",
      lastKnown: new Map(),
      key: "pro:month",
      fetchValue: () => Promise.reject(new Error("polar down")),
    });

    expect(result).toEqual({ value: null, live: false });
    expect(logErrorEvent).toHaveBeenCalledWith("billing.pricing.fetch_failed", {
      surface: "tiers",
      slug: "pro_month",
      message: "polar down",
    });
  });

  it("serves the last-known-good value when the fetch fails", async () => {
    const lastKnown = new Map([["basic:month", PRICE]]);

    const result = await resolveWithLastKnown({
      surface: "tiers",
      slug: "basic_month",
      lastKnown,
      key: "basic:month",
      fetchValue: () => Promise.reject(new Error("timeout")),
    });

    expect(result).toEqual({ value: PRICE, live: false });
    expect(logErrorEvent).toHaveBeenCalledTimes(1);
  });

  it("treats a product without an active price as a failure", async () => {
    const result = await resolveWithLastKnown<typeof PRICE>({
      surface: "addons",
      slug: "seat_single",
      lastKnown: new Map(),
      key: "seat_single",
      fetchValue: () => Promise.resolve(null),
    });

    expect(result.value).toBeNull();
    expect(logErrorEvent).toHaveBeenCalledWith("billing.pricing.fetch_failed", {
      surface: "addons",
      slug: "seat_single",
      message: "No active price on Polar product",
    });
  });
});

describe("resolveAddonPricingItems", () => {
  const allProductIds = (slug: string) => `prod_${slug}`;

  it("marks add-ons unavailable on fetch failure and reports each to logging", async () => {
    const addons = await resolveAddonPricingItems({
      fetchPrice: () => Promise.reject(new Error("polar down")),
      getProductId: allProductIds,
      lastKnown: new Map(),
    });

    expect(addons).toHaveLength(5);
    for (const addon of addons) {
      expect(addon.unavailable).toBe(true);
      expect(addon.price).toBeNull();
    }
    expect(logErrorEvent).toHaveBeenCalledTimes(5);
    expect(logErrorEvent).toHaveBeenCalledWith("billing.pricing.fetch_failed", {
      surface: "addons",
      slug: "storage_100gb",
      message: "polar down",
    });
  });

  it("serves the cached price when the fetch fails (no unavailable)", async () => {
    const lastKnown = new Map([["storage_100gb", PRICE]]);

    const addons = await resolveAddonPricingItems({
      fetchPrice: () => Promise.reject(new Error("polar down")),
      getProductId: allProductIds,
      lastKnown,
    });

    const cached = addons.find((addon) => addon.slug === "storage_100gb");
    expect(cached?.unavailable).toBe(false);
    expect(cached?.price).toEqual(PRICE);

    const uncached = addons.filter((addon) => addon.slug !== "storage_100gb");
    for (const addon of uncached) {
      expect(addon.unavailable).toBe(true);
    }
  });

  it("returns live prices and never marks fetched add-ons unavailable", async () => {
    const lastKnown = new Map<string, typeof PRICE>();

    const addons = await resolveAddonPricingItems({
      fetchPrice: () => Promise.resolve(PRICE),
      getProductId: allProductIds,
      lastKnown,
    });

    for (const addon of addons) {
      expect(addon.unavailable).toBe(false);
      expect(addon.price).toEqual(PRICE);
    }
    expect(lastKnown.size).toBe(5);
    expect(logErrorEvent).not.toHaveBeenCalled();
  });

  it("marks an add-on without a product id unavailable without reporting a fetch failure", async () => {
    const addons = await resolveAddonPricingItems({
      fetchPrice: () => Promise.resolve(PRICE),
      getProductId: () => undefined,
      lastKnown: new Map(),
    });

    for (const addon of addons) {
      expect(addon.unavailable).toBe(true);
    }
    expect(logErrorEvent).not.toHaveBeenCalled();
  });
});
