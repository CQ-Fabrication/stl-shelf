import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { render } from "@react-email/components";
import {
  MagicLinkTemplate,
  PasswordResetTemplate,
  VerifyEmailTemplate,
} from "@stl-shelf/email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha, magicLink, openAPI, organization } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db/client";
// biome-ignore lint/performance/noNamespaceImport: we need the schema
import * as authSchema from "./db/schema/better-auth-schema";
import { env } from "./env";
import { POLAR_PRODUCTS_CONFIG } from "./lib/billing/config";
import {
  handleCustomerStateChanged,
  handleOrderPaid,
  handleSubscriptionCanceled,
  handleSubscriptionCreated,
  handleSubscriptionRevoked,
} from "./lib/billing/webhook-handlers";

// Better Auth + Drizzle (Postgres) — per docs
const isProd = env.NODE_ENV === "production";

// Lazy-initialized Resend client for transactional emails
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

// Polar.sh client for billing
const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

export const auth = betterAuth({
  appName: "STL Shelf",
  baseURL: env.AUTH_URL ?? `http://localhost:${env.PORT}`,
  basePath: "/api/auth",
  // Allow the web app origin to call auth API (origin check)
  trustedOrigins: [env.WEB_URL ?? "http://localhost:3001"],
  // Prefer built-in header extraction for client IP (works with rateLimit)
  // Example mirrors BetterAuth docs for Cloudflare
  // You can add more headers if needed
  // Built-in rate limit configuration (per docs)
  rateLimit: {
    // Default limiter applied to routes without explicit settings
    window: "1m",
    max: 15,
    routes: {
      // Email/password sign-in attempts
      signInEmail: { window: "1m", max: 3 },
      // Sign-up attempts
      signUpEmail: { window: "1m", max: 3 },
      // Magic/verification emails
      sendVerificationEmail: { window: "5m", max: 3 },
      // Social auth initiations (conservative)
      oauth: { window: "1m", max: 20 },
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
  // Organization + captcha + billing
  plugins: [
    organization({
      organizationLimit: 1,
    }),
    captcha({
      provider: "cloudflare-turnstile",
      endpoints: ["/sign-in/email", "/sign-up/email"],
      secretKey: env.TURNSTILE_SECRET_KEY,
    }),
    magicLink({
      expiresIn: 60 * 15, // 15 minutes
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        if (!email) {
          throw new Error("Cannot send magic link: no email provided");
        }
        const html = await render(
          MagicLinkTemplate({
            magicLinkUrl: url,
            logoUrl: env.EMAIL_LOGO_URL,
          })
        );
        const { error } = await getResendClient().emails.send({
          from: env.EMAIL_FROM,
          to: email,
          subject: "Sign in to STL Shelf",
          html,
        });
        if (error) {
          throw new Error(`Failed to send magic link email: ${error.message}`);
        }
      },
    }),
    openAPI(),

    // Polar plugin for billing
    polar({
      client: polarClient,
      createCustomerOnSignUp: false, // Manual creation when org created
      use: [
        checkout({
          products: POLAR_PRODUCTS_CONFIG,
          successUrl: `${env.WEB_URL}/checkout/success?checkout_id={CHECKOUT_ID}`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onOrderPaid: handleOrderPaid,
          onSubscriptionCreated: handleSubscriptionCreated,
          onSubscriptionCanceled: handleSubscriptionCanceled,
          onSubscriptionRevoked: handleSubscriptionRevoked,
          onCustomerStateChanged: handleCustomerStateChanged,
        }),
      ],
    }),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
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
      if (!user.email) {
        throw new Error("Cannot send password reset: no email provided");
      }
      const html = await render(
        PasswordResetTemplate({
          resetUrl: url,
          logoUrl: env.EMAIL_LOGO_URL,
        })
      );
      const { error } = await getResendClient().emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Reset your password",
        html,
      });
      if (error) {
        throw new Error(
          `Failed to send password reset email: ${error.message}`
        );
      }
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
      if (!user.email) {
        throw new Error("Cannot send verification email: no email provided");
      }
      const html = await render(
        VerifyEmailTemplate({
          verificationUrl: url,
          logoUrl: env.EMAIL_LOGO_URL,
        })
      );
      const { error } = await getResendClient().emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Verify your email address",
        html,
      });
      if (error) {
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    },
    sendOnSignUp: true,
  },

  // OAuth providers
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? "",
      clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
      enabled: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  },

  // Cookie behavior
  advanced: {
    ipAddress: {
      // Cloudflare specific header
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      domain: env.AUTH_COOKIE_DOMAIN || undefined,
      httpOnly: true,
      path: "/",
    },
  },
} as unknown as Parameters<typeof betterAuth>[0]);
