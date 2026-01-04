import { createFileRoute } from "@tanstack/react-router";
import { db, models } from "@/lib/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { validateApiKey } from "@/server/middleware/api-key";

export const Route = createFileRoute("/api/v1/models")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: validation.status });
        }

        try {
          const url = new URL(request.url);
          const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
          const offset = Number(url.searchParams.get("offset")) || 0;

          const modelsList = await db
            .select({
              id: models.id,
              slug: models.slug,
              name: models.name,
              description: models.description,
              currentVersion: models.currentVersion,
              totalVersions: models.totalVersions,
              createdAt: models.createdAt,
              updatedAt: models.updatedAt,
            })
            .from(models)
            .where(
              and(eq(models.organizationId, validation.organizationId), isNull(models.deletedAt)),
            )
            .orderBy(desc(models.updatedAt))
            .limit(limit)
            .offset(offset);

          return Response.json({
            models: modelsList,
            pagination: {
              limit,
              offset,
              hasMore: modelsList.length === limit,
            },
          });
        } catch (error) {
          console.error("API v1 models list error:", error);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
