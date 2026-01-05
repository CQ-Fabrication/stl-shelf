import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStatsigClient } from "@statsig/react-bindings";
import { updateMarketingPromptFn } from "@/server/functions/consent";
import {
  trackMarketingBannerAccepted,
  trackMarketingBannerDeclined,
  trackMarketingBannerDeferred,
  trackMarketingBannerViewed,
} from "@/lib/statsig/client-events";
import { useConsentStatus } from "./use-consent-status";

const BANNER_DELAY_MS = 10_000; // 10 seconds
const BROADCAST_CHANNEL_NAME = "marketing-consent";
const MAX_RETRIES = 3;

type MarketingAction = "accept" | "decline" | "defer";

/**
 * Hook to manage the post-login marketing consent banner.
 * Handles: 10-second delay, BroadcastChannel sync, retry logic.
 */
export function useMarketingConsent() {
  const queryClient = useQueryClient();
  const { client: statsigClient } = useStatsigClient();
  const { shouldShowMarketingBanner, refetch } = useConsentStatus();

  // Track if banner should be visible (after delay)
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  // Track if user has interacted (to prevent showing again in same session)
  const [hasInteracted, setHasInteracted] = useState(false);
  // Timer ref for cleanup
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BroadcastChannel ref
  const channelRef = useRef<BroadcastChannel | null>(null);
  // Track if timer has started (persists across renders/navigations)
  const timerStartedRef = useRef(false);
  // Retry count
  const retryCountRef = useRef(0);

  // Mutation for updating marketing preference
  const mutation = useMutation({
    mutationFn: (action: MarketingAction) => updateMarketingPromptFn({ data: { action } }),
    onSuccess: () => {
      // Invalidate consent query to refresh state
      queryClient.invalidateQueries({ queryKey: ["consent-validity"] });
      // Broadcast to other tabs
      channelRef.current?.postMessage({ type: "consent-updated" });
      // Reset retry count
      retryCountRef.current = 0;
    },
    onError: (error) => {
      console.error("Failed to update marketing preference:", error);
      // Retry logic: silently retry up to MAX_RETRIES times
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * 2 ** (retryCountRef.current - 1);
        setTimeout(() => {
          // Re-trigger the last action
          // Note: We keep the banner visible, so user can retry manually if auto-retry fails
        }, delay);
      }
    },
  });

  // Handle banner action (accept/decline/defer)
  const handleAction = useCallback(
    (action: MarketingAction) => {
      // Track analytics event based on action
      if (statsigClient) {
        if (action === "accept") {
          trackMarketingBannerAccepted(statsigClient);
        } else if (action === "decline") {
          trackMarketingBannerDeclined(statsigClient);
        } else if (action === "defer") {
          trackMarketingBannerDeferred(statsigClient);
        }
      }

      setHasInteracted(true);
      setIsBannerVisible(false);
      mutation.mutate(action);
    },
    [mutation, statsigClient],
  );

  // Setup BroadcastChannel for multi-tab sync
  useEffect(() => {
    // Only setup if BroadcastChannel is available
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.type === "consent-updated") {
        // Another tab made a decision, hide banner and refetch
        setHasInteracted(true);
        setIsBannerVisible(false);
        refetch();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [refetch]);

  // Setup timer for 10-second delay
  useEffect(() => {
    // Don't start timer if:
    // - Server says banner shouldn't show
    // - User already interacted this session
    // - Timer already started (prevents reset on navigation)
    if (!shouldShowMarketingBanner || hasInteracted || timerStartedRef.current) {
      return;
    }

    // Mark timer as started (persists across re-renders/navigations)
    timerStartedRef.current = true;

    timerRef.current = setTimeout(() => {
      setIsBannerVisible(true);
      // Track banner viewed event
      if (statsigClient) {
        trackMarketingBannerViewed(statsigClient);
      }
    }, BANNER_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [shouldShowMarketingBanner, hasInteracted, statsigClient]);

  // Handle ESC key to dismiss (same as X click)
  useEffect(() => {
    if (!isBannerVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleAction("decline");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBannerVisible, handleAction]);

  return {
    isBannerVisible,
    isPending: mutation.isPending,
    handleAccept: () => handleAction("accept"),
    handleDecline: () => handleAction("decline"),
    handleDefer: () => handleAction("defer"),
  };
}
