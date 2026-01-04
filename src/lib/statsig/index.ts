// ============================================================
// Server-side SDK (use in server functions)
// ============================================================

// Client functions
export {
  initializeStatsig,
  isStatsigEnabled,
  checkGate,
  getExperiment,
  logEvent,
  flushEvents,
  shutdownStatsig,
} from "./client";

// User builders
export {
  buildStatsigUser,
  buildAnonymousStatsigUser,
  buildMinimalStatsigUser,
  generateAnonymousId,
  ANONYMOUS_ID_COOKIE,
  type OrganizationData,
} from "./user";

// Server event tracking - Core Actions
export {
  trackModelUploaded,
  trackModelViewed,
  trackModelViewFromSearch, // NEW: Connects search → view funnel
  trackModelDownloaded,
  trackModelDeleted, // NEW: Churn signal
  trackSearchPerformed,
} from "./events";

// Server event tracking - File-Level (NEW per PO feedback)
export { trackFileDownloaded, trackFileFormatPreference } from "./events";

// Server event tracking - Version Control
export {
  trackVersionCreated,
  trackVersionViewed,
  trackOlderVersionDownloaded,
} from "./events";

// Server event tracking - Tags
export {
  trackTagCreated,
  trackTagApplied,
  trackTagRemoved,
  trackTagSearchUsed,
} from "./events";

// Server event tracking - User Lifecycle
export {
  trackUserSignedUp,
  trackUserOnboarded,
  trackUserInvitedMember,
  trackOrgCreated,
} from "./events";

// Server event tracking - Activation
export { trackActivationStepReached, trackUserActivated } from "./events";

// Server event tracking - Engagement
export {
  trackSessionStarted,
  trackReturnVisit, // NEW: Activation signal
  trackPurposefulReturn,
  trackFeatureUsed,
} from "./events";

// Server event tracking - Upload Friction
export {
  trackUploadStarted,
  trackUploadAbandoned,
  trackUploadError,
  trackUploadRetry,
  trackUploadValidationFailed, // NEW: Fixable friction
} from "./events";

// Server event tracking - Preview
export {
  trackPreviewLoaded,
  trackPreviewToDownload,
  trackPreviewFailed, // NEW: Preview friction
} from "./events";

// Server event tracking - Conversion
export {
  trackPricingPageViewed,
  trackCheckoutStarted,
  trackSubscriptionActivated,
  trackSubscriptionCanceled,
  trackStorageLimitWarning,
  trackStorageLimitBlocked,
} from "./events";

// Server event tracking - Library Health
export { trackLibraryHealthSnapshot } from "./events";

// Server event tracking - Errors
export { trackErrorEncountered } from "./events";

// Overrides (for development/testing)
export {
  hasLocalOverrides,
  getLocalOverrides,
  getOverride,
  clearOverrideCache,
} from "./overrides";

// Types
export type {
  SubscriptionTier,
  MemberRole,
  StatsigUserContext,
  AnonymousUserContext,
  FeatureGateName,
  ExperimentName,
  EventName,
  EventMetadata,
  ActivationStep,
  StatsigUser,
} from "./types";

// ============================================================
// Client-side SDK (use in React components)
// ============================================================

// React provider
export { StatsigClientProvider } from "./client-provider";

// Page tracking
export { usePageTracking, PageTracker } from "./use-page-tracking";

// Client-side event helpers - Navigation
export { trackNavClick, trackCtaClick } from "./client-events";

// Client-side event helpers - Forms
export {
  trackFormStart,
  trackFormSubmit,
  trackFormError,
} from "./client-events";

// Client-side event helpers - Modals
export { trackModalOpen, trackModalClose } from "./client-events";

// Client-side event helpers - Buttons
export { trackButtonClick, trackFeatureInteraction } from "./client-events";

// Client-side event helpers - Model Navigation
export { trackModelCardClick, trackTagClick } from "./client-events";

// Client-side event helpers - Search Friction
export {
  trackSearchRefined,
  trackSearchAbandoned,
  trackFrustratedSearchSession,
} from "./client-events";

// Client-side event helpers - Upload Friction
export {
  trackUploadStarted as trackUploadStartedClient,
  trackUploadAbandoned as trackUploadAbandonedClient,
  trackUploadRetry as trackUploadRetryClient,
} from "./client-events";

// Client-side event helpers - Preview
export {
  trackPreviewLoaded as trackPreviewLoadedClient,
  trackPreviewInteraction,
  trackPreviewToDownload as trackPreviewToDownloadClient,
} from "./client-events";

// Client-side event helpers - Billing
export {
  trackPlanSelected,
  trackPricingInteraction,
  trackStorageLimitWarning as trackStorageLimitWarningClient,
} from "./client-events";

// Client-side event helpers - Search & Filter
export { trackFilterApplied, trackSortChanged } from "./client-events";

// Client-side event helpers - Version Control
export {
  trackVersionHistoryViewed,
  trackChangelogViewed,
} from "./client-events";

// Client-side event helpers - Session Quality
export { trackPurposefulReturn as trackPurposefulReturnClient } from "./client-events";

// Re-export hooks for convenience
export { useStatsigClient } from "@statsig/react-bindings";

// Re-export StatsigClient type for event helpers
export type { StatsigClient } from "@statsig/js-client";
