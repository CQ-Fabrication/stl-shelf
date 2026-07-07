import { storageService } from "@/server/services/storage";
import { extractThumbnailFrom3MF, is3MFFile } from "@/server/services/parsers";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const EXTRACTED_THUMBNAIL_FILENAME = "preview-extracted.png";
const GENERATED_THUMBNAIL_FILENAME = "preview-generated.png";

export type ThumbnailFile = {
  extension: string;
  storageKey: string;
};

export type ThumbnailCandidate =
  | { kind: "image"; key: string }
  | { kind: "3mf"; storageKey: string };

type ExtractOptions = {
  organizationId: string;
  modelId: string;
  version: string;
};

/**
 * Pick the thumbnail source among a version's files.
 * User-uploaded images win over 3MF embedded previews (uploading a photo signals intent);
 * the first image (by input order) wins, then the first 3MF, else nothing.
 */
export function selectThumbnailCandidate(files: ThumbnailFile[]): ThumbnailCandidate | null {
  const image = files.find((file) => IMAGE_EXTENSIONS.has(file.extension.toLowerCase()));
  if (image) {
    return { kind: "image", key: image.storageKey };
  }

  const threeMF = files.find((file) => file.extension.toLowerCase() === "3mf");
  if (threeMF) {
    return { kind: "3mf", storageKey: threeMF.storageKey };
  }

  return null;
}

/**
 * True only for auto-derived thumbnails, which are safe to recompute/overwrite on file changes:
 * an extracted 3MF preview, or a key pointing directly at a model file's storageKey.
 * Explicit uploads (`preview.<ext>`) and viewer snapshots (`preview-generated.png`) express
 * user/feature intent and must never be treated as auto.
 */
export function isAutoThumbnail(thumbnailPath: string | null): boolean {
  if (!thumbnailPath) {
    return false;
  }

  const filename = thumbnailPath.split("/").pop() ?? thumbnailPath;
  if (filename === EXTRACTED_THUMBNAIL_FILENAME) {
    return true;
  }
  if (filename === GENERATED_THUMBNAIL_FILENAME) {
    return false;
  }
  if (/^preview\.[^.]+$/.test(filename)) {
    return false;
  }

  return true;
}

/**
 * Whether a removed file is the source of the current thumbnail:
 * for images the thumbnail key equals the file's storageKey; for 3MF the thumbnail is its
 * extracted preview.
 */
export function removedFileWasThumbnailSource(
  removed: ThumbnailFile,
  thumbnailPath: string,
): boolean {
  const extension = removed.extension.toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return removed.storageKey === thumbnailPath;
  }
  if (extension === "3mf") {
    return thumbnailPath.endsWith(EXTRACTED_THUMBNAIL_FILENAME);
  }
  return false;
}

/**
 * Extract a 3MF embedded thumbnail from a buffer and upload it as an artifact.
 * Silent fallback: any failure returns null so thumbnail work never fails the caller.
 */
export async function extractThumbnailKeyFromBuffer(
  options: ExtractOptions & { buffer: Buffer },
): Promise<string | null> {
  const { buffer, organizationId, modelId, version } = options;

  try {
    const thumbnail = await extractThumbnailFrom3MF(buffer);
    if (!thumbnail) {
      return null;
    }

    const previewKey = storageService.generateStorageKey({
      organizationId,
      modelId,
      version,
      filename: EXTRACTED_THUMBNAIL_FILENAME,
      kind: "artifact",
    });

    await storageService.uploadFile({
      key: previewKey,
      file: thumbnail,
      contentType: "image/png",
    });

    return previewKey;
  } catch {
    return null;
  }
}

/**
 * Extract a thumbnail from the first 3MF file in the uploaded files.
 * Silent fallback: any failure returns null.
 */
export async function extractFallbackThumbnailKey(
  options: ExtractOptions & { files: File[] },
): Promise<string | null> {
  const { files, organizationId, modelId, version } = options;

  const threeMFFile = files.find((file) => is3MFFile(file.name));
  if (!threeMFFile) {
    return null;
  }

  try {
    const buffer = Buffer.from(await threeMFFile.arrayBuffer());
    return await extractThumbnailKeyFromBuffer({ buffer, organizationId, modelId, version });
  } catch {
    return null;
  }
}

/**
 * Derive a thumbnail key from a single file just added to a version.
 * Images use their own storage key directly; 3MF files get their embedded preview extracted.
 * Silent fallback: any failure returns null.
 */
export async function deriveAddedFileThumbnailKey(
  options: ExtractOptions & { file: File; extension: string; storageKey: string },
): Promise<string | null> {
  const { file, extension, storageKey, organizationId, modelId, version } = options;

  const candidate = selectThumbnailCandidate([{ extension, storageKey }]);
  if (!candidate) {
    return null;
  }

  if (candidate.kind === "image") {
    return candidate.key;
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return await extractThumbnailKeyFromBuffer({ buffer, organizationId, modelId, version });
  } catch {
    return null;
  }
}

/**
 * Recompute the thumbnail key from a version's remaining files.
 * Images are returned directly (no re-upload); 3MF files are fetched from storage and extracted.
 * Silent fallback: any failure returns null.
 */
export async function recomputeThumbnailKey(
  options: ExtractOptions & { files: ThumbnailFile[] },
): Promise<string | null> {
  const { files, organizationId, modelId, version } = options;

  const candidate = selectThumbnailCandidate(files);
  if (!candidate) {
    return null;
  }

  if (candidate.kind === "image") {
    return candidate.key;
  }

  try {
    const file = await storageService.getFile(candidate.storageKey);
    const buffer = Buffer.from(file.body);
    return await extractThumbnailKeyFromBuffer({ buffer, organizationId, modelId, version });
  } catch {
    return null;
  }
}
