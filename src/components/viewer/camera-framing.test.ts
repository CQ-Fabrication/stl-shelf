import { describe, expect, it } from "vitest";
import { computeCameraDistance } from "./camera-framing";

describe("computeCameraDistance", () => {
  it("places the camera so the sphere exactly fills the frame at fillFactor 1", () => {
    // At fov 90 and a square frame, exact fit is radius / sin(45deg) = radius * sqrt(2).
    expect(computeCameraDistance(1, 90, 1, 1)).toBeCloseTo(Math.SQRT2, 10);
  });

  it("scales the distance linearly with radius", () => {
    const single = computeCameraDistance(1, 45, 1, 1);
    expect(computeCameraDistance(3, 45, 1, 1)).toBeCloseTo(single * 3, 10);
  });

  it("moves the camera back proportionally to the fill factor (margin)", () => {
    const exact = computeCameraDistance(1, 45, 1, 1);
    expect(computeCameraDistance(1, 45, 1, 1.2)).toBeCloseTo(exact * 1.2, 10);
  });

  it("pulls back further for narrow (aspect < 1) frames so width still fits", () => {
    const square = computeCameraDistance(1, 45, 1, 1);
    const portrait = computeCameraDistance(1, 45, 0.5, 1);
    expect(portrait).toBeGreaterThan(square);
  });

  it("ignores aspect for wide (aspect >= 1) frames where height is the limit", () => {
    const square = computeCameraDistance(1, 45, 1, 1);
    const wide = computeCameraDistance(1, 45, 2, 1);
    expect(wide).toBeCloseTo(square, 10);
  });

  it("returns 0 for a degenerate (zero) radius", () => {
    expect(computeCameraDistance(0, 45, 1)).toBe(0);
  });

  it("returns 0 for a negative radius", () => {
    expect(computeCameraDistance(-2, 45, 1)).toBe(0);
  });

  it("falls back to the vertical fov when aspect is non-positive", () => {
    const verticalOnly = computeCameraDistance(1, 45, 1, 1);
    expect(computeCameraDistance(1, 45, 0, 1)).toBeCloseTo(verticalOnly, 10);
  });
});
