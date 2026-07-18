// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveObjectAttribution, MIN_BILLABLE_OBJECT_BYTES, toBillableBytes } from "./types";

const ORG = "org_abc";
const MODEL = "00000000-0000-4000-8000-00000000000a";

describe("deriveObjectAttribution", () => {
  it("attributes a source key to org + model", () => {
    expect(deriveObjectAttribution(`${ORG}/${MODEL}/v1/sources/part.stl`)).toEqual({
      organizationId: ORG,
      objectKind: "source",
      modelId: MODEL,
    });
  });

  it("maps the slicer and artifacts folders to their kinds", () => {
    expect(deriveObjectAttribution(`${ORG}/${MODEL}/v2/slicer/plate.3mf`).objectKind).toBe(
      "slicer",
    );
    expect(deriveObjectAttribution(`${ORG}/${MODEL}/v2/artifacts/preview.png`).objectKind).toBe(
      "artifact",
    );
  });

  it("treats temp keys as unattributed temp objects", () => {
    expect(deriveObjectAttribution("temp/1700000000000-upload.stl")).toEqual({
      organizationId: null,
      objectKind: "temp",
      modelId: null,
    });
  });

  it("treats a garbage / unknown-layout key as unattributed unknown", () => {
    expect(deriveObjectAttribution("nonsense-key")).toEqual({
      organizationId: null,
      objectKind: "unknown",
      modelId: null,
    });
    expect(deriveObjectAttribution(`${ORG}/${MODEL}/v1/mystery/file.bin`)).toEqual({
      organizationId: null,
      objectKind: "unknown",
      modelId: null,
    });
  });

  it("leaves modelId null when the model segment is not a UUID", () => {
    const result = deriveObjectAttribution(`${ORG}/not-a-uuid/v1/sources/part.stl`);
    expect(result.organizationId).toBe(ORG);
    expect(result.objectKind).toBe("source");
    expect(result.modelId).toBeNull();
  });
});

describe("toBillableBytes", () => {
  it("applies the 64 KB per-object floor", () => {
    expect(MIN_BILLABLE_OBJECT_BYTES).toBe(65_536);
    expect(toBillableBytes(0)).toBe(65_536);
    expect(toBillableBytes(1_000)).toBe(65_536);
    expect(toBillableBytes(65_536)).toBe(65_536);
    expect(toBillableBytes(200_000)).toBe(200_000);
  });
});
