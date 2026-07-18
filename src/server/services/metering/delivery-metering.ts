import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { egressDailyRollups } from "@/lib/db/schema/metering";
import { shouldTrackEgressForDisposition } from "@/lib/billing/egress";
import { getErrorDetails, logErrorEvent } from "@/lib/logging";
import type { DeliveryKind, DeliveryPath } from "@/lib/metering/types";

/**
 * Delivery metering — the single service ALL delivery endpoints use to record
 * real transferred bytes into `egress_daily_rollups` (spec Fase 3).
 *
 * MEASUREMENT ONLY: this module never blocks a request. The existing
 * enforcement counter (`checkAndTrackEgress` → `organization.egress_*`) is a
 * separate, untouched system — measuring ≠ limiting.
 *
 * Persistence model: one atomic upsert per delivery, at request end
 * (`finalize`). Direct-to-DB per request-end is a deliberate choice at the
 * current scale (hundreds of downloads/day): no buffer to lose on crash, no
 * flusher to operate. If volume ever makes per-request writes hot, introduce
 * an in-process accumulator that flushes the same upsert shape periodically —
 * the rollup schema (increment-only ON CONFLICT) already supports it.
 *
 * Segment separation (spec: never double-count): a proxied request records TWO
 * rollup rows via two independent meters — `internal_storage_to_application`
 * (bytes read FROM object storage; free same-zone traffic) and
 * `application_proxy` (bytes sent TO the browser; server egress). They are
 * different network segments with different prices: distinct rows, never
 * summed by this service. For single-file proxies the two are ~equal minus
 * aborts; for ZIP they differ structurally (uncompressed in, compressed out).
 */

export type DeliveryStatus = "completed" | "aborted" | "failed";

export type StartDeliveryParams = {
  organizationId: string | null;
  deliveryKind: DeliveryKind;
  deliveryPath: DeliveryPath;
  /** Bytes the caller expects to serve; 0 when unknown upfront (e.g. ZIP compressed size). */
  bytesRequested: number;
  /** A Range header was present. Recorded only — these routes serve whole files today. */
  rangeRequested?: boolean;
};

export type DeliveryMeter = {
  /**
   * Wrap a source stream in a byte-counting pass-through. Pull-based, so
   * backpressure is preserved (a chunk is read from the source only when the
   * consumer asks) and nothing is buffered. Terminal events auto-finalize:
   * source end → completed, consumer cancel/response abort → aborted (and the
   * cancellation propagates to the source), source error → failed.
   */
  wrapStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array>;
  /** Idempotent: the first call (explicit or from a stream terminal event) wins. */
  finalize(status: DeliveryStatus): Promise<void>;
  /** Bytes counted toward the consumer so far. */
  bytesServed(): number;
};

/** Map the download route's `?disposition` to the metered delivery kind. */
export const deliveryKindForDisposition = (disposition: string | null): DeliveryKind =>
  shouldTrackEgressForDisposition(disposition) ? "file_download" : "preview_inline";

const utcUsageDate = (date: Date): string => date.toISOString().slice(0, 10);

type RollupIncrement = typeof egressDailyRollups.$inferInsert;

const increment = (column: { name: string }) =>
  sql.raw(`"egress_daily_rollups"."${column.name}" + excluded."${column.name}"`);

/** Atomic idempotent upsert: ON CONFLICT on the dedup key, increment counters. */
async function upsertRollup(values: RollupIncrement): Promise<void> {
  try {
    await db
      .insert(egressDailyRollups)
      .values(values)
      .onConflictDoUpdate({
        target: [
          egressDailyRollups.organizationId,
          egressDailyRollups.usageDate,
          egressDailyRollups.deliveryKind,
          egressDailyRollups.deliveryPath,
        ],
        set: {
          requestsStarted: increment(egressDailyRollups.requestsStarted),
          requestsCompleted: increment(egressDailyRollups.requestsCompleted),
          requestsAborted: increment(egressDailyRollups.requestsAborted),
          requestsFailed: increment(egressDailyRollups.requestsFailed),
          bytesRequested: increment(egressDailyRollups.bytesRequested),
          bytesServed: increment(egressDailyRollups.bytesServed),
          bytesAborted: increment(egressDailyRollups.bytesAborted),
          rangeRequests: increment(egressDailyRollups.rangeRequests),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    // Measurement must never fail a delivery: log and move on.
    logErrorEvent("metering.rollup.write_failed", {
      deliveryKind: values.deliveryKind,
      deliveryPath: values.deliveryPath,
      ...getErrorDetails(error),
    });
  }
}

/**
 * Start metering one delivery on one network segment. Create one meter per
 * segment (see module docs) and either wrap the response stream or call
 * `finalize` explicitly for non-stream outcomes (e.g. storage read failed
 * before streaming started).
 */
export function startDelivery(params: StartDeliveryParams): DeliveryMeter {
  const { organizationId, deliveryKind, deliveryPath, bytesRequested } = params;
  const rangeRequested = params.rangeRequested ?? false;

  let bytesServed = 0;
  let finalized = false;

  const finalize = async (status: DeliveryStatus): Promise<void> => {
    if (finalized) {
      return;
    }
    finalized = true;

    // bytesAborted = what the consumer asked for but never got — only known
    // when the expected size was known upfront.
    const bytesAborted =
      status === "aborted" && bytesRequested > 0 ? Math.max(0, bytesRequested - bytesServed) : 0;

    await upsertRollup({
      organizationId,
      usageDate: utcUsageDate(new Date()),
      deliveryKind,
      deliveryPath,
      requestsStarted: 1,
      requestsCompleted: status === "completed" ? 1 : 0,
      requestsAborted: status === "aborted" ? 1 : 0,
      requestsFailed: status === "failed" ? 1 : 0,
      bytesRequested,
      bytesServed,
      bytesAborted,
      rangeRequests: rangeRequested ? 1 : 0,
    });
  };

  const wrapStream = (source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> => {
    const reader = source.getReader();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await reader.read();
        } catch (error) {
          // Source (storage / inner segment) broke mid-stream.
          await finalize("failed");
          controller.error(error);
          return;
        }

        if (result.done) {
          // Finalize BEFORE signaling EOF so the rollup row exists by the time
          // the consumer observes completion (deterministic for callers/tests).
          await finalize("completed");
          controller.close();
          return;
        }

        bytesServed += result.value.byteLength;
        controller.enqueue(result.value);
      },
      async cancel(reason) {
        // Consumer went away (response abort / downstream cancel): propagate to
        // the source, then record the partial transfer.
        try {
          await reader.cancel(reason);
        } catch {
          // source cancel failure must not mask the abort accounting
        }
        await finalize("aborted");
      },
    });
  };

  return { wrapStream, finalize, bytesServed: () => bytesServed };
}

/**
 * Record the ISSUANCE of a presigned direct-download URL (`object_storage_direct`).
 *
 * ESTIMATE-grade by necessity: Hetzner exposes no per-bucket access logs or
 * usage API, so a presigned OS→browser transfer is unverifiable — we can only
 * observe that a URL was issued. Recorded as requestsStarted=1 +
 * bytesRequested=objectSize with requestsCompleted/bytesServed left at 0
 * (issuance ≠ download: the URL may never be used, be retried, or be fetched
 * multiple times). Never present these rows as measured egress.
 */
export async function recordPresignedIssuance(params: {
  organizationId: string | null;
  deliveryKind: DeliveryKind;
  bytesRequested: number;
}): Promise<void> {
  await upsertRollup({
    organizationId: params.organizationId,
    usageDate: utcUsageDate(new Date()),
    deliveryKind: params.deliveryKind,
    deliveryPath: "object_storage_direct",
    requestsStarted: 1,
    requestsCompleted: 0,
    requestsAborted: 0,
    requestsFailed: 0,
    bytesRequested: params.bytesRequested,
    bytesServed: 0,
    bytesAborted: 0,
    rangeRequests: 0,
  });
}
