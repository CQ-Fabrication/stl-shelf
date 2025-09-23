import "dotenv/config";
import { RPCHandler } from "@orpc/server/fetch";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { appRouter } from "./routers/index";

const app = new Hono();

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);

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
