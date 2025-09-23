import "dotenv/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { RPCHandler } from "@orpc/server/fetch";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth";
import type { BaseContext, Session } from "./lib/context";
import { appRouter, openApiRoutes } from "./routers/index";

const app = new OpenAPIHono();

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);

const openApiBuilder = new OpenAPIHono();
for (const route of openApiRoutes) {
  openApiBuilder.openapi(route, () => new Response(null, { status: 501 }));
}

const openApiDocument = openApiBuilder.getOpenAPI31Document({
  openapi: "3.1.0",
  info: {
    title: "STL Shelf API",
    version: "1.0.0",
    description: "Backend RPC API for STL Shelf",
  },
});

console.log("STL Shelf API starting...");

// Apply middleware in correct order
app.use(logger());

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get(
  "/docs",
  Scalar({
    pageTitle: "STL Shelf - API Documentation",
    sources: [
      { url: "/api/open-api", title: "API" },
      // Better Auth schema generation endpoint
      { url: "/api/auth/open-api/generate-schema", title: "Auth" },
    ],
  })
);

app.get("/api/open-api", (c) => c.json(openApiDocument));

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
