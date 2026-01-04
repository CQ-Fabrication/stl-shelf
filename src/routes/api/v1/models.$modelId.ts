import { createFileRoute } from "@tanstack/react-router";
import { db, models, modelVersions, modelFiles } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { validateApiKey } from "@/server/middleware/api-key";

export const Route = createFileRoute("/api/v1/models/$modelId")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { modelId: string } }) => {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: validation.status });
        }

        try {
          const { modelId } = params;

          // Get model with current version details
          const [model] = await db
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

          // Get current version with files
          const [currentVersion] = await db
            .select({
              id: modelVersions.id,
              version: modelVersions.version,
              name: modelVersions.name,
              description: modelVersions.description,
              createdAt: modelVersions.createdAt,
            })
            .from(modelVersions)
            .where(
              and(
                eq(modelVersions.modelId, modelId),
                eq(modelVersions.version, model.currentVersion),
              ),
            )
            .limit(1);

          // Get files for current version
          const files = currentVersion
            ? await db
                .select({
                  id: modelFiles.id,
                  filename: modelFiles.filename,
                  extension: modelFiles.extension,
                  size: modelFiles.size,
                  mimeType: modelFiles.mimeType,
                  createdAt: modelFiles.createdAt,
                })
                .from(modelFiles)
                .where(eq(modelFiles.versionId, currentVersion.id))
                .orderBy(modelFiles.filename)
            : [];

          return Response.json({
            model: {
              ...model,
              currentVersionDetails: currentVersion
                ? {
                    ...currentVersion,
                    files,
                  }
                : null,
            },
          });
        } catch (error) {
          console.error("API v1 model detail error:", error);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
