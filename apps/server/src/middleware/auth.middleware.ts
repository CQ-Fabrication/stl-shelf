import type { MiddlewareHandler } from 'hono';
import { auth } from '@/auth';
import type { Session } from '@/lib/context';

// Use the Session type from context which already has activeOrganizationId
type AuthContext = {
  userId: string;
  organizationId: string;
  session: Session;
};

// Attach session to context
export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const session = (await auth.api.getSession({
      headers: c.req.raw.headers,
    })) as Session | null;
    c.set('session', session);

    // If we have a valid session with organization, set auth context
    if (session?.user?.id && session?.session?.activeOrganizationId) {
      c.set('auth', {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId,
        session,
      } satisfies AuthContext);
    }
  } catch {
    c.set('session', null);
  }
  await next();
};

// Email verification middleware - currently disabled
// TODO: Re-enable when email verification flow is properly implemented
export const emailVerificationMiddleware: MiddlewareHandler = async (
  _c,
  next
) => {
  // Skip verification for now - emails are auto-verified in development
  await next();
};

// Login wall - require authentication for protected routes
export const loginWallMiddleware: MiddlewareHandler = async (c, next) => {
  const pathname = new URL(c.req.url).pathname;

  // Public routes
  if (pathname.startsWith('/auth') || pathname === '/health') {
    return next();
  }

  const session = c.get('session');
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};

// Require authenticated context with organization
export const requireAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const authContext = c.get('auth') as AuthContext | undefined;

  if (!(authContext?.userId && authContext?.organizationId)) {
    return c.json({ error: 'Unauthorized - No active organization' }, 401);
  }

  await next();
};
