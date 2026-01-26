import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha, magicLink, openAPI, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import {
  handleCustomerStateChanged,
  handleOrderPaid,
  handleSubscriptionCanceled,
  handleSubscriptionCreated,
  handleSubscriptionRevoked,
} from "@/lib/billing/webhook-handlers";
import {
  account as accountTable,
  db,
  invitation as invitationTable,
  member as memberTable,
  models,
  organization as organizationTable,
  session as sessionTable,
  user as userTable,
  verification as verificationTable,
} from "@/lib/db";
// Permission helpers available for future middleware/server function enforcement:
// import { canChangeRole, canRemoveMember, type Role } from "@/lib/permissions";
import { MagicLinkTemplate, PasswordResetTemplate, VerifyEmailTemplate } from "@/lib/email";
import { env } from "@/lib/env";
import { getTrustedOrigins } from "@/lib/trusted-origins";
import { syncResendSegments } from "@/server/services/marketing/resend-segments";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logAuditEvent, logErrorEvent } from "@/lib/logging";

const isProd = env.NODE_ENV === "production";

const emailSchema = z.string().email().max(255);

let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

function validateEmail(email: string | undefined): string {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    throw new Error("Invalid email address");
  }
  return result.data;
}

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

export const auth = betterAuth({
  appName: "STL Shelf",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.AUTH_URL ?? `http://localhost:${env.PORT}`,
  basePath: "/api/auth",
  trustedOrigins: (request) => getTrustedOrigins(request),
  rateLimit: {
    window: 60, // 1 minute in seconds
    max: 15,
    customRules: {
      "/sign-in/email": { window: 60, max: 3 },
      "/sign-up/email": { window: 60, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24, // 1 day in seconds
    updateAge: 60 * 60, // Refresh session every hour
  },
  plugins: [
    organization({
      organizationLimit: 1,
      schema: {
        organization: {
          additionalFields: {
            ownerId: {
              type: "string",
              input: false,
              required: false,
            },
            polarCustomerId: {
              type: "string",
              input: false,
              required: false,
            },
            subscriptionTier: {
              type: "string",
              input: false,
              required: false,
            },
            subscriptionStatus: {
              type: "string",
              input: false,
              required: false,
            },
            subscriptionId: {
              type: "string",
              input: false,
              required: false,
            },
            storageLimit: {
              type: "number",
              input: false,
              required: false,
            },
            modelCountLimit: {
              type: "number",
              input: false,
              required: false,
            },
            memberLimit: {
              type: "number",
              input: false,
              required: false,
            },
            currentStorage: {
              type: "number",
              input: false,
              required: false,
            },
            currentModelCount: {
              type: "number",
              input: false,
              required: false,
            },
            currentMemberCount: {
              type: "number",
              input: false,
              required: false,
            },
          },
        },
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization, user }) => {
          return {
            data: {
              ...organization,
              ownerId: user.id,
            },
          };
        },
        // Prevent users from joining multiple organizations (enforces organizationLimit: 1)
        beforeAcceptInvitation: async ({ user }) => {
          const existingMemberships = await db
            .select({ organizationId: memberTable.organizationId })
            .from(memberTable)
            .where(eq(memberTable.userId, user.id));

          if (existingMemberships.length > 0) {
            throw new Error(
              "You are already a member of an organization. Leave your current organization before joining another.",
            );
          }
        },
        beforeCreateInvitation: async ({ organization }) => {
          // Get current member count from DB
          const memberCount = await db
            .select({ count: memberTable.id })
            .from(memberTable)
            .where(eq(memberTable.organizationId, organization.id))
            .then((rows) => rows.length);

          // Get pending invitation count
          const pendingInvitationCount = await db
            .select({ count: invitationTable.id })
            .from(invitationTable)
            .where(
              and(
                eq(invitationTable.organizationId, organization.id),
                eq(invitationTable.status, "pending"),
              ),
            )
            .then((rows) => rows.length);

          const totalSlotsTaken = memberCount + pendingInvitationCount;
          const memberLimit = (organization as { memberLimit?: number }).memberLimit ?? 1;

          if (totalSlotsTaken >= memberLimit) {
            throw new Error(
              `Member limit reached. Your plan allows ${memberLimit} member${memberLimit > 1 ? "s" : ""}. Upgrade to invite more.`,
            );
          }
        },
        // RBAC: Transfer models to owner when member is removed
        beforeRemoveMember: async ({ user, organization }) => {
          const orgWithOwner = organization as { ownerId?: string };
          const ownerId = orgWithOwner.ownerId;

          if (!ownerId) {
            logErrorEvent("rbac.model_transfer_failed", {
              reason: "Organization has no ownerId",
              organizationId: organization.id,
              removedUserId: user.id,
            });
            return;
          }

          // Don't transfer if removing the owner (shouldn't happen, but safety check)
          if (user.id === ownerId) {
            throw new Error("Cannot remove the organization owner");
          }

          // Transfer all models owned by this user to the org owner
          const userModels = await db
            .select({ id: models.id })
            .from(models)
            .where(and(eq(models.ownerId, user.id), eq(models.organizationId, organization.id)));

          if (userModels.length > 0) {
            await db
              .update(models)
              .set({ ownerId: ownerId })
              .where(and(eq(models.ownerId, user.id), eq(models.organizationId, organization.id)));

            logAuditEvent("rbac.models_transferred", {
              removedUserId: user.id,
              newOwnerId: ownerId,
              modelCount: userModels.length,
              organizationId: organization.id,
            });
          }
        },
        // Audit logging for member removal
        afterRemoveMember: async ({ member, user, organization }) => {
          logAuditEvent("rbac.member_removed", {
            removedUserId: user.id,
            removedUserEmail: user.email,
            removedMemberRole: member.role,
            organizationId: organization.id,
            organizationName: organization.name,
          });
        },
        // Audit logging for role changes
        afterUpdateMemberRole: async ({ member, previousRole, user, organization }) => {
          logAuditEvent("rbac.role_changed", {
            userId: user.id,
            userEmail: user.email,
            previousRole,
            newRole: member.role,
            organizationId: organization.id,
            organizationName: organization.name,
          });
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
          }),
        );
        const { error } = await getResendClient().emails.send({
          from: env.EMAIL_FROM,
          to: validEmail,
          subject: "Sign in to STL Shelf",
          html,
        });
        if (error) {
          captureServerException(error, { emailType: "magic_link" });
          logErrorEvent("error.email.send_failed", {
            emailType: "magic_link",
            ...getErrorDetails(error),
          });
          throw new Error(`Failed to send magic link email: ${error.message}`);
        }
      },
    }),
    openAPI(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: [
            env.POLAR_PRODUCT_FREE && { productId: env.POLAR_PRODUCT_FREE, slug: "free" },
            env.POLAR_PRODUCT_BASIC && { productId: env.POLAR_PRODUCT_BASIC, slug: "basic" },
            env.POLAR_PRODUCT_PRO && { productId: env.POLAR_PRODUCT_PRO, slug: "pro" },
          ].filter(Boolean) as { productId: string; slug: string }[],
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
    // MUST be last plugin
    tanstackStartCookies(),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session: sessionTable,
      account: accountTable,
      verification: verificationTable,
      organization: organizationTable,
      member: memberTable,
      invitation: invitationTable,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    sendResetPassword: async ({ user, url }: { user: { email?: string }; url: string }) => {
      const validEmail = validateEmail(user.email);
      const html = await render(
        PasswordResetTemplate({
          resetUrl: url,
          logoUrl: env.EMAIL_LOGO_URL,
        }),
      );
      const { error } = await getResendClient().emails.send({
        from: env.EMAIL_FROM,
        to: validEmail,
        subject: "Reset your password",
        html,
      });
      if (error) {
        captureServerException(error, { emailType: "password_reset" });
        logErrorEvent("error.email.send_failed", {
          emailType: "password_reset",
          ...getErrorDetails(error),
        });
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: { email?: string }; url: string }) => {
      const validEmail = validateEmail(user.email);
      const html = await render(
        VerifyEmailTemplate({
          verificationUrl: url,
          logoUrl: env.EMAIL_LOGO_URL,
        }),
      );
      const { error } = await getResendClient().emails.send({
        from: env.EMAIL_FROM,
        to: validEmail,
        subject: "Verify your email address",
        html,
      });
      if (error) {
        captureServerException(error, { emailType: "verification" });
        logErrorEvent("error.email.send_failed", {
          emailType: "verification",
          ...getErrorDetails(error),
        });
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    },
    sendOnSignUp: true,
  },

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

  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      domain: env.AUTH_COOKIE_DOMAIN || undefined,
      httpOnly: true,
      path: "/",
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await syncResendSegments({
            email: user.email,
            name: user.name,
            marketingAccepted: false,
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Auto-set activeOrganizationId when session is created (at login)
          // This is the documented approach from Better Auth
          const [membership] = await db
            .select({ organizationId: memberTable.organizationId })
            .from(memberTable)
            .where(eq(memberTable.userId, session.userId))
            .limit(1);

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
