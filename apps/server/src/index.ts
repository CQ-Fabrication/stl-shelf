import "dotenv/config";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { env } from "./env";
import type { BaseContext, Session } from "./lib/context";
import { appRouter } from "./routers/index";

const app = new Hono();

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);

console.log("STL Shelf API starting...");

// Apply middleware in correct order
app.use(logger());

// Configure CORS
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests from configured origins
      const allowedOrigins = [
        env.CORS_ORIGIN,
        env.WEB_URL,
        "http://localhost:3001",
        "http://127.0.0.1:3001"
      ].filter(Boolean);

      if (!origin) return null; // Allow requests with no origin (e.g., Postman)
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.use("/rpc/*", async (c, next) => {
  const context = await createRpcContext(c);
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

async function createRpcContext(c: Context): Promise<BaseContext> {
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
