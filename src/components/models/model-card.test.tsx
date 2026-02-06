import { describe, expect, it } from "vitest";
import { buildLibraryTagSearch } from "./model-card";

describe("ModelCard tag navigation", () => {
  it("preserves the active query when building tag search", () => {
    expect(buildLibraryTagSearch("validated", "0999")).toEqual({
      q: "0999",
      tags: "validated",
    });
  });
});
