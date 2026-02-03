import { createFileRoute } from "@tanstack/react-router";
import { db, models, modelVersions, modelFiles } from "@/lib/db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { validateApiKey } from "@/server/middleware/api-key";

export const Route = createFileRoute("/api/v1/models/$modelId/versions")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { modelId: string } }) => {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: validation.status });
        }

        try {
          const { modelId } = params;

          // Verify model belongs to organization
          const [model] = await db
            .select({ id: models.id })
            .from(models)
            .where(
              and(
                eq(models.id, modelId),
                eq(models.organizationId, validation.organizationId),
                isNull(models.deletedAt),
              ),
            )
            .limit(1);

          if (!model) {
            return Response.json({ error: "Model not found" }, { status: 404 });
          }

          const versionsWithFiles = await db
            .select({
              id: modelVersions.id,
              version: modelVersions.version,
              name: modelVersions.name,
              description: modelVersions.description,
              createdAt: modelVersions.createdAt,
              files: sql<
                Array<{
                  id: string;
                  filename: string;
                  extension: string;
                  size: number;
                  mimeType: string;
                  createdAt: string;
                }>
              >`(
                SELECT COALESCE(
                  json_agg(
                    json_build_object(
                      'id', mf.id,
                      'filename', mf.filename,
                      'extension', mf.extension,
                      'size', mf.size,
                      'mimeType', mf.mime_type,
                      'createdAt', mf.created_at
                    ) ORDER BY mf.filename
                  ),
                  '[]'::json
                )
                FROM ${modelFiles} mf
                WHERE mf.version_id = ${modelVersions.id}
              )`,
            })
            .from(modelVersions)
            .where(eq(modelVersions.modelId, modelId))
            .orderBy(desc(modelVersions.createdAt));

          return Response.json({
            modelId,
            versions: versionsWithFiles,
          });
        } catch (error) {
          console.error("API v1 model versions error:", error);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
