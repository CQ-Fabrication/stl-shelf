export const SITE_URL = "https://stl-shelf.com" as const;
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png` as const;

export function siteUrl(path = ""): string {
  if (!path) {
    return SITE_URL;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
