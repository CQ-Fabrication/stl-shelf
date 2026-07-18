/**
 * Stable, unsigned thumbnail proxy URLs.
 *
 * These replace per-request presigned OS URLs (which changed on every render,
 * defeating the browser cache and producing unmeasured direct egress). The
 * proxy routes authenticate via the session cookie and bind the resource to
 * the session's active organization — possessing a URL grants nothing.
 * Relative URLs: same-origin requests carry the session cookie automatically.
 */
export const versionThumbnailUrl = (versionId: string): string =>
  `/api/thumbnails/version/${versionId}`;

export const printProfileThumbnailUrl = (profileId: string): string =>
  `/api/thumbnails/print-profile/${profileId}`;
