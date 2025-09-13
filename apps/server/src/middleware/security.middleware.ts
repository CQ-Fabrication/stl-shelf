import type { MiddlewareHandler } from 'hono';
import { env } from '@/env';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  // Basic hardening headers (for all environments)
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (!isDevelopment) {
    // HSTS in production
    c.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    
    // Minimal CSP for API responses
    const allowedOrigins = env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : [];
    const connectSrc = ["'self'", ...allowedOrigins];
    const csp = [
      "default-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      `connect-src ${connectSrc.join(' ')}`,
    ].join('; ');
    c.header('Content-Security-Policy', csp);
  }

  await next();
};