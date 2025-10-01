import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

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
    STORAGE_USE_SSL: z.enum(["true", "false"]),

    // Redis
    REDIS_URL: z.url().min(1),
    REDIS_TTL_DEFAULT: z.coerce.number().min(1),
    REDIS_TTL_MODEL_LIST: z.coerce.number().min(1),
    REDIS_TTL_MODEL_METADATA: z.coerce.number().min(1),

    // CORS
    CORS_ORIGIN: z.url(),

    // BetterAuth / Auth
    AUTH_URL: z.url(),
    WEB_URL: z.url(),
    AUTH_COOKIE_DOMAIN: z.string().optional(),

    // OAuth Providers
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Captcha (Cloudflare Turnstile)
    TURNSTILE_SITE_KEY: z.string(),
    TURNSTILE_SECRET_KEY: z.string(),

    // SMTP for magic links / transactional emails
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // Server Configuration
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().min(1),

    // Polar.sh Billing
    POLAR_ACCESS_TOKEN: z.string().min(1).default("polar_placeholder"),
    POLAR_WEBHOOK_SECRET: z.string().min(1).default("whsec_placeholder"),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_FREE: z.string().optional(),
    POLAR_PRODUCT_BASIC: z.string().optional(),
    POLAR_PRODUCT_PRO: z.string().optional(),
  },
  runtimeEnv: process.env,
});
