import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { legalDocuments, userConsents } from "@/lib/db/schema/consent";

const DEFER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type ConsentInvalidReason = "no_consent" | "not_accepted" | "outdated";

type ConsentSnapshot = {
  termsPrivacyAccepted: boolean;
  termsPrivacyVersion: string | null;
  marketingAccepted: boolean;
  marketingPromptDismissedAt: Date | string | null;
  marketingPromptDeclined: boolean;
};

type ConsentEvaluationInput = {
  consent: ConsentSnapshot | null;
  currentVersion: string | null;
  nowMs?: number;
};

type ConsentValidationValid = {
  valid: true;
  currentVersion: string | null;
  shouldShowMarketingBanner: boolean;
};

type ConsentValidationMissing = {
  valid: false;
  reason: "no_consent" | "not_accepted";
  currentVersion: string | null;
  shouldShowMarketingBanner: false;
};

type ConsentValidationOutdated = {
  valid: false;
  reason: "outdated";
  currentVersion: string;
  userVersion: string | null;
  marketingAccepted: boolean;
  shouldShowMarketingBanner: false;
};

export type AuthenticatedConsentValidation =
  | ConsentValidationValid
  | ConsentValidationMissing
  | ConsentValidationOutdated;

const getShouldShowMarketingBanner = (consent: ConsentSnapshot, nowMs: number): boolean => {
  if (consent.marketingAccepted || consent.marketingPromptDeclined) {
    return false;
  }

  if (!consent.marketingPromptDismissedAt) {
    return true;
  }

  const dismissedAt = new Date(consent.marketingPromptDismissedAt).getTime();
  return nowMs - dismissedAt > DEFER_DURATION_MS;
};

export const evaluateAuthenticatedConsent = ({
  consent,
  currentVersion,
  nowMs = Date.now(),
}: ConsentEvaluationInput): AuthenticatedConsentValidation => {
  if (!currentVersion) {
    return {
      valid: true,
      currentVersion,
      shouldShowMarketingBanner: consent ? getShouldShowMarketingBanner(consent, nowMs) : false,
    };
  }

  if (!consent) {
    return {
      valid: false,
      reason: "no_consent",
      currentVersion,
      shouldShowMarketingBanner: false,
    };
  }

  if (!consent.termsPrivacyAccepted) {
    return {
      valid: false,
      reason: "not_accepted",
      currentVersion,
      shouldShowMarketingBanner: false,
    };
  }

  if (consent.termsPrivacyVersion !== currentVersion) {
    return {
      valid: false,
      reason: "outdated",
      currentVersion,
      userVersion: consent.termsPrivacyVersion,
      marketingAccepted: consent.marketingAccepted,
      shouldShowMarketingBanner: false,
    };
  }

  return {
    valid: true,
    currentVersion,
    shouldShowMarketingBanner: getShouldShowMarketingBanner(consent, nowMs),
  };
};

const getLatestTermsVersion = async (): Promise<string | null> => {
  const [latestDoc] = await db
    .select({ version: legalDocuments.version })
    .from(legalDocuments)
    .where(eq(legalDocuments.type, "terms_and_conditions"))
    .orderBy(desc(legalDocuments.publishedAt))
    .limit(1);

  return latestDoc?.version ?? null;
};

const getUserConsentSnapshot = async (userId: string): Promise<ConsentSnapshot | null> => {
  const [consent] = await db
    .select({
      termsPrivacyAccepted: userConsents.termsPrivacyAccepted,
      termsPrivacyVersion: userConsents.termsPrivacyVersion,
      marketingAccepted: userConsents.marketingAccepted,
      marketingPromptDismissedAt: userConsents.marketingPromptDismissedAt,
      marketingPromptDeclined: userConsents.marketingPromptDeclined,
    })
    .from(userConsents)
    .where(eq(userConsents.userId, userId))
    .limit(1);

  return consent ?? null;
};

export const validateAuthenticatedConsent = async (
  userId: string,
  nowMs = Date.now(),
): Promise<AuthenticatedConsentValidation> => {
  const [consent, currentVersion] = await Promise.all([
    getUserConsentSnapshot(userId),
    getLatestTermsVersion(),
  ]);

  return evaluateAuthenticatedConsent({ consent, currentVersion, nowMs });
};
