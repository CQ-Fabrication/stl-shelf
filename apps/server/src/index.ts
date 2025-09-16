import "dotenv/config";
import { RPCHandler } from "@orpc/server/fetch";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth";
import { fileServingHandler } from "./handlers/file-serving.handler";
import { healthHandler } from "./handlers/health.handler";
import { thumbnailHandler } from "./handlers/thumbnail.handler";
// Handler imports
import { uploadHandler } from "./handlers/upload.handler";
import { createContext } from "./lib/context";
import { authMiddleware } from "./middleware/auth.middleware";
// Middleware imports
import { corsMiddleware } from "./middleware/cors.middleware";
import { csrfMiddleware } from "./middleware/csrf.middleware";
import { securityHeadersMiddleware } from "./middleware/security.middleware";
import { appRouter } from "./routers/index";

const app = new Hono();

// Development mode check
const isDevelopment = process.env.NODE_ENV !== "production";

console.log(
  `STL Shelf API starting in ${isDevelopment ? "development" : "production"} mode`
);

// Apply middleware in correct order
app.use(logger());
app.use("/*", corsMiddleware);
app.use("*", securityHeadersMiddleware);
app.use("*", csrfMiddleware);


app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Auth middleware - only for protected non-RPC routes
app.use("/files/*", authMiddleware);
app.use("/thumbnails/*", authMiddleware);
app.use("/upload", authMiddleware);

// Public routes (no auth required)
app.get("/health", healthHandler);
app.get(
  "/docs",
  Scalar({
    pageTitle: "STL Shelf - API Documentation",
    sources: [
      { url: "/docs", title: "API" },
      // Better Auth schema generation endpoint
      { url: "/api/auth/open-api/generate-schema", title: "Auth" },
    ],
  })
);

// File serving routes (protected - need explicit auth)
app.get("/files/:modelId/:version/:filename", fileServingHandler);
app.get("/thumbnails/:modelId/:version", thumbnailHandler);

// Protected routes (require auth context)
app.post("/upload", uploadHandler);

// oRPC handler for all API routes
const handler = new RPCHandler(appRouter);
app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });
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
