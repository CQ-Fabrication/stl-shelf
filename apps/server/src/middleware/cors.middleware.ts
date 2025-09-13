import { cors } from 'hono/cors';
import { env } from '@/env';

export const corsMiddleware = cors({
  // CORS: echo back allowed origin; never wildcard when credentials are enabled
  origin: (origin) => {
    const allowedOrigins = env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',')
      : ['http://localhost:3001', 'http://127.0.0.1:3001'];
    // If no origin (e.g., non-browser), omit ACAO by returning null
    if (!origin) return null;
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86_400, // 24 hours
});
