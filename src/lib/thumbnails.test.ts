import { describe, expect, it } from "vitest";
import { printProfileThumbnailUrl, versionThumbnailUrl } from "./thumbnails";

describe("thumbnail URL builders", () => {
  const at = new Date("2026-07-18T11:42:31.000Z");

  it("emits a v cache-bust param derived from updatedAt (epoch ms)", () => {
    expect(versionThumbnailUrl("ver_1", at)).toBe(
      `/api/thumbnails/version/ver_1?v=${at.getTime()}`,
    );
    expect(printProfileThumbnailUrl("pp_1", at)).toBe(
      `/api/thumbnails/print-profile/pp_1?v=${at.getTime()}`,
    );
  });

  it("changes the URL when updatedAt is bumped (busting a replaced thumbnail)", () => {
    const later = new Date(at.getTime() + 3_600_000);

    expect(versionThumbnailUrl("ver_1", later)).not.toBe(versionThumbnailUrl("ver_1", at));
    expect(printProfileThumbnailUrl("pp_1", later)).not.toBe(printProfileThumbnailUrl("pp_1", at));
  });
});
