import { describe, expect, it } from "vitest";
import { getFileExtension } from "./limits";

describe("getFileExtension", () => {
  it("returns the lowercased extension", () => {
    expect(getFileExtension("Benchy.STL")).toBe("stl");
  });

  it("returns the last extension for names with multiple dots", () => {
    expect(getFileExtension("part.v2.3mf")).toBe("3mf");
  });

  it("returns empty string when name is undefined (drag-over items)", () => {
    expect(getFileExtension(undefined)).toBe("");
  });

  it("returns empty string for an empty name", () => {
    expect(getFileExtension("")).toBe("");
  });
});
