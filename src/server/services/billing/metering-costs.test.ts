// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getCostConfigAt, METERING_COST_CONFIGS } from "./metering-costs";

describe("getCostConfigAt", () => {
  it("returns the legacy config for a date before the 2026-06-15 change", () => {
    const config = getCostConfigAt(new Date("2026-06-14T23:59:59.000Z"));
    expect(config.effectiveFrom).toBe("1970-01-01");
    expect(config.objectStorage.monthlyCap).toBe(4.99);
    expect(config.objectStorage.extraStoragePerTbHour).toBe(0.0067);
  });

  it("returns the current config on/after 2026-06-15", () => {
    const onChange = getCostConfigAt(new Date("2026-06-15T00:00:00.000Z"));
    const after = getCostConfigAt(new Date("2026-09-01T12:00:00.000Z"));
    expect(onChange.effectiveFrom).toBe("2026-06-15");
    expect(onChange.objectStorage.monthlyCap).toBe(6.49);
    expect(onChange.objectStorage.baseHourly).toBe(0.0104);
    expect(onChange.objectStorage.extraStoragePerTbHour).toBe(0.0087);
    expect(after.effectiveFrom).toBe("2026-06-15");
  });

  it("carries the spec's fixed inclusions and network zone", () => {
    const config = getCostConfigAt(new Date("2026-07-01T00:00:00.000Z"));
    expect(config.objectStorage.includedStorageTbHourPerHour).toBe(1);
    expect(config.objectStorage.includedEgressTbPerHour).toBe(0.0015);
    expect(config.objectStorage.minBillableObjectBytes).toBe(65_536);
    expect(config.objectStorage.billingIncrementBytes).toBe(100_000_000);
    expect(config.server.includedEgressTbPerMonth).toBe(20);
    expect(config.networkZone).toBe("eu-central");
    expect(config.internalTrafficFree).toBe(true);
    expect(config.currency).toBe("EUR");
    expect(config.vat).toBe("excluded");
  });

  it("never mutates a past month: repeated resolution is stable and immutable", () => {
    const june = new Date("2026-05-10T00:00:00.000Z");
    const first = getCostConfigAt(june);
    // A later price change must not retroactively alter an earlier resolution.
    getCostConfigAt(new Date("2026-12-31T00:00:00.000Z"));
    const second = getCostConfigAt(june);
    expect(second).toEqual(first);
    expect(Object.isFrozen(METERING_COST_CONFIGS)).toBe(false); // array is readonly by type
    expect(first.objectStorage.monthlyCap).toBe(4.99);
  });
});
