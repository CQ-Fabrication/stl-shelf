import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, legalDocuments, consentAudit, userConsents } from "@/lib/db";
import { syncResendSegments } from "@/server/services/marketing/resend-segments";

// Schema definitions
const getDocumentByTypeSchema = z.object({
  type: z.enum(["terms_and_conditions", "privacy_policy"]),
});

const submitConsentSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  termsPrivacyAccepted: z.boolean(),
  termsPrivacyVersion: z.string(),
  marketingAccepted: z.boolean(),
  fingerprint: z.string(),
});

const updateMarketingConsentSchema = z.object({
  marketingAccepted: z.boolean(),
});

const reacceptConsentSchema = z.object({
  termsPrivacyVersion: z.string(),
  marketingAccepted: z.boolean(),
  fingerprint: z.string(),
});

const updateMarketingPromptSchema = z.object({
  action: z.enum(["accept", "decline", "defer"]),
});

// 7 days in milliseconds for "Maybe Later" re-prompt
const DEFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the latest published documents (T&C and Privacy Policy)
 * This is a public function - no auth required
 */
export const getLatestDocumentsFn = createServerFn({ method: "GET" }).handler(async () => {
  const documents = await db
    .select({
      id: legalDocuments.id,
      type: legalDocuments.type,
      version: legalDocuments.version,
      content: legalDocuments.content,
      publishedAt: legalDocuments.publishedAt,
    })
    .from(legalDocuments)
    .orderBy(desc(legalDocuments.publishedAt));

  // Get latest of each type
  const termsDoc = documents.find((d) => d.type === "terms_and_conditions");
  const privacyDoc = documents.find((d) => d.type === "privacy_policy");

  return {
    termsAndConditions: termsDoc ?? null,
    privacyPolicy: privacyDoc ?? null,
  };
});

/**
 * Get the latest document of a specific type (for public pages)
 */
export const getDocumentByTypeFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getDocumentByTypeSchema))
  .handler(async ({ data }: { data: z.infer<typeof getDocumentByTypeSchema> }) => {
    const [document] = await db
      .select({
        id: legalDocuments.id,
        type: legalDocuments.type,
        version: legalDocuments.version,
        content: legalDocuments.content,
        publishedAt: legalDocuments.publishedAt,
      })
      .from(legalDocuments)
      .where(eq(legalDocuments.type, data.type))
      .orderBy(desc(legalDocuments.publishedAt))
      .limit(1);

    return document ?? null;
  });

/**
 * Submit consent during signup/login
 * Records consent in audit log and creates/updates user consent state
 */
export const submitConsentFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(submitConsentSchema))
  .handler(async ({ data }: { data: z.infer<typeof submitConsentSchema> }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    // CRITICAL: Verify user is authenticated and matches the userId
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    if (session.user.id !== data.userId) {
      throw new Error("Unauthorized: Cannot submit consent for another user");
    }

    const ipAddress =
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const userAgent = headers.get("user-agent") ?? "unknown";

    // Verify document version exists
    const [doc] = await db
      .select({ id: legalDocuments.id })
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.type, "terms_and_conditions"),
          eq(legalDocuments.version, data.termsPrivacyVersion),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new Error("Invalid document version");
    }

    const now = new Date();
    const consentId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    const marketingAuditId = crypto.randomUUID();

    // Insert consent audit record for T&C + PP
    // This MUST succeed - if it fails, we block the entire flow
    await db.insert(consentAudit).values({
      id: auditId,
      userId: data.userId,
      consentType: "terms_and_privacy",
      action: "accepted",
      documentVersion: data.termsPrivacyVersion,
      ipAddress,
      userAgent,
      fingerprint: data.fingerprint,
      createdAt: now,
    });

    // Insert consent audit record for marketing (even if rejected)
    await db.insert(consentAudit).values({
      id: marketingAuditId,
      userId: data.userId,
      consentType: "marketing",
      action: data.marketingAccepted ? "accepted" : "rejected",
      documentVersion: data.termsPrivacyVersion,
      ipAddress,
      userAgent,
      fingerprint: data.fingerprint,
      createdAt: now,
    });

    // Upsert user consent state
    const existingConsent = await db
      .select({ id: userConsents.id })
      .from(userConsents)
      .where(eq(userConsents.userId, data.userId))
      .limit(1);

    if (existingConsent.length > 0) {
      await db
        .update(userConsents)
        .set({
          termsPrivacyAccepted: true,
          termsPrivacyVersion: data.termsPrivacyVersion,
          termsPrivacyAcceptedAt: now,
          marketingAccepted: data.marketingAccepted,
          marketingUpdatedAt: now,
          updatedAt: now,
        })
        .where(eq(userConsents.userId, data.userId));
    } else {
      await db.insert(userConsents).values({
        id: consentId,
        userId: data.userId,
        termsPrivacyAccepted: true,
        termsPrivacyVersion: data.termsPrivacyVersion,
        termsPrivacyAcceptedAt: now,
        marketingAccepted: data.marketingAccepted,
        marketingUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    const email = session.user.email ?? data.email;
    await syncResendSegments({
      email,
      name: session.user.name,
      marketingAccepted: data.marketingAccepted,
    });

    return { success: true };
  });

/**
 * Get current consent status for the authenticated user
 */
export const getConsentStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return null;
  }

  const [consent] = await db
    .select()
    .from(userConsents)
    .where(eq(userConsents.userId, session.user.id))
    .limit(1);

  // Get latest document versions
  const docs = await getLatestDocumentsFn();

  const currentVersion = docs.termsAndConditions?.version ?? null;
  const isOutdated = consent?.termsPrivacyVersion !== currentVersion && currentVersion !== null;

  return {
    consent: consent ?? null,
    currentVersion,
    isOutdated,
  };
});

/**
 * Check if user's consent is current (for route guards)
 * Also determines if marketing banner should be shown
 */
export const checkConsentValidityFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return { valid: false, reason: "no_session", shouldShowMarketingBanner: false };
  }

  const [consent] = await db
    .select({
      termsPrivacyAccepted: userConsents.termsPrivacyAccepted,
      termsPrivacyVersion: userConsents.termsPrivacyVersion,
      marketingAccepted: userConsents.marketingAccepted,
      marketingPromptDismissedAt: userConsents.marketingPromptDismissedAt,
      marketingPromptDeclined: userConsents.marketingPromptDeclined,
    })
    .from(userConsents)
    .where(eq(userConsents.userId, session.user.id))
    .limit(1);

  if (!consent) {
    return { valid: false, reason: "no_consent", shouldShowMarketingBanner: false };
  }

  if (!consent.termsPrivacyAccepted) {
    return { valid: false, reason: "not_accepted", shouldShowMarketingBanner: false };
  }

  // Check if version is current
  const docs = await getLatestDocumentsFn();
  const currentVersion = docs.termsAndConditions?.version;

  if (currentVersion && consent.termsPrivacyVersion !== currentVersion) {
    return {
      valid: false,
      reason: "outdated",
      currentVersion,
      userVersion: consent.termsPrivacyVersion,
      marketingAccepted: consent.marketingAccepted,
      shouldShowMarketingBanner: false, // Don't show marketing banner when T&C is outdated
    };
  }

  // Calculate if marketing banner should be shown
  // Show if: NOT accepted AND NOT declined AND (never dismissed OR dismissed > 7 days ago)
  let shouldShowMarketingBanner = false;
  if (!consent.marketingAccepted && !consent.marketingPromptDeclined) {
    if (!consent.marketingPromptDismissedAt) {
      // Never prompted
      shouldShowMarketingBanner = true;
    } else {
      // Check if 7 days have passed since dismissal
      const dismissedAt = new Date(consent.marketingPromptDismissedAt).getTime();
      const now = Date.now();
      shouldShowMarketingBanner = now - dismissedAt > DEFER_DURATION_MS;
    }
  }

  return { valid: true, shouldShowMarketingBanner };
});

/**
 * Update marketing consent preference (from profile page)
 */
export const updateMarketingConsentFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(updateMarketingConsentSchema))
  .handler(async ({ data }: { data: z.infer<typeof updateMarketingConsentSchema> }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    const ipAddress =
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const userAgent = headers.get("user-agent") ?? "unknown";

    const now = new Date();

    // Update consent state
    await db
      .update(userConsents)
      .set({
        marketingAccepted: data.marketingAccepted,
        marketingUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(userConsents.userId, session.user.id));

    // Insert audit record
    await db.insert(consentAudit).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      consentType: "marketing",
      action: data.marketingAccepted ? "accepted" : "revoked",
      documentVersion: null,
      ipAddress,
      userAgent,
      fingerprint: "profile-update",
      createdAt: now,
    });

    await syncResendSegments({
      email: session.user.email,
      name: session.user.name,
      marketingAccepted: data.marketingAccepted,
    });

    return { success: true };
  });

/**
 * Re-accept updated terms (for consent banner flow)
 */
export const reacceptConsentFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(reacceptConsentSchema))
  .handler(async ({ data }: { data: z.infer<typeof reacceptConsentSchema> }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    const ipAddress =
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const userAgent = headers.get("user-agent") ?? "unknown";

    // Verify document version exists
    const [doc] = await db
      .select({ id: legalDocuments.id })
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.type, "terms_and_conditions"),
          eq(legalDocuments.version, data.termsPrivacyVersion),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new Error("Invalid document version");
    }

    const now = new Date();

    // Insert audit record for T&C + PP
    await db.insert(consentAudit).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      consentType: "terms_and_privacy",
      action: "accepted",
      documentVersion: data.termsPrivacyVersion,
      ipAddress,
      userAgent,
      fingerprint: data.fingerprint,
      createdAt: now,
    });

    // Insert audit record for marketing preference
    await db.insert(consentAudit).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      consentType: "marketing",
      action: data.marketingAccepted ? "accepted" : "rejected",
      documentVersion: data.termsPrivacyVersion,
      ipAddress,
      userAgent,
      fingerprint: data.fingerprint,
      createdAt: now,
    });

    // Update consent state
    await db
      .update(userConsents)
      .set({
        termsPrivacyAccepted: true,
        termsPrivacyVersion: data.termsPrivacyVersion,
        termsPrivacyAcceptedAt: now,
        marketingAccepted: data.marketingAccepted,
        marketingUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(userConsents.userId, session.user.id));

    await syncResendSegments({
      email: session.user.email,
      name: session.user.name,
      marketingAccepted: data.marketingAccepted,
    });

    return { success: true };
  });

/**
 * Handle marketing prompt banner actions (accept/decline/defer)
 * Called from the post-login marketing consent banner
 */
export const updateMarketingPromptFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(updateMarketingPromptSchema))
  .handler(async ({ data }: { data: z.infer<typeof updateMarketingPromptSchema> }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    const ipAddress =
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const userAgent = headers.get("user-agent") ?? "unknown";

    const now = new Date();

    if (data.action === "accept") {
      // User accepted marketing - set marketingAccepted, clear prompt fields
      await db
        .update(userConsents)
        .set({
          marketingAccepted: true,
          marketingUpdatedAt: now,
          marketingPromptDismissedAt: null,
          marketingPromptDeclined: false,
          updatedAt: now,
        })
        .where(eq(userConsents.userId, session.user.id));

      // Create audit record
      await db.insert(consentAudit).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        consentType: "marketing",
        action: "accepted",
        documentVersion: null,
        ipAddress,
        userAgent,
        fingerprint: "marketing-banner",
        createdAt: now,
      });

      await syncResendSegments({
        email: session.user.email,
        name: session.user.name,
        marketingAccepted: true,
      });
    } else if (data.action === "decline") {
      // User clicked X - permanent decline, never re-prompt
      await db
        .update(userConsents)
        .set({
          marketingPromptDeclined: true,
          marketingPromptDismissedAt: null,
          updatedAt: now,
        })
        .where(eq(userConsents.userId, session.user.id));

      // Create audit record
      await db.insert(consentAudit).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        consentType: "marketing",
        action: "rejected",
        documentVersion: null,
        ipAddress,
        userAgent,
        fingerprint: "marketing-banner-decline",
        createdAt: now,
      });

      await syncResendSegments({
        email: session.user.email,
        name: session.user.name,
        marketingAccepted: false,
      });
    } else if (data.action === "defer") {
      // User clicked "Maybe Later" - re-prompt after 7 days
      // No audit record for defer (not a final decision)
      await db
        .update(userConsents)
        .set({
          marketingPromptDismissedAt: now,
          updatedAt: now,
        })
        .where(eq(userConsents.userId, session.user.id));
    }

    return { success: true };
  });
