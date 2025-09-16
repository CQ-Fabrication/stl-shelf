import type { MiddlewareHandler } from 'hono';
import { auth } from '@/auth';
import type { Session } from '@/lib/context';

// Single REST auth middleware: fetch BetterAuth session once and require it.
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const session = (await auth.api.getSession({
      headers: c.req.raw.headers,
    })) as Session | null;

    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('session', session);
    return next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};
