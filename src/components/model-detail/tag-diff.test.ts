import { describe, expect, it } from "vitest";
import { diffTags } from "./tag-diff";

describe("diffTags", () => {
  it("detects a single added tag", () => {
    expect(diffTags(["a", "b"], ["a", "b", "c"])).toEqual({ added: ["c"], removed: [] });
  });

  it("detects a single removed tag", () => {
    expect(diffTags(["a", "b", "c"], ["a", "c"])).toEqual({ added: [], removed: ["b"] });
  });

  it("returns empty diff when selections match", () => {
    expect(diffTags(["a", "b"], ["a", "b"])).toEqual({ added: [], removed: [] });
  });

  it("is order-independent", () => {
    expect(diffTags(["a", "b"], ["b", "a", "c"])).toEqual({ added: ["c"], removed: [] });
  });

  it("handles simultaneous add and remove", () => {
    expect(diffTags(["a", "b"], ["a", "c"])).toEqual({ added: ["c"], removed: ["b"] });
  });

  it("handles an empty starting selection", () => {
    expect(diffTags([], ["a"])).toEqual({ added: ["a"], removed: [] });
  });
});
