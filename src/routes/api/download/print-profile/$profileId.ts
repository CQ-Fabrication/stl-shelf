import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db, modelFiles, modelVersions, models, printProfiles } from "@/lib/db";
import { storageService } from "@/server/services/storage";
import { checkAndTrackEgress } from "@/server/services/billing/egress.service";
import { getLiveSession } from "@/server/utils/live-session";
import { crossSiteBlockedResponse, isTrustedRequestOrigin } from "@/server/utils/request-security";
import { checkRateLimit, getClientIp } from "@/server/utils/rate-limit";

const RATE_LIMIT = { windowMs: 60_000, max: 60 };

export const Route = createFileRoute("/api/download/print-profile/$profileId")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { profileId: string } }) => {
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

        const { profileId } = params;

        const [profile] = await db
          .select({
            id: printProfiles.id,
            fileId: printProfiles.fileId,
            storageKey: modelFiles.storageKey,
            size: modelFiles.size,
            mimeType: modelFiles.mimeType,
            originalName: modelFiles.originalName,
            modelId: models.id,
          })
          .from(printProfiles)
          .innerJoin(modelFiles, eq(modelFiles.id, printProfiles.fileId))
          .innerJoin(modelVersions, eq(modelVersions.id, printProfiles.versionId))
          .innerJoin(models, eq(models.id, modelVersions.modelId))
          .where(and(eq(printProfiles.id, profileId), eq(models.organizationId, organizationId)))
          .limit(1);

        if (!profile) {
          return new Response("Profile not found", { status: 404 });
        }

        const egress = await checkAndTrackEgress({
          organizationId,
          bytes: profile.size,
          downloadType: "profile",
          fileId: profile.fileId,
          modelId: profile.modelId,
          ip,
        });

        if (!egress.allowed) {
          return Response.json(
            { error: "Bandwidth limit reached. Upgrade or add storage to continue." },
            { status: 429 },
          );
        }

        const stream = await storageService.getFileStream(profile.storageKey);
        const filename = profile.originalName || "profile";

        return new Response(stream, {
          headers: {
            "Content-Type": profile.mimeType || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store, max-age=0",
          },
        });
      },
    },
  },
});
