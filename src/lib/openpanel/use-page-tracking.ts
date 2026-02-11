import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useOpenPanelClient } from "./client-provider";
import { applyOpenPanelAttribution } from "./attribution";

/**
 * Auto-tracks page views on navigation.
 * Logs a "page_view" event whenever the pathname changes.
 */
export function usePageTracking() {
  const { client } = useOpenPanelClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;

    applyOpenPanelAttribution(client, {
      environment: import.meta.env.MODE,
    });

    if (pathname !== prevPathname.current) {
      client.track("page_view", {
        path: pathname,
        referrer: prevPathname.current ?? "direct",
      });
      prevPathname.current = pathname;
    }
  }, [pathname, client]);
}

/**
 * Invisible component that enables page view tracking.
 */
export function PageTracker() {
  usePageTracking();
  return null;
}
