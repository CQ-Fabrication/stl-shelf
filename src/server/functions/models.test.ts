import { describe, expect, it } from "vitest";
import { normalizeTagNames } from "./models";

describe("normalizeTagNames", () => {
  it("trims and lowercases each name", () => {
    expect(normalizeTagNames([" PLA ", "Boat"])).toEqual(["pla", "boat"]);
  });

  it("dedupes case-variant duplicates", () => {
    expect(normalizeTagNames(["PLA", "pla", " Pla "])).toEqual(["pla"]);
  });

  it("drops empty and whitespace-only entries", () => {
    expect(normalizeTagNames(["benchy", "", "   "])).toEqual(["benchy"]);
  });

  it("preserves first-seen order", () => {
    expect(normalizeTagNames(["boat", "benchy", "Boat"])).toEqual(["boat", "benchy"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(normalizeTagNames([])).toEqual([]);
  });
});
