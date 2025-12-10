import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  account as authAccount,
  invitation as authInvitation,
  member as authMember,
  organization as authOrganization,
  session as authSession,
  user as authUser,
  verification as authVerification,
} from "./schema/better-auth-schema";
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
} from "./schema/models";

const schema = {
  models,
  modelVersions,
  modelFiles,
  tags,
  modelTags,
  modelsRelations,
  modelVersionsRelations,
  modelFilesRelations,
  tagsRelations,
  modelTagsRelations,
  // BetterAuth tables
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  invitation: authInvitation,
  member: authMember,
  organization: authOrganization,
};

/**
 * Create database connection from connection string
 *
 * For Workers: Use env.HYPERDRIVE.connectionString (per-request)
 * For Development: Use DATABASE_URL
 *
 * Per Cloudflare docs, connections must be created per-request in Workers:
 * https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    // Disable prepared statements - required for Hyperdrive/Workers
    // Workers are stateless and can't maintain prepared statement caches
    prepare: false,
  });

  return drizzle(client, { schema });
}

/** Database instance type for type-safe usage */
export type Database = ReturnType<typeof createDb>;

/** Schema export for use in other modules */
export { schema };

/**
 * Default database instance for services that haven't been migrated to per-request pattern.
 *
 * WARNING: This uses DATABASE_URL directly, not Hyperdrive.
 * Auth routes use per-request Hyperdrive connections via createDb().
 * Services should be migrated to receive db from context for full Hyperdrive support.
 *
 * @deprecated Use createDb(connectionString) for new code
 */
// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL is validated at startup
const defaultDb = createDb(process.env.DATABASE_URL!);
export { defaultDb as db };
