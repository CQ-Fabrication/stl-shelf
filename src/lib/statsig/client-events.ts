/**
 * Client-side event tracking helpers for Statsig.
 *
 * These are typed wrappers around client.logEvent() for common UI events.
 * Use these for tracking user interactions, funnels, and engagement.
 *
 * Note: API events (upload, download, search) are tracked server-side.
 * These are for UI-only interactions.
 */

import type { StatsigClient } from "@statsig/js-client";

// Helper to filter undefined values from metadata
function cleanMetadata(
  obj: Record<string, string | undefined> | undefined
): Record<string, string> | undefined {
  if (!obj) return undefined;

  // Early return if object has no entries
  const entries = Object.entries(obj);
  if (entries.length === 0) return undefined;

  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// ============================================================
// Navigation Events
// ============================================================

/**
 * Track navigation link/button clicks
 */
export function trackNavClick(
  client: StatsigClient,
  item: string,
  context?: { from?: string; destination?: string }
) {
  client.logEvent("nav_click", item, cleanMetadata(context));
}

/**
 * Track CTA button clicks (Get Started, Sign Up, etc.)
 */
export function trackCtaClick(
  client: StatsigClient,
  button: string,
  context?: { location?: string; variant?: string }
) {
  client.logEvent("cta_click", button, cleanMetadata(context));
}

// ============================================================
// Form Events
// ============================================================

/**
 * Track when user starts filling a form (focus on first field)
 */
export function trackFormStart(client: StatsigClient, form: string) {
  client.logEvent("form_start", form);
}

/**
 * Track form submission attempt (regardless of success)
 */
export function trackFormSubmit(
  client: StatsigClient,
  form: string,
  metadata?: { success?: boolean; errorType?: string }
) {
  client.logEvent("form_submit", form, {
    success: metadata?.success !== false ? "true" : "false",
    ...(metadata?.errorType ? { errorType: metadata.errorType } : {}),
  });
}

/**
 * Track form validation errors
 */
export function trackFormError(
  client: StatsigClient,
  form: string,
  field: string,
  errorType?: string
) {
  client.logEvent("form_error", form, cleanMetadata({ field, errorType }));
}

// ============================================================
// Modal/Dialog Events
// ============================================================

/**
 * Track modal/dialog opens
 */
export function trackModalOpen(client: StatsigClient, modal: string) {
  client.logEvent("modal_open", modal);
}

/**
 * Track modal/dialog closes
 */
export function trackModalClose(
  client: StatsigClient,
  modal: string,
  action?: "submit" | "cancel" | "dismiss"
) {
  client.logEvent("modal_close", modal, cleanMetadata({ action }));
}

// ============================================================
// Button/Action Events
// ============================================================

/**
 * Track generic button clicks
 */
export function trackButtonClick(
  client: StatsigClient,
  button: string,
  context?: Record<string, string>
) {
  client.logEvent("button_click", button, context);
}

/**
 * Track feature interaction (for feature discovery tracking)
 */
export function trackFeatureInteraction(
  client: StatsigClient,
  feature: string,
  action: string
) {
  client.logEvent("feature_interaction", feature, { action });
}

// ============================================================
// Model Card & Navigation Events
// ============================================================

/**
 * Track model card click (navigating to detail)
 */
export function trackModelCardClick(
  client: StatsigClient,
  modelId: string,
  context?: { source?: string; position?: number }
) {
  client.logEvent(
    "model_card_click",
    modelId,
    cleanMetadata({
      source: context?.source,
      position: context?.position?.toString(),
    })
  );
}

/**
 * Track tag click (for filtering)
 */
export function trackTagClick(client: StatsigClient, tag: string, source: string) {
  client.logEvent("tag_click", tag, { source });
}

// ============================================================
// Search Friction Events (Client-side tracking)
// ============================================================

/**
 * Track when user refines their search immediately after getting results
 * Indicates the first search didn't return what they wanted
 */
export function trackSearchRefined(
  client: StatsigClient,
  originalQuery: string,
  refinedQuery: string,
  secondsToRefine: number
) {
  client.logEvent("search_refined", refinedQuery, {
    originalQuery,
    refinedQuery,
    secondsToRefine: secondsToRefine.toString(),
  });
}

/**
 * Track when user gets results but leaves without clicking any
 * Indicates poor search relevance
 */
export function trackSearchAbandoned(
  client: StatsigClient,
  query: string,
  resultsCount: number,
  secondsOnResults: number
) {
  client.logEvent("search_abandoned", query, {
    resultsCount: resultsCount.toString(),
    secondsOnResults: secondsOnResults.toString(),
  });
}

/**
 * Track frustrated search session (3+ searches with no downloads)
 * This is a critical friction signal
 */
export function trackFrustratedSearchSession(
  client: StatsigClient,
  searchCount: number,
  queries: string[],
  sessionDurationSeconds: number
) {
  client.logEvent("frustrated_search_session", searchCount.toString(), {
    searchCount: searchCount.toString(),
    queries: queries.join(", ").slice(0, 200), // Truncate for metadata limits
    sessionDurationSeconds: sessionDurationSeconds.toString(),
  });
}

// ============================================================
// Upload Friction Events (Client-side tracking)
// ============================================================

/**
 * Track when upload modal/flow is initiated
 */
export function trackUploadStarted(
  client: StatsigClient,
  fileCount: number,
  totalSizeBytes: number
) {
  client.logEvent("upload_started", fileCount.toString(), {
    fileCount: fileCount.toString(),
    totalSizeBytes: totalSizeBytes.toString(),
  });
}

/**
 * Track when user abandons upload flow before completion
 */
export function trackUploadAbandoned(
  client: StatsigClient,
  abandonedAtStep: "file_select" | "metadata" | "processing" | "unknown",
  secondsSpent: number,
  fileCount?: number
) {
  client.logEvent("upload_abandoned", abandonedAtStep, {
    abandonedAtStep,
    secondsSpent: secondsSpent.toString(),
    ...(fileCount ? { fileCount: fileCount.toString() } : {}),
  });
}

/**
 * Track upload retry after error
 */
export function trackUploadRetry(
  client: StatsigClient,
  attemptNumber: number,
  previousErrorType?: string
) {
  client.logEvent("upload_retry", attemptNumber.toString(), {
    attemptNumber: attemptNumber.toString(),
    ...(previousErrorType ? { previousErrorType } : {}),
  });
}

// ============================================================
// Preview Engagement Events
// ============================================================

/**
 * Track 3D preview load completion
 */
export function trackPreviewLoaded(
  client: StatsigClient,
  modelId: string,
  loadTimeMs: number,
  fileFormat: string
) {
  client.logEvent("preview_loaded", modelId, {
    loadTimeMs: loadTimeMs.toString(),
    fileFormat,
  });
}

/**
 * Track 3D preview interaction
 */
export function trackPreviewInteraction(
  client: StatsigClient,
  modelId: string,
  action: "rotate" | "zoom" | "pan" | "reset" | "fullscreen",
  interactionCount: number
) {
  client.logEvent("preview_interacted", modelId, {
    action,
    interactionCount: interactionCount.toString(),
  });
}

/**
 * Track conversion from preview to download
 * User previewed the model and then downloaded it
 */
export function trackPreviewToDownload(
  client: StatsigClient,
  modelId: string,
  previewDurationSeconds: number,
  interactionCount: number
) {
  client.logEvent("preview_to_download", modelId, {
    previewDurationSeconds: previewDurationSeconds.toString(),
    interactionCount: interactionCount.toString(),
  });
}

// ============================================================
// Billing Events
// ============================================================

/**
 * Track plan selection (before checkout)
 */
export function trackPlanSelected(
  client: StatsigClient,
  planId: string,
  context?: { currentPlan?: string; action?: "upgrade" | "downgrade" | "initial" }
) {
  client.logEvent("plan_selected", planId, cleanMetadata(context));
}

/**
 * Track pricing page interaction
 */
export function trackPricingInteraction(
  client: StatsigClient,
  action: "view_plans" | "toggle_billing" | "compare_features"
) {
  client.logEvent("pricing_interaction", action);
}

/**
 * Track storage limit warning shown to user
 */
export function trackStorageLimitWarning(
  client: StatsigClient,
  usagePercent: number,
  usedBytes: number,
  limitBytes: number
) {
  client.logEvent("storage_limit_warning", usagePercent.toString(), {
    usagePercent: usagePercent.toString(),
    usedBytes: usedBytes.toString(),
    limitBytes: limitBytes.toString(),
  });
}

// ============================================================
// Search & Filter Events
// ============================================================

/**
 * Track filter applied
 */
export function trackFilterApplied(
  client: StatsigClient,
  filterType: string,
  value: string
) {
  client.logEvent("filter_applied", filterType, { value });
}

/**
 * Track sort changed
 */
export function trackSortChanged(client: StatsigClient, sortBy: string, order: string) {
  client.logEvent("sort_changed", sortBy, { order });
}

// ============================================================
// Version Control Events (Client-side)
// ============================================================

/**
 * Track version history viewed
 */
export function trackVersionHistoryViewed(client: StatsigClient, modelId: string) {
  client.logEvent("version_history_viewed", modelId);
}

/**
 * Track changelog viewed
 */
export function trackChangelogViewed(
  client: StatsigClient,
  modelId: string,
  versionNumber: number
) {
  client.logEvent("changelog_viewed", modelId, {
    versionNumber: versionNumber.toString(),
  });
}

// ============================================================
// Session Quality Events
// ============================================================

/**
 * Track purposeful return - user came back and did something valuable
 */
export function trackPurposefulReturn(
  client: StatsigClient,
  daysSinceLastVisit: number,
  action: "search" | "download" | "upload" | "view"
) {
  client.logEvent("purposeful_return", action, {
    daysSinceLastVisit: daysSinceLastVisit.toString(),
    action,
  });
}
