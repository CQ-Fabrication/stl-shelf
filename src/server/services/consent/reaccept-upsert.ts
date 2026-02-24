export type ReacceptConsentUpsertInput = {
  userId: string;
  termsPrivacyVersion: string;
  marketingAccepted: boolean;
  now: Date;
  insertId?: string;
};

export type ReacceptConsentInsertValues = {
  id: string;
  userId: string;
  termsPrivacyAccepted: true;
  termsPrivacyVersion: string;
  termsPrivacyAcceptedAt: Date;
  marketingAccepted: boolean;
  marketingUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ReacceptConsentUpdateSet = {
  termsPrivacyAccepted: true;
  termsPrivacyVersion: string;
  termsPrivacyAcceptedAt: Date;
  marketingAccepted: boolean;
  marketingUpdatedAt: Date;
  updatedAt: Date;
};

export const buildReacceptConsentUpsert = ({
  userId,
  termsPrivacyVersion,
  marketingAccepted,
  now,
  insertId = crypto.randomUUID(),
}: ReacceptConsentUpsertInput): {
  insertValues: ReacceptConsentInsertValues;
  updateSet: ReacceptConsentUpdateSet;
} => ({
  insertValues: {
    id: insertId,
    userId,
    termsPrivacyAccepted: true,
    termsPrivacyVersion,
    termsPrivacyAcceptedAt: now,
    marketingAccepted,
    marketingUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  },
  updateSet: {
    termsPrivacyAccepted: true,
    termsPrivacyVersion,
    termsPrivacyAcceptedAt: now,
    marketingAccepted,
    marketingUpdatedAt: now,
    updatedAt: now,
  },
});
