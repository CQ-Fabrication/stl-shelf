/**
 * Client-side event tracking helpers for OpenPanel.
 *
 * Typed wrappers around client.track() for common UI events.
 * Use these for tracking user interactions, funnels, and engagement.
 */

import type { OpenPanel } from "@openpanel/web";

type OpenPanelClient = OpenPanel;

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

  // Marketing Consent Banner
  MARKETING_BANNER_VIEWED: "marketing_banner_viewed",
  MARKETING_BANNER_ACCEPTED: "marketing_banner_accepted",
  MARKETING_BANNER_DECLINED: "marketing_banner_declined",
  MARKETING_BANNER_DEFERRED: "marketing_banner_deferred",
} as const;

export type ClientEventName = (typeof ClientEvent)[keyof typeof ClientEvent];

type Properties = Record<string, unknown>;

function cleanProperties(obj: Properties | undefined): Properties | undefined {
  if (!obj) return undefined;

  const entries = Object.entries(obj).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries);
}

// ============================================================
// Navigation Events
// ============================================================

export function trackNavClick(
  client: OpenPanelClient | null,
  item: string,
  context?: { from?: string; destination?: string },
) {
  client?.track(ClientEvent.NAV_CLICK, cleanProperties({ item, ...context }));
}

export function trackCtaClick(
  client: OpenPanelClient | null,
  button: string,
  context?: { location?: string; variant?: string },
) {
  client?.track(ClientEvent.CTA_CLICK, cleanProperties({ button, ...context }));
}

// ============================================================
// Form Events
// ============================================================

export function trackFormStart(client: OpenPanelClient | null, form: string) {
  client?.track(ClientEvent.FORM_START, { form });
}

export function trackFormSubmit(
  client: OpenPanelClient | null,
  form: string,
  metadata?: { success?: boolean; errorType?: string },
) {
  client?.track(
    ClientEvent.FORM_SUBMIT,
    cleanProperties({ form, success: metadata?.success !== false, errorType: metadata?.errorType }),
  );
}

export function trackFormError(
  client: OpenPanelClient | null,
  form: string,
  field: string,
  errorType?: string,
) {
  client?.track(ClientEvent.FORM_ERROR, cleanProperties({ form, field, errorType }));
}

// ============================================================
// Modal/Dialog Events
// ============================================================

export function trackModalOpen(client: OpenPanelClient | null, modal: string) {
  client?.track(ClientEvent.MODAL_OPEN, { modal });
}

export function trackModalClose(
  client: OpenPanelClient | null,
  modal: string,
  action?: "submit" | "cancel" | "dismiss",
) {
  client?.track(ClientEvent.MODAL_CLOSE, cleanProperties({ modal, action }));
}

// ============================================================
// Button/Action Events
// ============================================================

export function trackButtonClick(
  client: OpenPanelClient | null,
  button: string,
  context?: Record<string, unknown>,
) {
  client?.track(ClientEvent.BUTTON_CLICK, cleanProperties({ button, ...context }));
}

export function trackFeatureInteraction(
  client: OpenPanelClient | null,
  feature: string,
  action: string,
) {
  client?.track(ClientEvent.FEATURE_INTERACTION, { feature, action });
}

// ============================================================
// Model Card & Navigation Events
// ============================================================

export function trackModelCardClick(
  client: OpenPanelClient | null,
  modelId: string,
  context?: { source?: string },
) {
  client?.track(ClientEvent.MODEL_CARD_CLICK, cleanProperties({ modelId, ...context }));
}

export function trackTagClick(client: OpenPanelClient | null, tag: string, source: string) {
  client?.track(ClientEvent.TAG_CLICK, cleanProperties({ tag, source }));
}

// ============================================================
// Search Friction Events
// ============================================================

export function trackSearchRefined(client: OpenPanelClient | null, query: string) {
  client?.track(ClientEvent.SEARCH_REFINED, { query });
}

export function trackSearchAbandoned(
  client: OpenPanelClient | null,
  query: string,
  resultsCount: number,
) {
  client?.track(ClientEvent.SEARCH_ABANDONED, { query, resultsCount });
}

export function trackFrustratedSearchSession(client: OpenPanelClient | null, queryCount: number) {
  client?.track(ClientEvent.FRUSTRATED_SEARCH_SESSION, { queryCount });
}

// ============================================================
// Upload Events
// ============================================================

export function trackUploadStarted(client: OpenPanelClient | null, source: string) {
  client?.track(ClientEvent.UPLOAD_STARTED, { source });
}

export function trackUploadAbandoned(client: OpenPanelClient | null, source: string) {
  client?.track(ClientEvent.UPLOAD_ABANDONED, { source });
}

export function trackUploadRetry(client: OpenPanelClient | null, source: string) {
  client?.track(ClientEvent.UPLOAD_RETRY, { source });
}

// ============================================================
// Preview Events
// ============================================================

export function trackPreviewLoaded(client: OpenPanelClient | null, modelId: string) {
  client?.track(ClientEvent.PREVIEW_LOADED, { modelId });
}

export function trackPreviewInteraction(client: OpenPanelClient | null, modelId: string) {
  client?.track(ClientEvent.PREVIEW_INTERACTED, { modelId });
}

export function trackPreviewToDownload(client: OpenPanelClient | null, modelId: string) {
  client?.track(ClientEvent.PREVIEW_TO_DOWNLOAD, { modelId });
}

// ============================================================
// Billing Events
// ============================================================

export function trackPlanSelected(client: OpenPanelClient | null, plan: string) {
  client?.track(ClientEvent.PLAN_SELECTED, { plan });
}

export function trackPricingInteraction(client: OpenPanelClient | null, action: string) {
  client?.track(ClientEvent.PRICING_INTERACTION, { action });
}

export function trackStorageLimitWarning(client: OpenPanelClient | null) {
  client?.track(ClientEvent.STORAGE_LIMIT_WARNING);
}

// ============================================================
// Search & Filter Events
// ============================================================

export function trackFilterApplied(
  client: OpenPanelClient | null,
  filterType: string,
  value: string,
) {
  client?.track(ClientEvent.FILTER_APPLIED, { filterType, value });
}

export function trackSortChanged(client: OpenPanelClient | null, sortBy: string, order: string) {
  client?.track(ClientEvent.SORT_CHANGED, { sortBy, order });
}

// ============================================================
// Version Control Events
// ============================================================

export function trackVersionHistoryViewed(client: OpenPanelClient | null, modelId: string) {
  client?.track(ClientEvent.VERSION_HISTORY_VIEWED, { modelId });
}

export function trackChangelogViewed(client: OpenPanelClient | null, modelId: string) {
  client?.track(ClientEvent.CHANGELOG_VIEWED, { modelId });
}

// ============================================================
// Session Quality
// ============================================================

export function trackPurposefulReturn(client: OpenPanelClient | null) {
  client?.track(ClientEvent.PURPOSEFUL_RETURN);
}

// ============================================================
// Marketing Consent Banner
// ============================================================

export function trackMarketingBannerViewed(client: OpenPanelClient | null) {
  client?.track(ClientEvent.MARKETING_BANNER_VIEWED);
}

export function trackMarketingBannerAccepted(client: OpenPanelClient | null) {
  client?.track(ClientEvent.MARKETING_BANNER_ACCEPTED);
}

export function trackMarketingBannerDeclined(client: OpenPanelClient | null) {
  client?.track(ClientEvent.MARKETING_BANNER_DECLINED);
}

export function trackMarketingBannerDeferred(client: OpenPanelClient | null) {
  client?.track(ClientEvent.MARKETING_BANNER_DEFERRED);
}
