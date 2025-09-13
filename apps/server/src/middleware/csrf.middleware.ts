import type { MiddlewareHandler } from 'hono';
import { env } from '@/env';

// CSRF protection via Origin validation for state-changing requests
export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const origin = c.req.header('Origin');
  const allowedOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['http://localhost:3001', 'http://127.0.0.1:3001'];

  if (!(origin && allowedOrigins.includes(origin))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await next();
};
