const CONTROL_CHARACTER_PATTERN = /[\p{Cc}]/gu;
const PATH_SEPARATOR_PATTERN = /[\\/]+/g;
const LEADING_DOTS_PATTERN = /^\.+/;
const MULTIPLE_SPACES_PATTERN = /\s+/g;
const NON_ASCII_PATTERN = /[^\x20-\x7E]/g;
const HEADER_UNSAFE_PATTERN = /["\\;]/g;
const MAX_FILENAME_LENGTH = 255;

type ContentDispositionType = "attachment" | "inline";

function sanitizeLeaf(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTER_PATTERN, "")
    .replace(PATH_SEPARATOR_PATTERN, "/")
    .trim();

  const leaf = normalized.split("/").pop() ?? "";
  return leaf.replace(LEADING_DOTS_PATTERN, "").replace(MULTIPLE_SPACES_PATTERN, " ").trim();
}

function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function sanitizeFilename(filename: string | null | undefined, fallback = "file"): string {
  const safeName = sanitizeLeaf(typeof filename === "string" ? filename : "");
  const safeFallback = sanitizeLeaf(fallback);
  const result = safeName || safeFallback || "file";
  return result.slice(0, MAX_FILENAME_LENGTH);
}

export function createContentDisposition(
  type: ContentDispositionType,
  filename: string | null | undefined,
  fallback = "download",
): string {
  const safeFilename = sanitizeFilename(filename, fallback);
  const asciiFilename =
    safeFilename
      .normalize("NFKD")
      .replace(NON_ASCII_PATTERN, "_")
      .replace(HEADER_UNSAFE_PATTERN, "_")
      .replace(MULTIPLE_SPACES_PATTERN, " ")
      .trim() || sanitizeFilename(fallback, "download");

  const escapedAsciiFilename = asciiFilename.replace(/["\\]/g, "\\$&");
  return `${type}; filename="${escapedAsciiFilename}"; filename*=UTF-8''${encodeRFC5987(safeFilename)}`;
}

export function createArchiveEntryPath(options: {
  folder: string;
  filename: string | null | undefined;
  subfolder?: string;
  fallbackFilename?: string;
}): string {
  const folder = sanitizeFilename(options.folder, "files");
  const filename = sanitizeFilename(options.filename, options.fallbackFilename ?? "file");
  if (options.subfolder) {
    const subfolder = sanitizeFilename(options.subfolder, "files");
    return `${folder}/${subfolder}/${filename}`;
  }
  return `${folder}/${filename}`;
}
