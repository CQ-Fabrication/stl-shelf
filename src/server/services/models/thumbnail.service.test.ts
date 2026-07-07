import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UploadCall = { key: string; contentType?: string };

const state = {
  uploadCalls: [] as UploadCall[],
  uploadShouldThrow: false,
  getFileBody: null as Uint8Array | null,
  getFileShouldThrow: false,
};

vi.mock("@/server/services/storage", () => ({
  storageService: {
    generateStorageKey: vi.fn(
      (opts: { organizationId: string; modelId: string; version: string; filename: string }) =>
        `${opts.organizationId}/${opts.modelId}/${opts.version}/artifacts/${opts.filename}`,
    ),
    uploadFile: vi.fn(async (opts: { key: string; file: unknown; contentType?: string }) => {
      if (state.uploadShouldThrow) {
        throw new Error("upload failed");
      }
      state.uploadCalls.push({ key: opts.key, contentType: opts.contentType });
      return { key: opts.key, url: "", size: 0, etag: "" };
    }),
    getFile: vi.fn(async () => {
      if (state.getFileShouldThrow || !state.getFileBody) {
        throw new Error("get failed");
      }
      return { body: state.getFileBody };
    }),
  },
}));

import { storageService } from "@/server/services/storage";
import {
  deriveAddedFileThumbnailKey,
  extractFallbackThumbnailKey,
  extractThumbnailKeyFromBuffer,
  isAutoThumbnail,
  recomputeThumbnailKey,
  removedFileWasThumbnailSource,
  selectThumbnailCandidate,
  validateSnapshot,
} from "./thumbnail.service";

const PNG_BYTES = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const EXTRACT_OPTS = { organizationId: "org_1", modelId: "model_1", version: "v1" };

async function build3MF(withThumbnail: boolean): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("3D/3dmodel.model", "<model/>");
  if (withThumbnail) {
    zip.file("Metadata/thumbnail.png", PNG_BYTES);
  }
  return await zip.generateAsync({ type: "nodebuffer" });
}

// jsdom's File.arrayBuffer() does not round-trip binary bytes reliably, so stub it.
function fileFrom(bytes: Uint8Array, name: string): File {
  return {
    name,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as File;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.uploadCalls = [];
  state.uploadShouldThrow = false;
  state.getFileBody = null;
  state.getFileShouldThrow = false;
});

describe("selectThumbnailCandidate", () => {
  it("prefers an image over a 3mf regardless of order", () => {
    const result = selectThumbnailCandidate([
      { extension: "3mf", storageKey: "keys/model.3mf" },
      { extension: "png", storageKey: "keys/photo.png" },
    ]);
    expect(result).toEqual({ kind: "image", key: "keys/photo.png" });
  });

  it("returns the first image by input order", () => {
    const result = selectThumbnailCandidate([
      { extension: "PNG", storageKey: "keys/first.png" },
      { extension: "jpg", storageKey: "keys/second.jpg" },
    ]);
    expect(result).toEqual({ kind: "image", key: "keys/first.png" });
  });

  it("falls back to the first 3mf when no image is present", () => {
    const result = selectThumbnailCandidate([
      { extension: "stl", storageKey: "keys/model.stl" },
      { extension: "3mf", storageKey: "keys/a.3mf" },
      { extension: "3mf", storageKey: "keys/b.3mf" },
    ]);
    expect(result).toEqual({ kind: "3mf", storageKey: "keys/a.3mf" });
  });

  it("returns null for an empty list", () => {
    expect(selectThumbnailCandidate([])).toBeNull();
  });

  it("ignores unknown extensions", () => {
    const result = selectThumbnailCandidate([
      { extension: "stl", storageKey: "keys/model.stl" },
      { extension: "obj", storageKey: "keys/model.obj" },
    ]);
    expect(result).toBeNull();
  });
});

describe("validateSnapshot", () => {
  const snapshotFile = (type: string, size: number): File => ({ type, size }) as unknown as File;

  it("accepts a png within the size limit", () => {
    expect(validateSnapshot(snapshotFile("image/png", 500_000))).toEqual({ ok: true });
  });

  it("accepts a png exactly at the 2MB limit", () => {
    expect(validateSnapshot(snapshotFile("image/png", 2 * 1024 * 1024))).toEqual({ ok: true });
  });

  it("rejects a non-png type", () => {
    const result = validateSnapshot(snapshotFile("image/jpeg", 1000));
    expect(result.ok).toBe(false);
  });

  it("rejects a png over the 2MB limit", () => {
    const result = validateSnapshot(snapshotFile("image/png", 2 * 1024 * 1024 + 1));
    expect(result.ok).toBe(false);
  });
});

describe("isAutoThumbnail", () => {
  it("is true for an extracted 3mf preview", () => {
    expect(isAutoThumbnail("org/model/v1/artifacts/preview-extracted.png")).toBe(true);
  });

  it("is true for a direct model-file storage key", () => {
    expect(isAutoThumbnail("org/model/v1/sources/photo-abc.png")).toBe(true);
  });

  it("is false for null", () => {
    expect(isAutoThumbnail(null)).toBe(false);
  });

  it("is false for an explicit preview upload", () => {
    expect(isAutoThumbnail("org/model/v1/artifacts/preview.jpg")).toBe(false);
  });

  it("is false for a viewer-generated snapshot", () => {
    expect(isAutoThumbnail("org/model/v1/artifacts/preview-generated.png")).toBe(false);
  });
});

describe("removedFileWasThumbnailSource", () => {
  it("is true when a removed image matches the thumbnail key", () => {
    expect(
      removedFileWasThumbnailSource(
        { extension: "png", storageKey: "keys/photo.png" },
        "keys/photo.png",
      ),
    ).toBe(true);
  });

  it("is false when a removed image does not match the thumbnail key", () => {
    expect(
      removedFileWasThumbnailSource(
        { extension: "png", storageKey: "keys/other.png" },
        "keys/photo.png",
      ),
    ).toBe(false);
  });

  it("is true when a removed 3mf backs an extracted preview", () => {
    expect(
      removedFileWasThumbnailSource(
        { extension: "3mf", storageKey: "keys/model.3mf" },
        "org/model/v1/artifacts/preview-extracted.png",
      ),
    ).toBe(true);
  });

  it("is false when a removed 3mf does not back an extracted preview", () => {
    expect(
      removedFileWasThumbnailSource(
        { extension: "3mf", storageKey: "keys/model.3mf" },
        "org/model/v1/artifacts/preview.jpg",
      ),
    ).toBe(false);
  });

  it("is false for other extensions", () => {
    expect(
      removedFileWasThumbnailSource(
        { extension: "stl", storageKey: "keys/model.stl" },
        "keys/model.stl",
      ),
    ).toBe(false);
  });
});

describe("extractThumbnailKeyFromBuffer", () => {
  it("uploads the extracted thumbnail as png and returns its key", async () => {
    const buffer = await build3MF(true);
    const key = await extractThumbnailKeyFromBuffer({ ...EXTRACT_OPTS, buffer });

    expect(key).toBe("org_1/model_1/v1/artifacts/preview-extracted.png");
    expect(state.uploadCalls).toHaveLength(1);
    expect(state.uploadCalls[0]).toEqual({ key, contentType: "image/png" });
  });

  it("returns null when the 3mf has no embedded thumbnail", async () => {
    const buffer = await build3MF(false);
    const key = await extractThumbnailKeyFromBuffer({ ...EXTRACT_OPTS, buffer });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns null for a corrupt buffer", async () => {
    const key = await extractThumbnailKeyFromBuffer({
      ...EXTRACT_OPTS,
      buffer: Buffer.from("not a zip"),
    });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns null silently when the upload throws", async () => {
    state.uploadShouldThrow = true;
    const buffer = await build3MF(true);
    const key = await extractThumbnailKeyFromBuffer({ ...EXTRACT_OPTS, buffer });

    expect(key).toBeNull();
  });
});

describe("extractFallbackThumbnailKey", () => {
  it("extracts from the first 3mf file and returns its key", async () => {
    const buffer = await build3MF(true);
    const file = fileFrom(new Uint8Array(buffer), "model.3mf");
    const key = await extractFallbackThumbnailKey({ ...EXTRACT_OPTS, files: [file] });

    expect(key).toBe("org_1/model_1/v1/artifacts/preview-extracted.png");
    expect(state.uploadCalls).toHaveLength(1);
  });

  it("returns null when there is no 3mf file", async () => {
    const file = fileFrom(new Uint8Array([1, 2, 3]), "model.stl");
    const key = await extractFallbackThumbnailKey({ ...EXTRACT_OPTS, files: [file] });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });
});

describe("deriveAddedFileThumbnailKey", () => {
  it("returns the storage key of an added image without touching the file", async () => {
    const file = {
      name: "photo.png",
      arrayBuffer: async () => {
        throw new Error("must not be read");
      },
    } as unknown as File;

    const key = await deriveAddedFileThumbnailKey({
      ...EXTRACT_OPTS,
      file,
      extension: "png",
      storageKey: "keys/photo.png",
    });

    expect(key).toBe("keys/photo.png");
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("extracts and uploads the embedded preview of an added 3mf", async () => {
    const buffer = await build3MF(true);
    const file = fileFrom(new Uint8Array(buffer), "model.3mf");

    const key = await deriveAddedFileThumbnailKey({
      ...EXTRACT_OPTS,
      file,
      extension: "3mf",
      storageKey: "keys/model.3mf",
    });

    expect(key).toBe("org_1/model_1/v1/artifacts/preview-extracted.png");
    expect(state.uploadCalls).toHaveLength(1);
    expect(state.uploadCalls[0]?.contentType).toBe("image/png");
  });

  it("returns null for a non-candidate extension", async () => {
    const file = fileFrom(new Uint8Array([1, 2, 3]), "model.stl");

    const key = await deriveAddedFileThumbnailKey({
      ...EXTRACT_OPTS,
      file,
      extension: "stl",
      storageKey: "keys/model.stl",
    });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns null when the 3mf has no embedded thumbnail", async () => {
    const buffer = await build3MF(false);
    const file = fileFrom(new Uint8Array(buffer), "model.3mf");

    const key = await deriveAddedFileThumbnailKey({
      ...EXTRACT_OPTS,
      file,
      extension: "3mf",
      storageKey: "keys/model.3mf",
    });

    expect(key).toBeNull();
  });

  it("returns null silently when reading the file throws", async () => {
    const file = {
      name: "model.3mf",
      arrayBuffer: async () => {
        throw new Error("read failed");
      },
    } as unknown as File;

    const key = await deriveAddedFileThumbnailKey({
      ...EXTRACT_OPTS,
      file,
      extension: "3mf",
      storageKey: "keys/model.3mf",
    });

    expect(key).toBeNull();
  });
});

describe("recomputeThumbnailKey", () => {
  it("returns an image storage key directly without re-uploading", async () => {
    const key = await recomputeThumbnailKey({
      ...EXTRACT_OPTS,
      files: [{ extension: "png", storageKey: "keys/photo.png" }],
    });

    expect(key).toBe("keys/photo.png");
    expect(state.uploadCalls).toHaveLength(0);
    expect(storageService.getFile).not.toHaveBeenCalled();
  });

  it("fetches a 3mf from storage and extracts its thumbnail", async () => {
    const buffer = await build3MF(true);
    state.getFileBody = new Uint8Array(buffer);

    const key = await recomputeThumbnailKey({
      ...EXTRACT_OPTS,
      files: [{ extension: "3mf", storageKey: "keys/model.3mf" }],
    });

    expect(storageService.getFile).toHaveBeenCalledWith("keys/model.3mf");
    expect(key).toBe("org_1/model_1/v1/artifacts/preview-extracted.png");
    expect(state.uploadCalls).toHaveLength(1);
  });

  it("returns null when there is no candidate", async () => {
    const key = await recomputeThumbnailKey({
      ...EXTRACT_OPTS,
      files: [{ extension: "stl", storageKey: "keys/model.stl" }],
    });

    expect(key).toBeNull();
  });

  it("returns null when there are no remaining files", async () => {
    const key = await recomputeThumbnailKey({ ...EXTRACT_OPTS, files: [] });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns null when the remaining 3mf has no embedded thumbnail", async () => {
    const buffer = await build3MF(false);
    state.getFileBody = new Uint8Array(buffer);

    const key = await recomputeThumbnailKey({
      ...EXTRACT_OPTS,
      files: [{ extension: "3mf", storageKey: "keys/model.3mf" }],
    });

    expect(key).toBeNull();
    expect(state.uploadCalls).toHaveLength(0);
  });

  it("returns null silently when fetching the 3mf from storage throws", async () => {
    state.getFileShouldThrow = true;

    const key = await recomputeThumbnailKey({
      ...EXTRACT_OPTS,
      files: [{ extension: "3mf", storageKey: "keys/model.3mf" }],
    });

    expect(key).toBeNull();
  });
});
