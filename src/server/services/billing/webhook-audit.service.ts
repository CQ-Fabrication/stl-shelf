import { db } from "@/lib/db";
import { billingWebhookEvents } from "@/lib/db/schema/billing";
import { logErrorEvent } from "@/lib/logging";

type WebhookPayload = {
  type?: string;
  data?: Record<string, unknown>;
};

const getString = (value: unknown) => (typeof value === "string" ? value : null);

const extractIds = (payload: WebhookPayload) => {
  const data = payload.data && typeof payload.data === "object" ? payload.data : undefined;
  if (!data) {
    return { customerId: null, subscriptionId: null };
  }

  const customerId = getString(
    (data as Record<string, unknown>).customerId ?? (data as Record<string, unknown>).customer_id,
  );
  const subscriptionId = getString(
    (data as Record<string, unknown>).subscriptionId ??
      (data as Record<string, unknown>).subscription_id,
  );

  return { customerId, subscriptionId };
};

const normalizePayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") return null;
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
};

export const recordWebhookPayload = async (payload: unknown) => {
  try {
    const normalized = normalizePayload(payload);
    if (!normalized) return;

    const eventType = typeof normalized.type === "string" ? normalized.type : "unknown";
    const { customerId, subscriptionId } = extractIds(normalized as WebhookPayload);

    await db.insert(billingWebhookEvents).values({
      eventType,
      payload: normalized,
      customerId,
      subscriptionId,
    });
  } catch (error) {
    logErrorEvent("billing.webhook.store_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
