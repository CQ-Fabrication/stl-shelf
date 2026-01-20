// ============================================================
// Server-side analytics (use in server functions)
// ============================================================

// User builders
export { buildOpenPanelProfile, type OrganizationData } from "./user";

// Server event tracking
export {
  trackModelUploaded,
  trackModelViewed,
  trackModelViewFromSearch,
  trackModelDownloaded,
  trackModelDeleted,
  trackSearchPerformed,
  trackFileDownloaded,
  trackFileFormatPreference,
  trackVersionCreated,
  trackVersionViewed,
  trackOlderVersionDownloaded,
  trackTagCreated,
  trackTagApplied,
  trackTagRemoved,
  trackTagSearchUsed,
  trackUserSignedUp,
  trackUserOnboarded,
  trackUserInvitedMember,
  trackOrgCreated,
  trackActivationStepReached,
  trackUserActivated,
  trackSessionStarted,
  trackReturnVisit,
  trackPurposefulReturn,
  trackFeatureUsed,
  trackUploadStarted,
  trackUploadAbandoned,
  trackUploadError,
  trackUploadRetry,
  trackUploadValidationFailed,
  trackPreviewLoaded,
  trackPreviewToDownload,
  trackPreviewFailed,
  trackPricingPageViewed,
  trackCheckoutStarted,
  trackSubscriptionActivated,
  trackSubscriptionCanceled,
  trackStorageLimitWarning,
  trackStorageLimitBlocked,
  trackLibraryHealthSnapshot,
  trackErrorEncountered,
} from "./events";

// Types
export type {
  SubscriptionTier,
  MemberRole,
  EventName,
  EventMetadata,
  ActivationStep,
  ErrorCategory,
  UploadErrorType,
  PreviewErrorType,
  ValidationErrorType,
} from "./types";

// ============================================================
// Client-side analytics (use in React components)
// ============================================================

export { OpenPanelProvider, useOpenPanelClient } from "./client-provider";
export { usePageTracking, PageTracker } from "./use-page-tracking";

// Client-side event helpers
export {
  ClientEvent,
  trackNavClick,
  trackCtaClick,
  trackFormStart,
  trackFormSubmit,
  trackFormError,
  trackModalOpen,
  trackModalClose,
  trackButtonClick,
  trackFeatureInteraction,
  trackModelCardClick,
  trackTagClick,
  trackSearchRefined,
  trackSearchAbandoned,
  trackFrustratedSearchSession,
  trackUploadStarted as trackUploadStartedClient,
  trackUploadAbandoned as trackUploadAbandonedClient,
  trackUploadRetry as trackUploadRetryClient,
  trackPreviewLoaded as trackPreviewLoadedClient,
  trackPreviewInteraction,
  trackPreviewToDownload as trackPreviewToDownloadClient,
  trackPlanSelected,
  trackPricingInteraction,
  trackStorageLimitWarning as trackStorageLimitWarningClient,
  trackFilterApplied,
  trackSortChanged,
  trackVersionHistoryViewed,
  trackChangelogViewed,
  trackPurposefulReturn as trackPurposefulReturnClient,
  trackMarketingBannerViewed,
  trackMarketingBannerAccepted,
  trackMarketingBannerDeclined,
  trackMarketingBannerDeferred,
} from "./client-events";
