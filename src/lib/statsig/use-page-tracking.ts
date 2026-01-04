import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useStatsigClient } from "@statsig/react-bindings";

/**
 * Auto-tracks page views on navigation.
 * Logs a "page_view" event whenever the pathname changes.
 *
 * Usage: Add <PageTracker /> component that calls this hook.
 *
 * Event metadata:
 * - value: current pathname (e.g., "/library", "/models/123")
 * - referrer: previous pathname or "direct" for initial load
 */
export function usePageTracking() {
  const { client } = useStatsigClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    // Only log if pathname actually changed
    if (pathname !== prevPathname.current) {
      client.logEvent("page_view", pathname, {
        referrer: prevPathname.current ?? "direct",
        timestamp: new Date().toISOString(),
      });
      prevPathname.current = pathname;
    }
  }, [pathname, client]);
}

/**
 * Invisible component that enables page view tracking.
 * Add this inside StatsigClientProvider in your root layout.
 */
export function PageTracker() {
  usePageTracking();
  return null;
}
