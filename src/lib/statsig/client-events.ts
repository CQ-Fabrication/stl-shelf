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

/**
 * Client-side event name constants.
 * Using const object ensures typos are caught at compile time.
 */
export const ClientEvent = {
  // Navigation
  NAV_CLICK: "nav_click",
  CTA_CLICK: "cta_click",

  // Forms
  FORM_START: "form_start",
  FORM_SUBMIT: "form_submit",
  FORM_ERROR: "form_error",

  // Modals
  MODAL_OPEN: "modal_open",
  MODAL_CLOSE: "modal_close",

  // Actions
  BUTTON_CLICK: "button_click",
  FEATURE_INTERACTION: "feature_interaction",

  // Model & Tags
  MODEL_CARD_CLICK: "model_card_click",
  TAG_CLICK: "tag_click",

  // Search Friction
  SEARCH_REFINED: "search_refined",
  SEARCH_ABANDONED: "search_abandoned",
  FRUSTRATED_SEARCH_SESSION: "frustrated_search_session",

  // Upload
  UPLOAD_STARTED: "upload_started",
  UPLOAD_ABANDONED: "upload_abandoned",
  UPLOAD_RETRY: "upload_retry",

  // Preview
  PREVIEW_LOADED: "preview_loaded",
  PREVIEW_INTERACTED: "preview_interacted",
  PREVIEW_TO_DOWNLOAD: "preview_to_download",

  // Billing
  PLAN_SELECTED: "plan_selected",
  PRICING_INTERACTION: "pricing_interaction",
  STORAGE_LIMIT_WARNING: "storage_limit_warning",

  // Search & Filter
  FILTER_APPLIED: "filter_applied",
  SORT_CHANGED: "sort_changed",

  // Version Control
  VERSION_HISTORY_VIEWED: "version_history_viewed",
  CHANGELOG_VIEWED: "changelog_viewed",

  // Session
  PURPOSEFUL_RETURN: "purposeful_return",
} as const;

export type ClientEventName = (typeof ClientEvent)[keyof typeof ClientEvent];

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
  client.logEvent(ClientEvent.NAV_CLICK, item, cleanMetadata(context));
}

/**
 * Track CTA button clicks (Get Started, Sign Up, etc.)
 */
export function trackCtaClick(
  client: StatsigClient,
  button: string,
  context?: { location?: string; variant?: string }
) {
  client.logEvent(ClientEvent.CTA_CLICK, button, cleanMetadata(context));
}

// ============================================================
// Form Events
// ============================================================

/**
 * Track when user starts filling a form (focus on first field)
 */
export function trackFormStart(client: StatsigClient, form: string) {
  client.logEvent(ClientEvent.FORM_START, form);
}

/**
 * Track form submission attempt (regardless of success)
 */
export function trackFormSubmit(
  client: StatsigClient,
  form: string,
  metadata?: { success?: boolean; errorType?: string }
) {
  client.logEvent(ClientEvent.FORM_SUBMIT, form, {
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
  client.logEvent(ClientEvent.FORM_ERROR, form, cleanMetadata({ field, errorType }));
}

// ============================================================
// Modal/Dialog Events
// ============================================================

/**
 * Track modal/dialog opens
 */
export function trackModalOpen(client: StatsigClient, modal: string) {
  client.logEvent(ClientEvent.MODAL_OPEN, modal);
}

/**
 * Track modal/dialog closes
 */
export function trackModalClose(
  client: StatsigClient,
  modal: string,
  action?: "submit" | "cancel" | "dismiss"
) {
  client.logEvent(ClientEvent.MODAL_CLOSE, modal, cleanMetadata({ action }));
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
  client.logEvent(ClientEvent.BUTTON_CLICK, button, context);
}

/**
 * Track feature interaction (for feature discovery tracking)
 */
export function trackFeatureInteraction(
  client: StatsigClient,
  feature: string,
  action: string
) {
  client.logEvent(ClientEvent.FEATURE_INTERACTION, feature, { action });
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
    ClientEvent.MODEL_CARD_CLICK,
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
  client.logEvent(ClientEvent.TAG_CLICK, tag, { source });
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
  client.logEvent(ClientEvent.SEARCH_REFINED, refinedQuery, {
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
  client.logEvent(ClientEvent.SEARCH_ABANDONED, query, {
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
  client.logEvent(ClientEvent.FRUSTRATED_SEARCH_SESSION, searchCount.toString(), {
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
  client.logEvent(ClientEvent.UPLOAD_STARTED, fileCount.toString(), {
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
  client.logEvent(ClientEvent.UPLOAD_ABANDONED, abandonedAtStep, {
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
  client.logEvent(ClientEvent.UPLOAD_RETRY, attemptNumber.toString(), {
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
  client.logEvent(ClientEvent.PREVIEW_LOADED, modelId, {
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
  client.logEvent(ClientEvent.PREVIEW_INTERACTED, modelId, {
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
  client.logEvent(ClientEvent.PREVIEW_TO_DOWNLOAD, modelId, {
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
  client.logEvent(ClientEvent.PLAN_SELECTED, planId, cleanMetadata(context));
}

/**
 * Track pricing page interaction
 */
export function trackPricingInteraction(
  client: StatsigClient,
  action: "view_plans" | "toggle_billing" | "compare_features"
) {
  client.logEvent(ClientEvent.PRICING_INTERACTION, action);
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
  client.logEvent(ClientEvent.STORAGE_LIMIT_WARNING, usagePercent.toString(), {
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
  client.logEvent(ClientEvent.FILTER_APPLIED, filterType, { value });
}

/**
 * Track sort changed
 */
export function trackSortChanged(client: StatsigClient, sortBy: string, order: string) {
  client.logEvent(ClientEvent.SORT_CHANGED, sortBy, { order });
}

// ============================================================
// Version Control Events (Client-side)
// ============================================================

/**
 * Track version history viewed
 */
export function trackVersionHistoryViewed(client: StatsigClient, modelId: string) {
  client.logEvent(ClientEvent.VERSION_HISTORY_VIEWED, modelId);
}

/**
 * Track changelog viewed
 */
export function trackChangelogViewed(
  client: StatsigClient,
  modelId: string,
  versionNumber: number
) {
  client.logEvent(ClientEvent.CHANGELOG_VIEWED, modelId, {
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
  client.logEvent(ClientEvent.PURPOSEFUL_RETURN, action, {
    daysSinceLastVisit: daysSinceLastVisit.toString(),
    action,
  });
}
