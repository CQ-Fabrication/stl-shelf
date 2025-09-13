import 'dotenv/config';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { auth } from './auth';
import { env } from './env';
import { fileServingHandler } from './handlers/file-serving.handler';
import { healthHandler } from './handlers/health.handler';
import { thumbnailHandler } from './handlers/thumbnail.handler';
// Handler imports
import { uploadHandler } from './handlers/upload.handler';
import { createContext } from './lib/context';
import {
  emailVerificationMiddleware,
  loginWallMiddleware,
  requireAuthMiddleware,
  sessionMiddleware,
} from './middleware/auth.middleware';
// Middleware imports
import { corsMiddleware } from './middleware/cors.middleware';
import { csrfMiddleware } from './middleware/csrf.middleware';
import { securityHeadersMiddleware } from './middleware/security.middleware';
import { appRouter } from './routers/index';

const app = new Hono();

// Development mode check
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log(
  `STL Shelf API starting in ${isDevelopment ? 'development' : 'production'} mode`
);

// Fail fast in production if CORS_ORIGIN is not configured
if (!(isDevelopment || env.CORS_ORIGIN)) {
  console.error('[startup] CORS_ORIGIN must be set in production');
  process.exit(1);
}

// Apply middleware in correct order
app.use(logger());
app.use('/*', corsMiddleware);
app.use('*', securityHeadersMiddleware);
app.use('*', emailVerificationMiddleware);
app.use('*', csrfMiddleware);

// Mount Better Auth under /auth
const authApp = new Hono();
authApp.all('/*', async (c) => {
  const res = await auth.handler(c.req.raw);
  return c.newResponse(res.body, res);
});
app.route('/auth', authApp);

// Session and auth middleware - only for non-RPC routes
app.use('/files/*', sessionMiddleware);
app.use('/thumbnails/*', sessionMiddleware);
app.use('/upload', sessionMiddleware);

app.use('/files/*', loginWallMiddleware);
app.use('/thumbnails/*', loginWallMiddleware);
app.use('/upload', loginWallMiddleware);

// Public routes (no auth required)
app.get('/health', healthHandler);

// File serving routes (protected - need explicit auth)
app.get(
  '/files/:modelId/:version/:filename',
  requireAuthMiddleware,
  fileServingHandler
);
app.get(
  '/thumbnails/:modelId/:version',
  requireAuthMiddleware,
  thumbnailHandler
);

// Protected routes (require auth context)
app.post('/upload', requireAuthMiddleware, uploadHandler);

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  const context = await createContext({ context: c });
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

export default app;
