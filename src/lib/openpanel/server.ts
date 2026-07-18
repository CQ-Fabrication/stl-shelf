import { OpenPanel } from "@openpanel/sdk";
import { env } from "@/lib/env";
import type { EventMetadata, EventName } from "./types";
import type { OpenPanelProfile } from "./user";

let serverClient: OpenPanel | null = null;

function cleanProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

function getOpenPanelServer(): OpenPanel | null {
  if (!env.OPENPANEL_CLIENT_ID || !env.OPENPANEL_CLIENT_SECRET) return null;

  if (!serverClient) {
    serverClient = new OpenPanel({
      clientId: env.OPENPANEL_CLIENT_ID,
      clientSecret: env.OPENPANEL_CLIENT_SECRET,
      apiUrl: env.OPENPANEL_API_URL || undefined,
    });
  }

  return serverClient;
}

export function isOpenPanelServerEnabled(): boolean {
  return Boolean(env.OPENPANEL_CLIENT_ID && env.OPENPANEL_CLIENT_SECRET);
}

export async function logEvent<T extends EventName>(
  profile: OpenPanelProfile,
  eventName: T,
  value?: number,
  metadata?: T extends keyof EventMetadata ? EventMetadata[T] : Record<string, unknown>,
): Promise<void> {
  const client = getOpenPanelServer();

  if (!client) {
    if (env.OPENPANEL_CLIENT_ID || env.OPENPANEL_CLIENT_SECRET) {
      console.log("[OpenPanel] Event (disabled):", eventName, metadata);
    }
    return;
  }

  const properties = cleanProperties({
    ...(profile.properties ?? {}),
    ...(metadata ?? {}),
    ...(value !== undefined ? { value } : {}),
    profileId: profile.profileId,
  });

  try {
    await client.track(eventName, properties);
  } catch (error) {
    console.warn("[OpenPanel] Event tracking failed:", error);
  }
}

// ============================================================
// Revenue senders (ported from Tailmux)
//
// logEvent above swallows errors; the revenue ledger's retry logic needs
// failures to THROW, so these use a raw fetch to /track. The @openpanel/sdk
// track() does not reliably surface HTTP failures.
// ============================================================

export type CommerceProperties = {
  profileId: string;
  orderId: string;
  productId: string | null;
  subscriptionId: string | null;
  tier: string | null;
  billingReason: string;
  currency: string;
  totalAmountMinor: number;
  taxAmountMinor: number;
  timestamp: Date;
};

type TrackPayload = {
  type: "track";
  payload: {
    name: string;
    profileId: string;
    properties: Record<string, unknown>;
  };
};

function assertMinorAmount(amountMinor: number, field: string): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`Invalid ${field}: expected a non-negative safe integer, got ${amountMinor}.`);
  }
}

function buildRevenuePayload(amountMinor: number, props: CommerceProperties): TrackPayload {
  assertMinorAmount(amountMinor, "amountMinor");

  return {
    type: "track",
    payload: {
      name: "revenue",
      profileId: props.profileId,
      properties: {
        __revenue: amountMinor,
        __timestamp: props.timestamp.toISOString(),
        orderId: props.orderId,
        productId: props.productId,
        subscriptionId: props.subscriptionId,
        tier: props.tier,
        billingReason: props.billingReason,
        currency: props.currency.toLowerCase(),
        provider: "polar",
        totalAmountMinor: props.totalAmountMinor,
        taxAmountMinor: props.taxAmountMinor,
      },
    },
  };
}

function buildRefundPayload(amountMinor: number, props: CommerceProperties): TrackPayload {
  assertMinorAmount(amountMinor, "amountMinor");

  return {
    type: "track",
    payload: {
      name: "refund",
      profileId: props.profileId,
      properties: {
        __timestamp: props.timestamp.toISOString(),
        refundAmountMinor: amountMinor,
        orderId: props.orderId,
        productId: props.productId,
        subscriptionId: props.subscriptionId,
        tier: props.tier,
        billingReason: props.billingReason,
        currency: props.currency.toLowerCase(),
        provider: "polar",
      },
    },
  };
}

async function sendTrackPayload(payload: TrackPayload): Promise<"sent" | "skipped"> {
  // Unlike Tailmux, an unconfigured OpenPanel is a no-op everywhere; the ledger
  // layer decides whether to retry later, so we never throw here.
  if (!isOpenPanelServerEnabled()) return "skipped" as const;

  const baseUrl = (env.OPENPANEL_API_URL || "https://api.openpanel.dev").replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/track`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "openpanel-client-id": env.OPENPANEL_CLIENT_ID ?? "",
      "openpanel-client-secret": env.OPENPANEL_CLIENT_SECRET ?? "",
      "openpanel-sdk-name": "stl-shelf-server",
      "openpanel-sdk-version": "1",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`OpenPanel track request failed with status ${response.status}.`);
  }

  return "sent" as const;
}

export function trackRevenue(
  amountMinor: number,
  props: CommerceProperties,
): Promise<"sent" | "skipped"> {
  return sendTrackPayload(buildRevenuePayload(amountMinor, props));
}

export function trackRefund(
  amountMinor: number,
  props: CommerceProperties,
): Promise<"sent" | "skipped"> {
  return sendTrackPayload(buildRefundPayload(amountMinor, props));
}
