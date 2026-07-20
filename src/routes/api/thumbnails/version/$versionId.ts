import { createFileRoute } from "@tanstack/react-router";
import { unauthorizedResponse } from "@/server/utils/unauthorized-response";
import {
  resolveVersionThumbnailKey,
  serveThumbnail,
} from "@/server/services/models/thumbnail-delivery.service";
import { getLiveSession } from "@/server/utils/live-session";
import { crossSiteBlockedResponse, isTrustedRequestOrigin } from "@/server/utils/request-security";
import { checkRateLimit, getClientIp } from "@/server/utils/rate-limit";

// Higher than downloads: a library page can request dozens of thumbnails in
// one burst (then the 24h private cache takes over).
const RATE_LIMIT = { windowMs: 60_000, max: 300 };

export const Route = createFileRoute("/api/thumbnails/version/$versionId")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { versionId: string } }) => {
        if (!isTrustedRequestOrigin(request)) {
          return crossSiteBlockedResponse();
        }

        const session = await getLiveSession(request.headers);

        if (!session?.session?.activeOrganizationId) {
          return unauthorizedResponse(request);
        }

        const organizationId = session.session.activeOrganizationId;
        const ip = getClientIp(request);
        const rate = checkRateLimit(`thumbnail:${organizationId}:${ip}`, RATE_LIMIT);

        if (!rate.allowed) {
          return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
        }

        // Bound to the session's organization: a wrong-org or unknown id is
        // indistinguishable from "no thumbnail" (404 — never leak existence).
        const storageKey = await resolveVersionThumbnailKey(params.versionId, organizationId);

        if (!storageKey) {
          return new Response("Not found", { status: 404 });
        }

        return serveThumbnail({ request, organizationId, storageKey });
      },
    },
  },
});
