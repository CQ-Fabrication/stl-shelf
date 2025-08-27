import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.url(),
    POSTGRES_MAX_CONNECTIONS: z.coerce.number().min(1),
    POSTGRES_IDLE_TIMEOUT: z.coerce.number().min(1),
    POSTGRES_CONNECTION_TIMEOUT: z.coerce.number().min(1),

    // Storage (MinIO/S3)
    STORAGE_REGION: z.string().min(1),
    STORAGE_ENDPOINT: z.string().min(1),
    STORAGE_ACCESS_KEY: z.string().min(1),
    STORAGE_SECRET_KEY: z.string().min(1),
    STORAGE_BUCKET_NAME: z.string().min(1),
    STORAGE_BUCKET_THUMBNAILS: z.string().min(1),
    STORAGE_BUCKET_TEMP: z.string().min(1),
    STORAGE_USE_SSL: z.enum(['true', 'false']),

    // Redis
    REDIS_URL: z.string().url().min(1),
    REDIS_TTL_DEFAULT: z.coerce.number().min(1),
    REDIS_TTL_MODEL_LIST: z.coerce.number().min(1),
    REDIS_TTL_MODEL_METADATA: z.coerce.number().min(1),

    // CORS
    CORS_ORIGIN: z.string().optional(),

    // Git Configuration
    GIT_USER_NAME: z.string().min(1).optional(),
    GIT_USER_EMAIL: z.string().email().optional(),
    GIT_REMOTE_URL: z.string().url().optional(),

    // Server Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().min(1),

  },
  runtimeEnv: process.env,
});
