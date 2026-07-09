/**
 * Resolve the real client IP behind Cloudflare + reverse proxies.
 *
 * CF-Connecting-IP is set by Cloudflare and always holds the true client
 * address. X-Forwarded-For is checked second because its first hop can be a
 * Cloudflare edge address (172.69.x, 172.70.x, ...) when the origin proxy
 * rewrites the chain, which made audit logs unattributable.
 */
export const extractClientIp = (headers: Headers): string | null => {
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFirstHop = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFirstHop) return forwardedFirstHop;

  return headers.get("x-real-ip")?.trim() || null;
};
