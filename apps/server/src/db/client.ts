import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
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
 * Hyperdrive binding interface for Cloudflare Workers
 */
interface Hyperdrive {
  connectionString: string;
}

/**
 * Create database connection
 *
 * Supports two modes:
 * - Development: Uses DATABASE_URL from env
 * - Cloudflare Workers: Uses Hyperdrive binding for connection pooling
 */
function createDbConnection(hyperdrive?: Hyperdrive) {
  // Use Hyperdrive connection string if provided (Workers environment)
  // Otherwise fall back to DATABASE_URL (development)
  const connectionString = hyperdrive?.connectionString || env.DATABASE_URL;

  // In Workers with Hyperdrive, don't configure connection pooling
  // (Hyperdrive handles it). In development, use local pooling.
  const poolConfig = hyperdrive
    ? {} // Hyperdrive handles pooling
    : {
        max: env.POSTGRES_MAX_CONNECTIONS,
        idle_timeout: env.POSTGRES_IDLE_TIMEOUT,
        connect_timeout: env.POSTGRES_CONNECTION_TIMEOUT,
      };

  // Disable prepared statements in production (Workers are stateless)
  // Only enable in development where connections persist
  const isProd = env.NODE_ENV === "production";

  const client = postgres(connectionString, {
    ...poolConfig,
    // Disable prepare for Workers/Hyperdrive - stateless environments can't use prepared statements
    prepare: hyperdrive ? false : !isProd,
  });

  return {
    db: drizzle(client, { schema }),
    client,
  };
}

// Default connection for development/standalone mode
const { db: defaultDb, client: defaultClient } = createDbConnection();

// Export default instances
export const db = defaultDb;
export { defaultClient as pgClient };

// Export factory for Workers with Hyperdrive
export { createDbConnection };
