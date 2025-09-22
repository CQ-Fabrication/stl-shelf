import "dotenv/config";
import { OpenAPIGenerator } from "@orpc/openapi";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { appRouter } from "./routers/index";

const app = new Hono();

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);

const openAPIGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

console.log("STL Shelf API starting...");

// Apply middleware in correct order
app.use(logger());

// Better Auth routes
app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get(
  "/docs",
  Scalar({
    pageTitle: "STL Shelf - API Documentation",
    sources: [
      // Better Auth schema generation endpoint
      { url: "/api/auth/open-api/generate-schema", title: "Auth" },
      { url: "/docs", title: "API" },
      { content: openAPIGenerator.generate(appRouter), title: "RPC" },
    ],
  })
);

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: "/rpc",
    context: c,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

export default app;
