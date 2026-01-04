import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    POSTGRES_MAX_CONNECTIONS: z.coerce.number().min(1).default(20),
    POSTGRES_IDLE_TIMEOUT: z.coerce.number().min(1).default(30),
    POSTGRES_CONNECTION_TIMEOUT: z.coerce.number().min(1).default(5),

    // Storage (R2/MinIO/S3-compatible)
    STORAGE_REGION: z.string().min(1).default("auto"),
    STORAGE_ENDPOINT: z.string().min(1),
    STORAGE_ACCESS_KEY: z.string().min(1),
    STORAGE_SECRET_KEY: z.string().min(1),
    STORAGE_BUCKET_NAME: z.string().min(1).default("stl-models"),
    STORAGE_USE_SSL: z.enum(["true", "false"]).default("true"),

    // BetterAuth / Auth
    AUTH_URL: z.string().url(),
    WEB_URL: z.string().url(),
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),

    // OAuth Providers (optional)
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Captcha (Cloudflare Turnstile)
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string(),

    // Resend for transactional emails
    RESEND_API_KEY: z.string(),
    EMAIL_FROM: z.string().optional().default("STL Shelf <noreply@mail.stl-shelf.com>"),
    EMAIL_LOGO_URL: z.string().url().optional(),

    // Server Configuration
    NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
    PORT: z.coerce.number().min(1).default(3000),

    // Polar.sh Billing
    POLAR_ACCESS_TOKEN: z.string().min(1).default("polar_placeholder"),
    POLAR_WEBHOOK_SECRET: z.string().min(1).default("whsec_placeholder"),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_FREE: z.string().optional(),
    POLAR_PRODUCT_BASIC: z.string().optional(),
    POLAR_PRODUCT_PRO: z.string().optional(),

    // Statsig Feature Flags & Analytics
    STATSIG_SERVER_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
});
