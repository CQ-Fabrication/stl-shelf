import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDraft,
  buildSearch,
  createDebouncedDraftCommit,
  removeDraftTag,
  SEARCH_DEBOUNCE_MS,
  setDraftQuery,
  toggleDraftTag,
} from "./search-filter-bar";

describe("SearchFilterBar draft logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not restore a removed tag while typing", () => {
    const typedDraft = setDraftQuery(buildDraft(undefined, "validated"), "0999");
    const finalDraft = removeDraftTag(typedDraft, "validated");

    expect(buildSearch(finalDraft)).toEqual({
      q: "0999",
      tags: undefined,
    });
  });

  it("keeps query and tag coherent when adding a tag while typing", () => {
    const typedDraft = setDraftQuery(buildDraft(), "0999");
    const finalDraft = toggleDraftTag(typedDraft, "validated");

    expect(buildSearch(finalDraft)).toEqual({
      q: "0999",
      tags: "validated",
    });
  });

  it("commits only once after burst typing with the final value", () => {
    const commitSpy = vi.fn();
    const debouncer = createDebouncedDraftCommit((draft, replace) => {
      commitSpy({ search: buildSearch(draft), replace });
    });

    debouncer.schedule(setDraftQuery(buildDraft(), "0"));
    debouncer.schedule(setDraftQuery(buildDraft(), "09"));
    debouncer.schedule(setDraftQuery(buildDraft(), "0999"));

    expect(commitSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(commitSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(commitSpy).toHaveBeenLastCalledWith({
      search: { q: "0999", tags: undefined },
      replace: true,
    });
  });
});
