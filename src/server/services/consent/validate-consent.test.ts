import { describe, expect, it } from "vitest";
import { evaluateAuthenticatedConsent } from "./validate-consent";

describe("evaluateAuthenticatedConsent", () => {
  it("returns valid when no terms document is published", () => {
    const result = evaluateAuthenticatedConsent({
      consent: null,
      currentVersion: null,
    });

    expect(result).toEqual({
      valid: true,
      currentVersion: null,
      shouldShowMarketingBanner: false,
    });
  });

  it("returns no_consent when terms exist and consent row is missing", () => {
    const result = evaluateAuthenticatedConsent({
      consent: null,
      currentVersion: "2026-02-05",
    });

    expect(result).toEqual({
      valid: false,
      reason: "no_consent",
      currentVersion: "2026-02-05",
      shouldShowMarketingBanner: false,
    });
  });

  it("returns outdated when user accepted an older version", () => {
    const result = evaluateAuthenticatedConsent({
      consent: {
        termsPrivacyAccepted: true,
        termsPrivacyVersion: "2026-01-01",
        marketingAccepted: false,
        marketingPromptDismissedAt: null,
        marketingPromptDeclined: false,
      },
      currentVersion: "2026-02-05",
    });

    expect(result).toEqual({
      valid: false,
      reason: "outdated",
      currentVersion: "2026-02-05",
      userVersion: "2026-01-01",
      marketingAccepted: false,
      shouldShowMarketingBanner: false,
    });
  });

  it("returns not_accepted when consent row exists but terms were never accepted", () => {
    const result = evaluateAuthenticatedConsent({
      consent: {
        termsPrivacyAccepted: false,
        termsPrivacyVersion: null,
        marketingAccepted: false,
        marketingPromptDismissedAt: null,
        marketingPromptDeclined: false,
      },
      currentVersion: "2026-02-05",
    });

    expect(result).toEqual({
      valid: false,
      reason: "not_accepted",
      currentVersion: "2026-02-05",
      shouldShowMarketingBanner: false,
    });
  });

  it("returns valid when user has accepted current version", () => {
    const result = evaluateAuthenticatedConsent({
      consent: {
        termsPrivacyAccepted: true,
        termsPrivacyVersion: "2026-02-05",
        marketingAccepted: false,
        marketingPromptDismissedAt: null,
        marketingPromptDeclined: false,
      },
      currentVersion: "2026-02-05",
      nowMs: new Date("2026-02-24T10:00:00.000Z").getTime(),
    });

    expect(result).toEqual({
      valid: true,
      currentVersion: "2026-02-05",
      shouldShowMarketingBanner: true,
    });
  });
});
