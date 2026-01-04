import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization as authOrganization } from "./auth";

export const apiKeys = pgTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  organizationId: text("organization_id").notNull(),
  createdBy: text("created_by").notNull(),
  lastUsedAt: timestamp("last_used_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(),
  scopes: text("scopes").array().default([]).notNull(), // e.g., ['read', 'write', 'upload']
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(authOrganization, {
    fields: [apiKeys.organizationId],
    references: [authOrganization.id],
  }),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
