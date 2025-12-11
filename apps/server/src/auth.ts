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
import { z } from "zod";
import type { Database } from "./db/client";
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

// Email validation schema
const emailSchema = z.string().email().max(255);

// Lazy-initialized Resend client for transactional emails
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/** Validates email format before sending */
function validateEmail(email: string | undefined): string {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    throw new Error("Invalid email address");
  }
  return result.data;
}

// Polar.sh client for billing
const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

/**
 * Create Better Auth instance with per-request database connection
 *
 * Per Hono + Better Auth on Cloudflare pattern:
 * https://hono.dev/examples/better-auth-on-cloudflare
 *
 * The auth instance must be created per-request to use Hyperdrive
 * since the database connection is only available at request time.
 */
export function createAuth(db: Database) {
  return betterAuth({
    appName: "STL Shelf",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.AUTH_URL ?? `http://localhost:${env.PORT}`,
    basePath: "/api/auth",
    // Allow the web app origin to call auth API (origin check)
    trustedOrigins: [env.WEB_URL ?? "http://localhost:3001"],
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
    // Session management
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
    plugins: [
      organization({
        organizationLimit: 1,
        // Tell Better Auth about our custom fields so it passes them to the adapter
        schema: {
          organization: {
            additionalFields: {
              ownerId: {
                type: "string",
                required: true,
              },
              polarCustomerId: {
                type: "string",
                required: false,
              },
              subscriptionTier: {
                type: "string",
                required: true,
                defaultValue: "free",
              },
              subscriptionStatus: {
                type: "string",
                required: true,
                defaultValue: "active",
              },
              subscriptionId: {
                type: "string",
                required: false,
              },
              storageLimit: {
                type: "number",
                required: true,
                defaultValue: 104_857_600, // 100MB
              },
              modelCountLimit: {
                type: "number",
                required: true,
                defaultValue: 20,
              },
              memberLimit: {
                type: "number",
                required: true,
                defaultValue: 1,
              },
              currentStorage: {
                type: "number",
                required: true,
                defaultValue: 0,
              },
              currentModelCount: {
                type: "number",
                required: true,
                defaultValue: 0,
              },
              currentMemberCount: {
                type: "number",
                required: true,
                defaultValue: 1,
              },
            },
          },
        },
        organizationHooks: {
          // Set ownerId to the user who created the organization
          beforeCreateOrganization: async ({ organization, user }) => {
            return {
              data: {
                ...organization,
                ownerId: user.id,
              },
            };
          },
        },
      }),
      captcha({
        provider: "cloudflare-turnstile",
        endpoints: ["/sign-in/email", "/sign-up/email"],
        secretKey: env.TURNSTILE_SECRET_KEY,
      }),
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          const validEmail = validateEmail(email);
          const html = await render(
            MagicLinkTemplate({
              magicLinkUrl: url,
              logoUrl: env.EMAIL_LOGO_URL,
            })
          );
          const { error } = await getResendClient().emails.send({
            from: env.EMAIL_FROM,
            to: validEmail,
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
        const validEmail = validateEmail(user.email);
        const html = await render(
          PasswordResetTemplate({
            resetUrl: url,
            logoUrl: env.EMAIL_LOGO_URL,
          })
        );
        const { error } = await getResendClient().emails.send({
          from: env.EMAIL_FROM,
          to: validEmail,
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
        const validEmail = validateEmail(user.email);
        const html = await render(
          VerifyEmailTemplate({
            verificationUrl: url,
            logoUrl: env.EMAIL_LOGO_URL,
          })
        );
        const { error } = await getResendClient().emails.send({
          from: env.EMAIL_FROM,
          to: validEmail,
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
}

/** Auth instance type for type-safe usage */
export type Auth = ReturnType<typeof createAuth>;
