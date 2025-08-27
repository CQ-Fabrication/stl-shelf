import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
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
