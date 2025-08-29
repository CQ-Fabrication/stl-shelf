import type { Context } from 'hono';
import { Hono } from 'hono';
import { db } from './db/client';
import { env } from './env';

// We import lazily inside a function so the file can be parsed even if
// dependencies aren’t installed yet (useful for CI / codegen steps).
async function createAuth() {
  const { betterAuth } = await import('better-auth');
  const { drizzleAdapter } = await import('better-auth/adapters/drizzle');
  // Server API helpers (no framework adapter needed)
  const api = await import('better-auth/api');
  const nodemailer = await import('nodemailer');

  // Configure cookie/session behavior for local dev and Cloudflare
  const isProd = env.NODE_ENV === 'production';
  const cookieSecure = isProd;
  const cookieSameSite = isProd ? ('none' as const) : ('lax' as const);

  // Prepare optional SMTP transport (Mailpit in dev)
  const smtpHost = env.SMTP_HOST;
  const smtpPort = env.SMTP_PORT;
  const smtpUser = env.SMTP_USER;
  const smtpPass = env.SMTP_PASS;
  const smtpFrom = env.SMTP_FROM;

  const hasSmtp = Boolean(smtpHost && smtpPort);
  const transporter = hasSmtp
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth:
          smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      })
    : null;

  const auth = betterAuth({
    appName: 'STL Shelf',
    // Base/backend URL for the auth server
    baseURL: process.env.AUTH_URL ?? `http://localhost:${env.PORT}`,
    // Public web URL for redirects (login, email magic links, etc.)
    webURL: process.env.WEB_URL ?? 'http://localhost:3001',

    // Drizzle adapter with Postgres
    database: drizzleAdapter(db as unknown as Record<string, any>, {
      provider: 'pg',
      usePlural: true,
    }),

    // Email (magic link) + password + passkeys + social providers
    email: {
      enabled: true,
      // Send via SMTP when configured (Mailpit in dev), otherwise log
      send: async ({ to, url }: { to: string; url: string }) => {
        if (transporter) {
          await transporter.sendMail({
            from: smtpFrom,
            to,
            subject: 'Your STL Shelf sign-in link',
            text: `Click to sign in: ${url}`,
            html: `<p>Click to sign in: <a href="${url}">${url}</a></p>`,
          });
        } else {
          console.log(`Magic link for ${to}: ${url}`);
        }
      },
    },
    password: {
      enabled: true,
    },
    webAuthn: {
      enabled: true,
      // Relying party defaults to your domain; can be customized with env
    },
    oauth: {
      github: {
        enabled: true,
        clientId: process.env.GITHUB_CLIENT_ID ?? '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      },
      google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },

    organizations: {
      enabled: true,
      // Default roles: owner, admin, member
    },

    cookies: {
      // Cross-site cookies on Cloudflare behind HTTPS need SameSite=None + Secure
      sameSite: cookieSameSite,
      secure: cookieSecure,
      domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    },
  });

  const authApp = new Hono();
  // Proxy all /auth/* requests to BetterAuth fetch handler
  authApp.all('/*', async (c) => {
    const res = await auth.handler(c.req.raw);
    return c.newResponse(res.body, res);
  });

  // Middleware that attaches session to context
  async function attachSession(c: Context, next: () => Promise<void>) {
    try {
      // Use BetterAuth bound API to read session from cookies
      const result = await auth.api.getSession({ headers: c.req.raw.headers });
      // Standard shape: { data: { user, session }, error: null }
      const sessionData = (result as any)?.data ?? null;
      c.set('session', sessionData);
    } catch {
      c.set('session', null);
    }
    await next();
  }

  // Enforce login wall for protected routes
  async function requireAuth(c: Context, next: () => Promise<void>) {
    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  }

  return { authApp, attachSession, requireAuth };
}

// Provide lazy exports so index.ts can import without top-level await.
export const authReady = createAuth();

export type AuthExports = Awaited<typeof authReady>;
