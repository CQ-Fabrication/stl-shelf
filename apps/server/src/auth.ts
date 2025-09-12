import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha, organization } from 'better-auth/plugins';
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
  // Prefer built-in header extraction for client IP (works with rateLimit)
  // Example mirrors BetterAuth docs for Cloudflare
  // You can add more headers if needed
  // Built-in rate limit configuration (per docs)
  rateLimit: {
    // Default limiter applied to routes without explicit settings
    window: '1m',
    max: 15,
    routes: {
      // Email/password sign-in attempts
      signInEmail: { window: '1m', max: 3 },
      // Sign-up attempts
      signUpEmail: { window: '1m', max: 3 },
      // Magic/verification emails
      sendVerificationEmail: { window: '5m', max: 3 },
      // Social auth initiations (conservative)
      oauth: { window: '1m', max: 20 },
    },
  },
  // Session management (see BetterAuth docs)
  // - Rolling sessions keep active users logged in by extending expiration
  // - Max sessions limits the number of concurrent devices
  // - ExpiresIn controls total lifetime
  session: {
    // Total session lifetime (seconds)
    expiresIn: 60 * 60 * 24, // 1 day
    // Enable rolling/idle extension (sliding expiration)
    rolling: true,
    // How often to extend the session on activity (seconds)
    rollingDuration: 60 * 60 * 24, // 1 day
    // Limit concurrent sessions per user
    maxSessions: 3,
    // Regenerate session on login
    regenerateOnLogin: true,
  },
  // Plugins
  // Organization + captcha
  plugins: [
    organization({
      organizationLimit: 1,
    }),
    captcha({
      provider: 'cloudflare-turnstile',
      endpoints: ['/login', '/signup', '/verify'],
      secretKey: env.TURNSTILE_SECRET_KEY,
    }),
  ],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { ...authSchema },
  }),

  // Email/password auth
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Password reset configuration
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour in seconds
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email?: string };
      url: string;
    }) => {
      if (smtpTransport) {
        await smtpTransport.sendMail({
          from: env.SMTP_FROM ?? 'STL Shelf <no-reply@local.test>',
          to: user.email ?? '',
          subject: 'Reset your password',
          text: `You requested a password reset for your STL Shelf account.\n\nClick the link below to reset your password:\n${url}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Reset your password</h2>
              <p>You requested a password reset for your STL Shelf account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="margin: 30px 0;">
                <a href="${url}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 14px; word-break: break-all;">${url}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.</p>
            </div>
          `,
        });
      } else {
        console.log(`[auth] Password reset link for ${user.email}: ${url}`);
      }
    },
    onPasswordReset: ({ user }: { user: { email?: string } }) => {
      console.log(`[auth] Password reset completed for user: ${user.email}`);
    },
  },

  // Email verification flow (used for magic/verification emails)
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email?: string };
      url: string;
    }) => {
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
