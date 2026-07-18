import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, modelVersions, printProfiles } from "@/lib/db/schema/models";
import { startDelivery } from "@/server/services/metering/delivery-metering";
import { storageService } from "@/server/services/storage";

/**
 * Authenticated thumbnail delivery (spec Fase 4 decision: application proxy).
 *
 * Access control: thumbnails are bound to the AUTHENTICATED session, never to
 * the URL. The resolvers below only return a storage key when the resource
 * belongs to the caller's organization — a wrong-org or unknown id yields null
 * (routes answer 404, identical to "does not exist", so existence never
 * leaks). URLs are stable and unsigned: possessing one grants nothing.
 *
 * Caching (the cost fix): stable URLs + ETag + `Cache-Control: private,
 * max-age=86400` finally let browsers cache thumbnails (presigned URLs were
 * unique per render → zero cache hits). `private` ONLY — a shared cache must
 * never store cross-user content.
 */

/** versionId → its thumbnail key, ONLY if the version's model is in this org. */
export async function resolveVersionThumbnailKey(
  versionId: string,
  organizationId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ thumbnailPath: modelVersions.thumbnailPath })
    .from(modelVersions)
    .innerJoin(models, eq(models.id, modelVersions.modelId))
    .where(
      and(
        eq(modelVersions.id, versionId),
        eq(models.organizationId, organizationId),
        isNull(models.deletedAt),
      ),
    )
    .limit(1);

  return row?.thumbnailPath ?? null;
}

/** profileId → its thumbnail key, ONLY if the profile's model is in this org. */
export async function resolvePrintProfileThumbnailKey(
  profileId: string,
  organizationId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ thumbnailPath: printProfiles.thumbnailPath })
    .from(printProfiles)
    .innerJoin(modelVersions, eq(modelVersions.id, printProfiles.versionId))
    .innerJoin(models, eq(models.id, modelVersions.modelId))
    .where(
      and(
        eq(printProfiles.id, profileId),
        eq(models.organizationId, organizationId),
        isNull(models.deletedAt),
      ),
    )
    .limit(1);

  return row?.thumbnailPath ?? null;
}

export type ParsedRange =
  | { kind: "none" }
  | { kind: "unsatisfiable" }
  | { kind: "range"; start: number; end: number };

/**
 * Parse a single-span HTTP Range header against an object size.
 * Multi-range and malformed headers degrade to "none" (serving the whole
 * object is always a legal response to a Range request); a syntactically
 * valid but out-of-bounds range is "unsatisfiable" (→ 416).
 */
export function parseRangeHeader(header: string | null, size: number): ParsedRange {
  if (!header) {
    return { kind: "none" };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) {
    return { kind: "none" };
  }

  const [, startRaw = "", endRaw = ""] = match;

  // suffix form: bytes=-N (last N bytes)
  if (startRaw === "") {
    if (endRaw === "") {
      return { kind: "none" };
    }
    const suffixLength = Number.parseInt(endRaw, 10);
    if (suffixLength <= 0 || size <= 0) {
      return { kind: "unsatisfiable" };
    }
    return { kind: "range", start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  if (start >= size) {
    return { kind: "unsatisfiable" };
  }

  const end = endRaw === "" ? size - 1 : Math.min(Number.parseInt(endRaw, 10), size - 1);
  if (end < start) {
    return { kind: "unsatisfiable" };
  }

  return { kind: "range", start, end };
}

/** Strong quoted ETag from the storage object (stable fallback if S3 gave none). */
export function thumbnailEtag(meta: { etag: string }, storageKey: string, size: number): string {
  const raw =
    meta.etag || createHash("sha256").update(`${storageKey}:${size}`).digest("hex").slice(0, 32);
  return `"${raw}"`;
}

/** RFC 9110 If-None-Match: any listed entity-tag matches (weak-insensitive). */
export function etagMatches(ifNoneMatch: string, etag: string): boolean {
  if (ifNoneMatch.trim() === "*") {
    return true;
  }
  const normalize = (value: string) => value.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((candidate) => normalize(candidate) === normalize(etag));
}

const CACHE_CONTROL = "private, max-age=86400";

/**
 * Serve an ALREADY-AUTHORIZED thumbnail with HTTP caching, Range support and
 * two-segment metering. Callers MUST have resolved `storageKey` through one of
 * the org-scoped resolvers above — this function does not re-check ownership.
 */
export async function serveThumbnail(params: {
  request: Request;
  organizationId: string;
  storageKey: string;
}): Promise<Response> {
  const { request, organizationId, storageKey } = params;

  let meta: { size: number; contentType: string; etag: string };
  try {
    meta = await storageService.getFileMetadata(storageKey);
  } catch {
    // DB points at a key the bucket no longer has — same 404 as "no thumbnail".
    return new Response("Not found", { status: 404 });
  }

  const etag = thumbnailEtag(meta, storageKey, meta.size);
  const rangeHeader = request.headers.get("range");
  const rangeRequested = rangeHeader !== null;
  const baseHeaders: Record<string, string> = {
    ETag: etag,
    "Cache-Control": CACHE_CONTROL,
    "Accept-Ranges": "bytes",
  };

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && etagMatches(ifNoneMatch, etag)) {
    // Cache revalidation: no storage read, no body. Recorded as a completed
    // zero-byte proxy request — the cache win made visible in the rollups.
    await startDelivery({
      organizationId,
      deliveryKind: "thumbnail",
      deliveryPath: "application_proxy",
      bytesRequested: 0,
      rangeRequested,
    }).finalize("completed");
    return new Response(null, { status: 304, headers: baseHeaders });
  }

  const range = parseRangeHeader(rangeHeader, meta.size);
  if (range.kind === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${meta.size}` },
    });
  }

  const span = range.kind === "range" ? range : null;
  const bytesRequested = span ? span.end - span.start + 1 : meta.size;

  const meterParams = {
    organizationId,
    deliveryKind: "thumbnail",
    bytesRequested,
    rangeRequested,
  } as const;
  const internalMeter = startDelivery({
    ...meterParams,
    deliveryPath: "internal_storage_to_application",
  });
  const proxyMeter = startDelivery({ ...meterParams, deliveryPath: "application_proxy" });

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await storageService.getFileStream(
      storageKey,
      span ? { range: `bytes=${span.start}-${span.end}` } : {},
    );
  } catch {
    await internalMeter.finalize("failed");
    await proxyMeter.finalize("failed");
    return new Response("Failed to read thumbnail", { status: 502 });
  }

  const body = proxyMeter.wrapStream(internalMeter.wrapStream(stream));
  const headers: Record<string, string> = {
    ...baseHeaders,
    "Content-Type": meta.contentType,
    "Content-Length": String(bytesRequested),
  };

  if (span) {
    headers["Content-Range"] = `bytes ${span.start}-${span.end}/${meta.size}`;
    return new Response(body, { status: 206, headers });
  }

  return new Response(body, { status: 200, headers });
}
