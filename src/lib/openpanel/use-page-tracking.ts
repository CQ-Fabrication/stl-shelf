import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useOpenPanelClient } from "./client-provider";
import { applyOpenPanelAttribution } from "./attribution";

const UUID_PATH_SEGMENT_REGEX =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;

function getAnalyticsPath(pathname: string, routeId?: string): string {
  if (routeId?.startsWith("/")) {
    return routeId;
  }

  return pathname.replace(UUID_PATH_SEGMENT_REGEX, "/$id");
}

/**
 * Auto-tracks page views on navigation.
 * Logs a "screen_view" event whenever the pathname changes.
 */
export function usePageTracking() {
  const { client } = useOpenPanelClient();
  const { pathname, analyticsPath } = useRouterState({
    select: (s) => {
      const routeId = s.matches.at(-1)?.routeId;
      return {
        pathname: s.location.pathname,
        analyticsPath: getAnalyticsPath(
          s.location.pathname,
          typeof routeId === "string" ? routeId : undefined,
        ),
      };
    },
  });
  const prevPathname = useRef<string | null>(null);
  const prevAnalyticsPath = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;

    applyOpenPanelAttribution(client, {
      environment: import.meta.env.MODE,
    });

    if (pathname !== prevPathname.current) {
      client.screenView(`${window.location.origin}${analyticsPath}`, {
        path: analyticsPath,
        referrer: prevAnalyticsPath.current ?? "direct",
        title: document.title,
      });
      prevPathname.current = pathname;
      prevAnalyticsPath.current = analyticsPath;
    }
  }, [pathname, analyticsPath, client]);
}

/**
 * Invisible component that enables page view tracking.
 */
export function PageTracker() {
  usePageTracking();
  return null;
}
