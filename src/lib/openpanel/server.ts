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
