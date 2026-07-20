import { describe, expect, it } from "vitest";
import { resolveCtaAction, splitInternalPath } from "./announcement-card";

describe("splitInternalPath", () => {
  it("returns the path untouched when there is no query string", () => {
    expect(splitInternalPath("/organization/settings")).toEqual({
      pathname: "/organization/settings",
      search: undefined,
    });
  });

  it("splits pathname and query params", () => {
    expect(splitInternalPath("/organization/settings?tab=tags")).toEqual({
      pathname: "/organization/settings",
      search: { tab: "tags" },
    });
  });

  it("supports multiple params", () => {
    expect(splitInternalPath("/organization/settings?tab=tags&src=menu")).toEqual({
      pathname: "/organization/settings",
      search: { tab: "tags", src: "menu" },
    });
  });

  it("treats a trailing bare question mark as no search", () => {
    expect(splitInternalPath("/library?")).toEqual({
      pathname: "/library",
      search: undefined,
    });
  });

  it("decodes encoded values", () => {
    expect(splitInternalPath("/library?q=benchy%20boat")).toEqual({
      pathname: "/library",
      search: { q: "benchy boat" },
    });
  });
});

describe("resolveCtaAction", () => {
  it("resolves an internal deep link with query into pathname + search (404 regression)", () => {
    expect(resolveCtaAction("internal:/organization/settings?tab=tags")).toEqual({
      kind: "internal",
      to: "/organization/settings",
      search: { tab: "tags" },
    });
  });

  it("resolves an internal link without query and omits search entirely", () => {
    expect(resolveCtaAction("internal:/announcements")).toEqual({
      kind: "internal",
      to: "/announcements",
    });
  });

  it("keeps external URLs whole, query included", () => {
    expect(resolveCtaAction("external:https://stl-shelf.com/pricing?utm_source=app")).toEqual({
      kind: "external",
      url: "https://stl-shelf.com/pricing?utm_source=app",
    });
  });

  it("falls back to external for bare http(s) URLs", () => {
    expect(resolveCtaAction("https://stl-shelf.com/guides")).toEqual({
      kind: "external",
      url: "https://stl-shelf.com/guides",
    });
  });

  it("falls back to internal for bare paths and still splits their query", () => {
    expect(resolveCtaAction("/library?tags=petg")).toEqual({
      kind: "internal",
      to: "/library",
      search: { tags: "petg" },
    });
  });
});
