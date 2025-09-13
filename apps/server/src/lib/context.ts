import type { Context as HonoContext } from 'hono';
import { auth } from '@/auth';
import { cacheService } from '@/services/cache';
import { PerformanceMonitor } from '@/lib/performance';

type BetterAuthSession = typeof auth.$Infer.Session;

export type Session = BetterAuthSession & {
  session: BetterAuthSession['session'] & {
    activeOrganizationId?: string;
  };
};

export type BaseContext = {
  session: Session | null;
};

export type AuthenticatedContext = {
  session: Session;
  organizationId: string;
};

export type Context = BaseContext | AuthenticatedContext;

export type CreateContextOptions = {
  context: HonoContext;
};

function extractSessionToken(headers: Headers): string | null {
  const cookie = headers.get('cookie');
  if (!cookie) return null;
  
  const match = cookie.match(/better-auth\.session_token=([^;]+)/);
  return match ? match[1] : null;
}

async function getCachedSession(c: HonoContext): Promise<Session | null> {
  const monitor = new PerformanceMonitor('context_get_session');
  
  try {
    const token = extractSessionToken(c.req.raw.headers);
    if (!token) return null;
    
    monitor.markStart('redis_cache_lookup');
    const cached = await cacheService.getCachedSession(token);
    monitor.markEnd('redis_cache_lookup');
    
    if (cached) {
      return cached as Session;
    }
    
    monitor.markStart('auth_api_getSession');
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      monitor.markEnd('auth_api_getSession');
      
      await cacheService.cacheSession(token, session);
      
      return session as Session | null;
    } catch {
      await cacheService.cacheSession(token, null);
      return null;
    }
  } finally {
    monitor.log();
  }
}

export async function createContext(_options: CreateContextOptions): Promise<BaseContext> {
  const pathname = new URL(_options.context.req.url).pathname;
  
  if (pathname.startsWith('/rpc/')) {
    const session = await getCachedSession(_options.context);
    return { session };
  }
  
  const session = _options.context.get('session') as Session | null;
  return { session };
}

export function isAuthenticatedContext(
  context: Context
): context is AuthenticatedContext {
  return context.session !== null && 'organizationId' in context;
}
