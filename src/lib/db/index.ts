import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  account as authAccount,
  accountRelations as authAccountRelations,
  invitation as authInvitation,
  invitationRelations as authInvitationRelations,
  member as authMember,
  memberRelations as authMemberRelations,
  organization as authOrganization,
  organizationRelations as authOrganizationRelations,
  session as authSession,
  sessionRelations as authSessionRelations,
  user as authUser,
  userRelations as authUserRelations,
  verification as authVerification,
} from "./schema/auth";
import {
  modelFiles,
  modelFilesRelations,
  models,
  modelsRelations,
  modelTags,
  modelTagsRelations,
  modelVersions,
  modelVersionsRelations,
  tags,
  tagsRelations,
  tagTypes,
  tagTypesRelations,
  versionTags,
  versionTagsRelations,
} from "./schema/models";
import { apiKeys, apiKeysRelations } from "./schema/api-keys";

export const schema = {
  // Models
  models,
  modelVersions,
  modelFiles,
  tags,
  tagTypes,
  modelTags,
  versionTags,
  // API Keys
  apiKeys,
  // Relations
  modelsRelations,
  modelVersionsRelations,
  modelFilesRelations,
  tagsRelations,
  tagTypesRelations,
  modelTagsRelations,
  versionTagsRelations,
  apiKeysRelations,
  // BetterAuth tables
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  invitation: authInvitation,
  member: authMember,
  organization: authOrganization,
  // BetterAuth relations
  authUserRelations,
  authSessionRelations,
  authAccountRelations,
  authOrganizationRelations,
  authMemberRelations,
  authInvitationRelations,
};

/**
 * Create database connection from connection string
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    prepare: false, // Disable prepared statements for compatibility
  });

  return drizzle(client, { schema });
}

/** Database instance type for type-safe usage */
export type Database = ReturnType<typeof createDb>;

/**
 * Default database instance
 * Uses DATABASE_URL environment variable
 */
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return createDb(url);
}

// Lazy singleton - only create connection when first accessed
let _db: Database | null = null;

function getDbInstance() {
  if (!_db) {
    _db = getDb();
  }
  return _db;
}

// Export as getter that returns the singleton instance
export const db = new Proxy({} as Database, {
  get(_, prop) {
    const instance = getDbInstance();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Re-export schema types
export * from "./schema/auth";
export * from "./schema/models";
export * from "./schema/api-keys";
