# Server Patterns

## Server Functions

```typescript
// src/server/functions/models.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const listModels = createServerFn({ method: "GET" })
  .validator(schema)
  .handler(async ({ data }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    // ... business logic
  });
```

## API Routes (auth, webhooks)

```typescript
// src/routes/api/auth/$.ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "@/lib/auth";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```
