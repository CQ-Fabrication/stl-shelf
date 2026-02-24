import { describe, expect, it } from "vitest";
import {
  EGRESS_SOFT_WARNING_MIN_BYTES,
  getEgressLimitBaselineBytes,
  shouldTrackEgressForDisposition,
  shouldShowEgressWarning,
  shouldTriggerHardEgressWarning,
  shouldTriggerSoftEgressWarning,
} from "./egress";

describe("billing egress warning thresholds", () => {
  it("suppresses soft warning for very small absolute usage", () => {
    expect(shouldTriggerSoftEgressWarning(0.9, EGRESS_SOFT_WARNING_MIN_BYTES - 1)).toBe(false);
  });

  it("enables soft warning when both ratio and minimum bytes are reached", () => {
    expect(shouldTriggerSoftEgressWarning(0.8, EGRESS_SOFT_WARNING_MIN_BYTES)).toBe(true);
  });

  it("always triggers hard warning at 100%+", () => {
    expect(shouldTriggerHardEgressWarning(1)).toBe(true);
  });

  it("uses the same logic for UI percentages", () => {
    expect(shouldShowEgressWarning(85, EGRESS_SOFT_WARNING_MIN_BYTES - 1)).toBe(false);
    expect(shouldShowEgressWarning(85, EGRESS_SOFT_WARNING_MIN_BYTES)).toBe(true);
    expect(shouldShowEgressWarning(100, 0)).toBe(true);
  });

  it("uses configured storage limit as egress baseline when larger than current usage", () => {
    const baseline = getEgressLimitBaselineBytes(20 * 1024 * 1024, 512 * 1024 * 1024);
    expect(baseline).toBe(512 * 1024 * 1024);
  });

  it("does not track inline viewer fetches as billable egress", () => {
    expect(shouldTrackEgressForDisposition("inline")).toBe(false);
    expect(shouldTrackEgressForDisposition("attachment")).toBe(true);
    expect(shouldTrackEgressForDisposition(null)).toBe(true);
  });
});
