import { getTrustedOrigins } from "@/lib/trusted-origins";

const normalizeOrigin = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const isTrustedRequestOrigin = (request: Request): boolean => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  const trustedOrigins = new Set(
    getTrustedOrigins(request)
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)),
  );

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) {
    return trustedOrigins.has(origin);
  }

  const refererOrigin = normalizeOrigin(request.headers.get("referer"));
  if (refererOrigin) {
    return trustedOrigins.has(refererOrigin);
  }

  return true;
};

export const crossSiteBlockedResponse = () =>
  Response.json({ error: "Cross-site request blocked." }, { status: 403 });
