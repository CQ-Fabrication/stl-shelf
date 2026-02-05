type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const checkRateLimit = (key: string, config: RateLimitConfig) => {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: bucket.resetAt,
    };
  }

  const nextCount = existing.count + 1;
  const allowed = nextCount <= config.max;

  buckets.set(key, { ...existing, count: nextCount });

  return {
    allowed,
    remaining: Math.max(0, config.max - nextCount),
    resetAt: existing.resetAt,
  };
};

export const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
};
