import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import {
  account as authAccount,
  invitation as authInvitation,
  member as authMember,
  organization as authOrganization,
  session as authSession,
  user as authUser,
  verification as authVerification,
} from './schema/better-auth-schema';
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
} from './schema/models';

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

// Create postgres client with connection pooling
const client = postgres(env.DATABASE_URL, {
  max: env.POSTGRES_MAX_CONNECTIONS,
  idle_timeout: env.POSTGRES_IDLE_TIMEOUT,
  connect_timeout: env.POSTGRES_CONNECTION_TIMEOUT,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export client for raw queries if needed
export { client as pgClient };
