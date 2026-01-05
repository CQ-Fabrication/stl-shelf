import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Enum for legal document types
 */
export const legalDocumentTypeEnum = pgEnum("legal_document_type", [
  "terms_and_conditions",
  "privacy_policy",
]);

/**
 * Enum for consent types
 */
export const consentTypeEnum = pgEnum("consent_type", ["terms_and_privacy", "marketing"]);

/**
 * Enum for consent actions
 */
export const consentActionEnum = pgEnum("consent_action", ["accepted", "rejected", "revoked"]);

/**
 * Legal documents table - stores T&C and Privacy Policy content with versioning
 * Documents are stored as Markdown, version is date-based (YYYY-MM-DD)
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: text("id").primaryKey(),
    type: legalDocumentTypeEnum("type").notNull(),
    version: text("version").notNull(), // Date-based: 2026-01-05
    content: text("content").notNull(), // Full Markdown content
    publishedAt: timestamp("published_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("legal_documents_type_idx").on(table.type),
    uniqueIndex("legal_documents_type_version_uidx").on(table.type, table.version),
  ],
);

/**
 * Consent audit table - append-only log of all consent actions
 * Records are NEVER updated or deleted - preserved forever for legal compliance
 */
export const consentAudit = pgTable(
  "consent_audit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Nullable for deleted accounts
    consentType: consentTypeEnum("consent_type").notNull(),
    action: consentActionEnum("action").notNull(),
    documentVersion: text("document_version"), // Version of T&C/PP at time of consent
    ipAddress: text("ip_address"), // CF-Connecting-IP header
    userAgent: text("user_agent"), // Full User-Agent string
    fingerprint: text("fingerprint"), // Canvas fingerprint hash
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("consent_audit_userId_idx").on(table.userId),
    index("consent_audit_consentType_idx").on(table.consentType),
    index("consent_audit_createdAt_idx").on(table.createdAt),
  ],
);

/**
 * User consents table - current consent state per user
 * One row per user, updated when consent changes
 */
export const userConsents = pgTable(
  "user_consents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    termsPrivacyAccepted: boolean("terms_privacy_accepted").default(false).notNull(),
    termsPrivacyVersion: text("terms_privacy_version"), // Version they accepted
    termsPrivacyAcceptedAt: timestamp("terms_privacy_accepted_at"),
    marketingAccepted: boolean("marketing_accepted").default(false).notNull(),
    marketingUpdatedAt: timestamp("marketing_updated_at"),
    // Post-login marketing banner tracking
    marketingPromptDismissedAt: timestamp("marketing_prompt_dismissed_at"), // "Maybe Later" timestamp
    marketingPromptDeclined: boolean("marketing_prompt_declined").default(false).notNull(), // X clicked = permanent decline
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("user_consents_userId_uidx").on(table.userId)],
);

// Relations
export const legalDocumentsRelations = relations(legalDocuments, () => ({}));

export const consentAuditRelations = relations(consentAudit, ({ one }) => ({
  user: one(user, {
    fields: [consentAudit.userId],
    references: [user.id],
  }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
  user: one(user, {
    fields: [userConsents.userId],
    references: [user.id],
  }),
}));
