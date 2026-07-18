/**
 * Stable, unsigned thumbnail proxy URLs.
 *
 * These replace per-request presigned OS URLs (which changed on every render,
 * defeating the browser cache and producing unmeasured direct egress). The
 * proxy routes authenticate via the session cookie and bind the resource to
 * the session's active organization — possessing a URL grants nothing.
 * Relative URLs: same-origin requests carry the session cookie automatically.
 *
 * Cache-busting: the URL is otherwise stable, so with `max-age=86400` a browser
 * would keep showing a REPLACED thumbnail for up to 24h without revalidating.
 * A `v` query param derived from the owning row's `updatedAt` (epoch ms) changes
 * the URL whenever the thumbnail is explicitly mutated, forcing a fresh fetch.
 * The route ignores `v` entirely — it is purely a client-side cache key.
 */
export const versionThumbnailUrl = (versionId: string, updatedAt: Date): string =>
  `/api/thumbnails/version/${versionId}?v=${updatedAt.getTime()}`;

export const printProfileThumbnailUrl = (profileId: string, updatedAt: Date): string =>
  `/api/thumbnails/print-profile/${profileId}?v=${updatedAt.getTime()}`;
