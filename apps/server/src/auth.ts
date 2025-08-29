import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha } from 'better-auth/plugins';
// import { github, google } from 'better-auth/social-providers';
import nodemailer from 'nodemailer';
import { db } from './db/client';
// biome-ignore lint/performance/noNamespaceImport: we need the schema
import * as authSchema from './db/schema/better-auth-schema';
import { env } from './env';

// Better Auth + Drizzle (Postgres) — per docs
const isProd = env.NODE_ENV === 'production';

// Runtime security validations for production
function assertConfig(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[auth config] ${message}`);
  }
}

if (isProd) {
  // AUTH_URL must be https in production
  assertConfig(
    !!env.AUTH_URL && /^https:\/\//i.test(env.AUTH_URL),
    'AUTH_URL must be set and use HTTPS in production'
  );
  // WEB_URL must be present
  assertConfig(!!env.WEB_URL, 'WEB_URL must be set in production');
  // Turnstile secret must be set for captcha-protected endpoints
  assertConfig(
    !!env.TURNSTILE_SECRET_KEY,
    'TURNSTILE_SECRET_KEY must be set in production'
  );
  // Cookie domain, if set, must be a bare domain
  if (env.AUTH_COOKIE_DOMAIN) {
    assertConfig(
      !/\:\/\//.test(env.AUTH_COOKIE_DOMAIN) && !/\//.test(env.AUTH_COOKIE_DOMAIN),
      'AUTH_COOKIE_DOMAIN must be a bare domain (no scheme or path)'
    );
  }
}

// Optional SMTP transport for verification emails (Mailpit in dev via docker-compose)
const smtpTransport =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      })
    : null;

export const auth = betterAuth({
  appName: 'STL Shelf',
  baseURL: env.AUTH_URL ?? `http://localhost:${env.PORT}`,
  basePath: '/auth',
  // Allow the web app origin to call auth API (origin check)
  trustedOrigins: [env.WEB_URL ?? 'http://localhost:3001'],
  // Prefer built-in header extraction for client IP (works with rateLimit)
  // Example mirrors BetterAuth docs for Cloudflare
  // You can add more headers if needed
  // Built-in rate limit configuration (per docs)
  rateLimit: {
    // Default limiter applied to routes without explicit settings
    window: '1m',
    max: 20,
    routes: {
      // Email/password sign-in attempts
      signInEmail: { window: '1m', max: 10 },
      // Sign-up attempts
      signUpEmail: { window: '1m', max: 5 },
      // Magic/verification emails
      sendVerificationEmail: { window: '1m', max: 5 },
      // Social auth initiations (conservative)
      oauth: { window: '1m', max: 20 },
    },
  },
  // Session management (see BetterAuth docs)
  // - Rolling sessions keep active users logged in by extending expiration
  // - Max sessions limits the number of concurrent devices
  // - ExpiresIn controls total lifetime
  session: {
    // Total session lifetime
    expiresIn: '30d',
    // Enable rolling/idle extension (sliding expiration)
    rolling: true,
    // How often to extend the session on activity
    rollingDuration: '1d',
    // Limit concurrent sessions per user
    maxSessions: 10,
  },
  // Plugins
  // Enable captcha on sign-in/up flows via Turnstile
  // Docs: https://www.better-auth.com/docs/plugins/captcha
  plugins: [
    captcha({
      provider: 'cloudflare-turnstile',
      secretKey: env.TURNSTILE_SECRET_KEY ?? '',
      endpoints: ['/login', '/signup', '/auth/send-verification-email'],
    }),
  ],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),

  // Email/password auth
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  // Email verification flow (used for magic/verification emails)
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (smtpTransport) {
        await smtpTransport.sendMail({
          from: env.SMTP_FROM ?? 'STL Shelf <no-reply@local.test>',
          to: user.email ?? '',
          subject: 'Verify your email',
          text: `Click to verify: ${url}`,
          html: `<p>Click to verify: <a href="${url}">${url}</a></p>`,
        });
      } else {
        console.log(`[auth] Verification link for ${user.email}: ${url}`);
      }
    },
    sendOnSignUp: true,
  },

  // OAuth providers
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      enabled: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  },

  // Cookie behavior
  advanced: {
    ipAddress: {
      // Cloudflare specific header
      ipAddressHeaders: ['cf-connecting-ip'],
    },
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      domain: env.AUTH_COOKIE_DOMAIN || undefined,
      httpOnly: true,
      path: '/',
    },
  },
} as unknown as Parameters<typeof betterAuth>[0]);
