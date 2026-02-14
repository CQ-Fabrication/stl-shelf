import { createFileRoute } from "@tanstack/react-router";
import { and, eq, isNull } from "drizzle-orm";
import { db, modelFiles, modelVersions, models } from "@/lib/db";
import { storageService } from "@/server/services/storage";
import { checkAndTrackEgress } from "@/server/services/billing/egress.service";
import { createContentDisposition } from "@/server/utils/filename-security";
import { getLiveSession } from "@/server/utils/live-session";
import { crossSiteBlockedResponse, isTrustedRequestOrigin } from "@/server/utils/request-security";
import { checkRateLimit, getClientIp } from "@/server/utils/rate-limit";

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

export const Route = createFileRoute("/api/download/file/$fileId")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { fileId: string } }) => {
        if (!isTrustedRequestOrigin(request)) {
          return crossSiteBlockedResponse();
        }

        const session = await getLiveSession(request.headers);

        if (!session?.session?.activeOrganizationId) {
          return new Response("Unauthorized", { status: 401 });
        }

        const organizationId = session.session.activeOrganizationId;
        const ip = getClientIp(request);
        const rate = checkRateLimit(`download:${organizationId}:${ip}`, RATE_LIMIT);

        if (!rate.allowed) {
          return Response.json(
            { error: "Too many downloads. Try again shortly." },
            { status: 429 },
          );
        }

        const { fileId } = params;

        const [file] = await db
          .select({
            id: modelFiles.id,
            size: modelFiles.size,
            mimeType: modelFiles.mimeType,
            storageKey: modelFiles.storageKey,
            originalName: modelFiles.originalName,
            modelId: models.id,
          })
          .from(modelFiles)
          .innerJoin(modelVersions, eq(modelFiles.versionId, modelVersions.id))
          .innerJoin(models, eq(models.id, modelVersions.modelId))
          .where(
            and(
              eq(modelFiles.id, fileId),
              eq(models.organizationId, organizationId),
              isNull(models.deletedAt),
            ),
          )
          .limit(1);

        if (!file) {
          return new Response("File not found", { status: 404 });
        }

        const egress = await checkAndTrackEgress({
          organizationId,
          bytes: file.size,
          downloadType: "file",
          fileId: file.id,
          modelId: file.modelId,
          ip,
        });

        if (!egress.allowed) {
          return Response.json(
            { error: "Bandwidth limit reached. Upgrade or add storage to continue." },
            { status: 429 },
          );
        }

        const stream = await storageService.getFileStream(file.storageKey);
        const disposition = new URL(request.url).searchParams.get("disposition");
        const isInline = disposition === "inline";
        const filename = file.originalName || "download";

        return new Response(stream, {
          headers: {
            "Content-Type": file.mimeType || "application/octet-stream",
            "Content-Disposition": createContentDisposition(
              isInline ? "inline" : "attachment",
              filename,
              "download",
            ),
            "Cache-Control": "private, no-store, max-age=0",
          },
        });
      },
    },
  },
});
