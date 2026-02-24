import { describe, expect, it } from "vitest";
import { buildReacceptConsentUpsert } from "./reaccept-upsert";

describe("buildReacceptConsentUpsert", () => {
  it("builds insert payload for missing consent rows", () => {
    const now = new Date("2026-02-24T10:00:00.000Z");

    const { insertValues } = buildReacceptConsentUpsert({
      userId: "user_1",
      termsPrivacyVersion: "2026-02-05",
      marketingAccepted: false,
      now,
      insertId: "consent_1",
    });

    expect(insertValues).toEqual({
      id: "consent_1",
      userId: "user_1",
      termsPrivacyAccepted: true,
      termsPrivacyVersion: "2026-02-05",
      termsPrivacyAcceptedAt: now,
      marketingAccepted: false,
      marketingUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });

  it("builds update payload for existing consent rows", () => {
    const now = new Date("2026-02-24T10:01:00.000Z");

    const { updateSet } = buildReacceptConsentUpsert({
      userId: "user_1",
      termsPrivacyVersion: "2026-02-05",
      marketingAccepted: true,
      now,
      insertId: "consent_2",
    });

    expect(updateSet).toEqual({
      termsPrivacyAccepted: true,
      termsPrivacyVersion: "2026-02-05",
      termsPrivacyAcceptedAt: now,
      marketingAccepted: true,
      marketingUpdatedAt: now,
      updatedAt: now,
    });
  });
});
