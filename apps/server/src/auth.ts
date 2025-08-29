import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// import { github, google } from 'better-auth/social-providers';
import nodemailer from 'nodemailer';
import { db } from './db/client';
// biome-ignore lint/performance/noNamespaceImport: we need the schema
import * as authSchema from './db/schema/better-auth-schema';
import { env } from './env';

// Better Auth + Drizzle (Postgres) — per docs
const isProd = env.NODE_ENV === 'production';

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
      enabled: true,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: true,
    },
  },

  // Cookie behavior
  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      domain: env.AUTH_COOKIE_DOMAIN || undefined,
      httpOnly: true,
      path: '/',
    },
  },
});
