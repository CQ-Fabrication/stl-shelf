import { createFileRoute } from "@tanstack/react-router";
import { db, models, modelVersions, modelFiles } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { validateApiKey, hasScope } from "@/server/middleware/api-key";
import { storageService } from "@/server/services/storage";
import { checkAndTrackEgress } from "@/server/services/billing/egress.service";
import { checkRateLimit, getClientIp } from "@/server/utils/rate-limit";

const RATE_LIMIT = { windowMs: 60_000, max: 120 };

export const Route = createFileRoute("/api/v1/models/$modelId/files/$fileId/download")({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request;
        params: { modelId: string; fileId: string };
      }) => {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: validation.status });
        }

        const ip = getClientIp(request);
        const rate = checkRateLimit(`api-download:${validation.organizationId}:${ip}`, RATE_LIMIT);
        if (!rate.allowed) {
          return Response.json(
            { error: "Too many downloads. Try again shortly." },
            { status: 429 },
          );
        }

        // Check scope
        if (!hasScope(validation.scopes, "read") && !hasScope(validation.scopes, "*")) {
          return Response.json(
            { error: "Insufficient permissions. Required scope: read" },
            { status: 403 },
          );
        }

        try {
          const { modelId, fileId } = params;

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

          // Get file with version info
          const [file] = await db
            .select({
              id: modelFiles.id,
              filename: modelFiles.filename,
              storageKey: modelFiles.storageKey,
              size: modelFiles.size,
              versionId: modelFiles.versionId,
            })
            .from(modelFiles)
            .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
            .where(and(eq(modelFiles.id, fileId), eq(modelVersions.modelId, modelId)))
            .limit(1);

          if (!file) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          const egress = await checkAndTrackEgress({
            organizationId: validation.organizationId,
            bytes: file.size,
            downloadType: "file",
            fileId: file.id,
            modelId,
            ip,
          });

          if (!egress.allowed) {
            return Response.json(
              { error: "Bandwidth limit reached. Upgrade or add storage to continue." },
              { status: 429 },
            );
          }

          // Generate signed download URL (short expiry)
          const downloadUrl = await storageService.generateDownloadUrl(file.storageKey, 5);

          return Response.json({
            downloadUrl,
            filename: file.filename,
            size: file.size,
            expiresIn: 300, // 5 minutes
          });
        } catch (error) {
          console.error("API v1 file download error:", error);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
