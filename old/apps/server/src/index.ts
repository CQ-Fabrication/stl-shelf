/// <reference types="@cloudflare/workers-types" />
import "dotenv/config";
import { RPCHandler } from "@orpc/server/fetch";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth";
import { createDb } from "./db/client";
import { env } from "./env";
import type { BaseContext, Session } from "./lib/context";
import { appRouter } from "./routers/index";

/**
 * Cloudflare Workers environment bindings
 * These are injected by the Workers runtime
 */
export interface Env {
  // Hyperdrive database connection
  HYPERDRIVE: {
    connectionString: string;
  };
  // R2 bucket binding (single bucket for all storage)
  R2_MODELS: R2Bucket;
  // Environment variables (from wrangler.jsonc vars + secrets)
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Env }>();

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);

// Apply middleware in correct order
app.use(logger());

// Configure CORS - hardcoded origins to avoid CPU overhead from env lookups
// See: https://www.answeroverflow.com/m/1357795265108512808
app.use(
  "*",
  cors({
    origin: ["https://app.stl-shelf.com", "http://localhost:3001"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization", "x-captcha-response"],
  })
);

/**
 * Get database connection string from Hyperdrive (production) or DATABASE_URL (development)
 *
 * Per Cloudflare docs, Hyperdrive connection must be created per-request:
 * https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
 */
function getConnectionString(c: Context<{ Bindings: Env }>): string {
  // Use Hyperdrive in production (Workers), fall back to DATABASE_URL for dev
  return c.env?.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
}

// Better Auth routes - create db + auth per-request with Hyperdrive
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const connectionString = getConnectionString(c);
  const db = createDb(connectionString);
  const auth = createAuth(db);
  return auth.handler(c.req.raw);
});

// oRPC routes - also use per-request db/auth
app.use("/rpc/*", async (c, next) => {
  const connectionString = getConnectionString(c);
  const db = createDb(connectionString);
  const auth = createAuth(db);
  const context = await createRpcContext(c, auth);

  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

export default app;

async function createRpcContext(
  c: Context,
  auth: ReturnType<typeof createAuth>
): Promise<BaseContext> {
  const ipAddress = extractClientIp(c);

  try {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    return {
      session: (sessionData as Session | null) ?? null,
      ipAddress,
    };
  } catch {
    return {
      session: null,
      ipAddress,
    };
  }
}

function extractClientIp(c: Context): string | null {
  const forwarded = c.req.header("x-forwarded-for");
  const candidates = [
    c.req.header("cf-connecting-ip"),
    c.req.header("x-real-ip"),
    forwarded ? forwarded.split(",")[0]?.trim() : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}
