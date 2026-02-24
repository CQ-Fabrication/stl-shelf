import { describe, expect, it } from "vitest";
import {
  getExtensionMarkerMatches,
  isHydrationMismatchError,
  isHydrationMismatchMessage,
} from "@/lib/error-tracking/hydration-diagnostics";

describe("hydration diagnostics", () => {
  it("detects React #418 hydration mismatch message", () => {
    const error = new Error(
      "Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]=",
    );

    expect(isHydrationMismatchError(error)).toBe(true);
    expect(isHydrationMismatchMessage(error.message)).toBe(true);
  });

  it("extracts extension markers from token candidates", () => {
    const tokens = [
      "immersive-translate-target-inner",
      "data-grammarly",
      "data-protonpass-form",
      "foo",
      "bar",
      "google-translate-widget",
    ];

    const matches = getExtensionMarkerMatches(tokens);

    expect(matches).toEqual([
      "immersive-translate-target-inner",
      "data-grammarly",
      "data-protonpass-form",
      "google-translate-widget",
    ]);
  });

  it("does not flag unrelated errors", () => {
    expect(isHydrationMismatchError(new Error("Network request failed"))).toBe(false);
    expect(isHydrationMismatchMessage("Something else")).toBe(false);
  });
});
