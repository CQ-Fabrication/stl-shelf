import { env } from "@/lib/env";

const parseOrigins = (value?: string): string[] =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? [];

const normalizeOrigin = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};

const isDevTunnel = (origin: string): boolean =>
  origin.endsWith(".ngrok-free.dev") ||
  origin.endsWith(".ngrok-free.app") ||
  origin.endsWith(".ngrok.io");

export const getTrustedOrigins = (request?: Request): string[] => {
  const configured = parseOrigins(env.AUTH_TRUSTED_ORIGINS);
  const defaults = [
    env.WEB_URL,
    env.AUTH_URL,
    `http://localhost:${env.PORT}`,
    "http://localhost:3000",
    env.NGROK_DOMAIN ? `https://${env.NGROK_DOMAIN}` : null,
  ].filter(Boolean) as string[];

  const origins = configured.length > 0 ? configured : defaults;

  if (env.NODE_ENV !== "production" && request) {
    const originHeader = request.headers.get("origin") || request.headers.get("referer");
    const normalized = normalizeOrigin(originHeader);
    if (normalized && isDevTunnel(normalized)) {
      origins.push(normalized);
    }
  }

  return Array.from(new Set(origins));
};
