import { OpenPanel } from "@openpanel/web";

let client: OpenPanel | null = null;

export function isOpenPanelClientEnabled(): boolean {
  return Boolean(import.meta.env.VITE_OPENPANEL_CLIENT_ID);
}

export function getOpenPanelClient(): OpenPanel | null {
  if (client) return client;
  if (typeof window === "undefined") return null;
  if (!import.meta.env.VITE_OPENPANEL_CLIENT_ID) return null;

  try {
    client = new OpenPanel({
      clientId: import.meta.env.VITE_OPENPANEL_CLIENT_ID,
      apiUrl: import.meta.env.VITE_OPENPANEL_API_URL || undefined,
      // Keep tracking explicit to avoid unexpected event noise
      trackScreenViews: false,
      trackOutgoingLinks: false,
      trackAttributes: false,
    });

    client.setGlobalProperties({
      environment: import.meta.env.MODE,
    });

    return client;
  } catch (error) {
    console.error("[OpenPanel] Client initialization failed:", error);
    return null;
  }
}
