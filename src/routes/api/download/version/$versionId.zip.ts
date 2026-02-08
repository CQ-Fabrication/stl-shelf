import archiver from "archiver";
import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { isTierAtLeast } from "@/lib/billing/config";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { modelDownloadService } from "@/server/services/models/model-download.service";
import { checkAndTrackEgress } from "@/server/services/billing/egress.service";
import { getLiveSession } from "@/server/utils/live-session";
import { crossSiteBlockedResponse, isTrustedRequestOrigin } from "@/server/utils/request-security";
import { checkRateLimit, getClientIp } from "@/server/utils/rate-limit";

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

export const Route = createFileRoute("/api/download/version/$versionId/zip")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { versionId: string } }) => {
        if (!isTrustedRequestOrigin(request)) {
          return crossSiteBlockedResponse();
        }

        // 1. Auth check using request headers
        const session = await getLiveSession(request.headers);

        if (!session?.session?.activeOrganizationId) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { versionId } = params;
        const organizationId = session.session.activeOrganizationId;

        const [org] = await db
          .select({
            subscriptionTier: organization.subscriptionTier,
          })
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1);

        if (!org) {
          return new Response("Organization not found", { status: 404 });
        }

        if (!isTierAtLeast(org.subscriptionTier, "basic")) {
          return Response.json(
            { error: "ZIP downloads are available on Basic and Pro plans." },
            { status: 403 },
          );
        }

        const ip = getClientIp(request);
        const rate = checkRateLimit(`zip-download:${organizationId}:${ip}`, RATE_LIMIT);

        if (!rate.allowed) {
          return Response.json(
            { error: "Too many downloads. Try again shortly." },
            { status: 429 },
          );
        }

        // 2. Get version info and validate access
        const versionInfo = await modelDownloadService.getVersionInfo(versionId, organizationId);

        if (!versionInfo) {
          return new Response("Not found", { status: 404 });
        }

        if (versionInfo.files.length === 0) {
          return new Response("No files in this version", { status: 404 });
        }

        const totalBytes = versionInfo.files.reduce((sum, file) => sum + file.size, 0);
        const egress = await checkAndTrackEgress({
          organizationId,
          bytes: totalBytes,
          downloadType: "zip",
          versionId,
          modelId: versionInfo.modelId,
          ip,
        });

        if (!egress.allowed) {
          return Response.json(
            { error: "Bandwidth limit reached. Upgrade or add storage to continue." },
            { status: 429 },
          );
        }

        // 3. Create streaming response via TransformStream
        const { readable, writable } = new TransformStream<Uint8Array>();
        const writer = writable.getWriter();

        // 4. Create archiver with moderate compression (balance speed/size)
        const archive = archiver("zip", { zlib: { level: 6 } });

        // Pipe archiver output to the TransformStream writer
        archive.on("data", (chunk: Buffer) => {
          writer.write(new Uint8Array(chunk));
        });

        archive.on("end", () => {
          writer.close();
        });

        archive.on("error", (err) => {
          console.error("Archive error:", err);
          writer.abort(err);
        });

        // 5. Stream files from R2 into archive (non-blocking)
        modelDownloadService
          .streamFilesToArchive(archive, versionInfo.files)
          .then(() => archive.finalize())
          .catch((err) => {
            console.error("Stream error:", err);
            archive.abort();
          });

        // 6. Return streaming response with download headers
        const filename = `${versionInfo.modelSlug}-v${versionInfo.versionNumber}.zip`;

        return new Response(readable, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      },
    },
  },
});
