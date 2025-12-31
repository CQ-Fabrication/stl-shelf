const DEFAULT_SLUG_FALLBACK = "item";

/**
 * Convert arbitrary text into a URL and filesystem friendly slug.
 * Collapse whitespace, strip special characters, and trim separators.
 */
export function slugify(
  value: string,
  fallback = DEFAULT_SLUG_FALLBACK
): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || fallback;
}
