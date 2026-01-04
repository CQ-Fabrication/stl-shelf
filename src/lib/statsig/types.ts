import type { StatsigUser } from "statsig-node";

/**
 * Subscription tiers matching Polar.sh billing
 */
export type SubscriptionTier = "free" | "basic" | "pro";

/**
 * Organization role for the current user
 */
export type MemberRole = "owner" | "admin" | "member";

/**
 * Context needed to build a Statsig user
 */
export type StatsigUserContext = {
  userId: string;
  email?: string;
  createdAt?: Date;
  organizationId?: string;
  organizationName?: string;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: string;
  memberRole?: MemberRole;
  modelsCount?: number;
  storageUsedBytes?: number;
  memberCount?: number;
  hasCompletedOnboarding?: boolean;
  ipAddress?: string;
};

/**
 * Anonymous user context (pre-authentication)
 */
export type AnonymousUserContext = {
  anonymousId: string;
  ipAddress?: string;
};

/**
 * Feature gate names (type-prefixed per convention)
 * exp_ = experiment
 * gate_ = feature gate
 * ops_ = operational toggle
 */
export type FeatureGateName =
  // Future feature gates
  | "gate_bulk_export"
  | "gate_api_access"
  | "gate_unlimited_storage"
  | "gate_custom_branding"
  | "gate_new_upload_flow"
  // Operational toggles
  | "ops_disable_processing"
  | "ops_disable_3d_preview"
  | "ops_maintenance_mode";

/**
 * Experiment names
 */
export type ExperimentName =
  | "exp_card_layout"
  | "exp_onboarding_flow"
  | "exp_search_ui";

/**
 * Activation funnel steps (revised per PO feedback)
 *
 * New funnel focuses on real value moments:
 * account_created → first_upload → first_tag → return_visit → search_to_download → activated
 */
export type ActivationStep =
  | "account_created"
  | "first_model_uploaded"
  | "first_tag_applied"
  | "return_visit" // Came back after 24+ hours
  | "first_search_to_download" // Searched, found, downloaded (core value)
  | "activated";

/**
 * Event names for analytics tracking
 */
export type EventName =
  // ============================================================
  // Core Actions - Model lifecycle
  // ============================================================
  | "model_uploaded"
  | "model_viewed"
  | "model_view_from_search" // NEW: Connects search → view funnel
  | "model_downloaded"
  | "model_redownloaded" // Same model downloaded again (reprint signal)
  | "model_deleted" // NEW: Churn signal
  | "search_performed"

  // ============================================================
  // File-Level Events (NEW per PO feedback)
  // ============================================================
  | "file_downloaded" // Individual file download
  | "file_format_preference" // Track which formats users download

  // ============================================================
  // Version Control - 3D printing specific
  // ============================================================
  | "version_created"
  | "version_viewed"
  | "older_version_downloaded"

  // ============================================================
  // Organization & Tags
  // ============================================================
  | "tag_created"
  | "tag_applied"
  | "tag_removed"
  | "tag_search_used"

  // ============================================================
  // User Lifecycle
  // ============================================================
  | "user_signed_up"
  | "user_onboarded"
  | "user_invited_member"
  | "org_created"

  // ============================================================
  // Activation Funnel
  // ============================================================
  | "activation_step_reached"
  | "user_activated"

  // ============================================================
  // Engagement & Health
  // ============================================================
  | "session_started"
  | "return_visit" // NEW: Came back after 24+ hours (activation signal)
  | "purposeful_return" // Return visit with search/download/upload
  | "feature_used"

  // ============================================================
  // Search Quality (Friction Detection)
  // ============================================================
  | "search_no_results"
  | "search_refined" // User searched again immediately
  | "search_abandoned" // Got results, left without clicking
  | "frustrated_search_session" // 3+ searches, 0 downloads

  // ============================================================
  // Upload Friction
  // ============================================================
  | "upload_started"
  | "upload_abandoned"
  | "upload_error"
  | "upload_retry"
  | "upload_validation_failed" // NEW: Wrong format, too big (fixable friction)

  // ============================================================
  // Preview Friction (NEW per PO feedback)
  // ============================================================
  | "preview_failed" // 3D preview couldn't load

  // ============================================================
  // Preview Engagement
  // ============================================================
  | "preview_loaded"
  | "preview_interacted"
  | "preview_to_download" // Previewed then downloaded

  // ============================================================
  // Conversion Funnel
  // ============================================================
  | "pricing_page_viewed"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_canceled"
  | "storage_limit_warning"
  | "storage_limit_blocked"

  // ============================================================
  // Library Health
  // ============================================================
  | "library_health_snapshot" // Periodic snapshot of library state

  // ============================================================
  // Errors
  // ============================================================
  | "error_encountered";

/**
 * Event metadata types for type-safe tracking
 */
export type EventMetadata = {
  // Core Actions
  model_uploaded: {
    modelId: string;
    fileCount: number;
    totalSizeBytes: number;
    hasPreviewImage: boolean;
    fileFormats?: string[]; // STL, 3MF, OBJ, etc.
    hasTags?: boolean;
    tagCount?: number;
  };
  model_viewed: {
    modelId: string;
    source: "search" | "direct" | "tag_filter" | "recent" | "shared";
    timeSinceUploadDays?: number;
  };
  // NEW: Connects search → view funnel (critical for measuring search effectiveness)
  model_view_from_search: {
    modelId: string;
    searchQuery: string;
    resultPosition: number; // Which position in search results was clicked
    resultsCount: number;
    secondsSinceSearch: number;
  };
  model_downloaded: {
    modelId: string;
    fileId?: string;
    downloadType: "single" | "zip";
    isRedownload: boolean; // Has user downloaded this before?
    timeSinceLastDownloadDays?: number;
    searchedBeforeDownload: boolean; // Was this preceded by search?
  };
  model_redownloaded: {
    modelId: string;
    downloadCount: number; // Total times downloaded
    daysSinceFirstDownload: number;
    daysSinceLastDownload?: number; // 2 days = replacement, 6 months = proven design
    reprintSource?: "search" | "recent" | "direct" | "tag_filter"; // How they found it again
  };
  // NEW: Churn signal - why are they removing models?
  model_deleted: {
    modelId: string;
    modelAgeInDays: number;
    hadTags: boolean;
    downloadCount: number; // Was it ever used?
    hadVersions: boolean;
  };
  // NEW: File-level tracking for format preferences
  file_downloaded: {
    modelId: string;
    fileId: string;
    fileFormat: string; // STL, 3MF, OBJ, etc.
    fileSizeBytes: number;
    isPartOfZip: boolean;
  };
  file_format_preference: {
    preferredFormat: string;
    availableFormats: string[];
    downloadCount: number;
  };
  search_performed: {
    query: string;
    resultsCount: number;
    hasFilters: boolean;
    tags?: string[];
    searchLatencyMs?: number;
  };

  // Version Control
  version_created: {
    modelId: string;
    versionNumber: number;
    hasChangelog: boolean;
    daysSinceLastVersion?: number;
  };
  version_viewed: {
    modelId: string;
    versionNumber: number;
  };
  older_version_downloaded: {
    modelId: string;
    versionNumber: number;
    latestVersion: number;
  };

  // Tags
  tag_created: {
    tagName: string;
    totalTagCount: number;
  };
  tag_applied: {
    modelId: string;
    tagName: string;
    modelTagCount: number;
  };
  tag_removed: {
    modelId: string;
    tagName: string;
  };
  tag_search_used: {
    tagName: string;
    resultsCount: number;
  };

  // User Lifecycle
  user_signed_up: {
    method: "email" | "magic_link" | "github" | "google";
  };
  user_onboarded: {
    stepsCompleted: number;
  };
  user_invited_member: {
    organizationId: string;
    role: MemberRole;
  };
  org_created: {
    organizationId: string;
    name: string;
  };

  // Activation
  activation_step_reached: {
    step: ActivationStep;
    daysFromSignup: number;
  };
  user_activated: {
    daysToActivation: number;
    modelsAtActivation: number;
    tagsAtActivation: number;
  };

  // Engagement
  session_started: {
    isReturningUser: boolean;
    daysSinceLastVisit?: number;
  };
  // NEW: Activation signal - came back after 24+ hours
  return_visit: {
    daysSinceLastVisit: number;
    hoursSinceLastVisit: number;
    previousSessionDurationSeconds?: number;
  };
  purposeful_return: {
    daysSinceLastVisit: number;
    action: "search" | "download" | "upload" | "view";
  };
  feature_used: {
    featureName: string;
    context?: string;
  };

  // Search Quality
  search_no_results: {
    query: string;
    hasFilters: boolean;
  };
  search_refined: {
    originalQuery: string;
    refinedQuery: string;
    secondsToRefine: number;
  };
  search_abandoned: {
    query: string;
    resultsCount: number;
    secondsOnResults: number;
  };
  frustrated_search_session: {
    searchCount: number;
    queries: string[];
    sessionDurationSeconds: number;
  };

  // Upload Friction
  upload_started: {
    fileCount: number;
    totalSizeBytes: number;
  };
  upload_abandoned: {
    fileCount: number;
    totalSizeBytes: number;
    abandonedAtStep: "file_select" | "metadata" | "processing" | "unknown";
    secondsSpent: number;
  };
  upload_error: {
    errorType: "size_limit" | "format" | "network" | "processing" | "unknown";
    fileSize?: number;
    fileFormat?: string;
  };
  upload_retry: {
    attemptNumber: number;
    previousErrorType?: string;
  };
  // NEW: Fixable friction - wrong format, too big
  upload_validation_failed: {
    reason: "invalid_format" | "file_too_large" | "empty_file" | "corrupt_file";
    fileName: string;
    fileSize?: number;
    attemptedFormat?: string;
    maxAllowedSize?: number;
  };
  // NEW: Preview friction - broken files or viewer issues
  preview_failed: {
    modelId: string;
    fileId: string;
    fileFormat: string;
    errorType: "load_error" | "render_error" | "timeout" | "unsupported_format";
    loadTimeMs?: number;
  };

  // Preview
  preview_loaded: {
    modelId: string;
    loadTimeMs: number;
    fileFormat: string;
  };
  preview_interacted: {
    modelId: string;
    action: "rotate" | "zoom" | "pan" | "reset" | "fullscreen";
    interactionCount: number;
  };
  preview_to_download: {
    modelId: string;
    previewDurationSeconds: number;
    interactionCount: number;
  };

  // Conversion
  pricing_page_viewed: {
    source?: string;
    currentTier: SubscriptionTier;
  };
  checkout_started: {
    targetTier: SubscriptionTier;
    currentTier: SubscriptionTier;
    trigger?: "storage_limit" | "feature_gate" | "organic";
  };
  subscription_activated: {
    tier: SubscriptionTier;
    previousTier?: SubscriptionTier;
  };
  subscription_canceled: {
    tier: SubscriptionTier;
    reason?: string;
  };
  storage_limit_warning: {
    usagePercent: number;
    usedBytes: number;
    limitBytes: number;
  };
  storage_limit_blocked: {
    attemptedUploadBytes: number;
    currentUsageBytes: number;
    limitBytes: number;
  };

  // Library Health (periodic snapshot) - enhanced per PO feedback
  library_health_snapshot: {
    // Core metrics
    totalModels: number;
    modelsWithTags: number;
    modelsWithVersions: number;
    totalStorageBytes: number;

    // Usage metrics
    modelsAccessedLast90Days: number;
    modelsDownloadedMoreThanOnce: number;
    averageTagsPerModel: number;

    // Calculated rates
    libraryUtilizationRate: number; // accessed/total
    reprintRate: number; // redownloaded/downloaded

    // NEW: Dead weight metrics
    modelsNeverDownloaded: number; // Uploaded but never used
    deadWeightRatio: number; // neverDownloaded/total

    // NEW: Findability health
    searchSuccessRate: number; // searches that led to views/downloads
    averageSearchesPerSession: number; // lower = better findability

    // NEW: Activity metrics
    weeklyActiveModels: number; // Models touched this week
    averageModelAgeDays: number; // Is this a living library or archive?
  };

  // Errors
  error_encountered: {
    errorType: string;
    errorMessage: string;
    context?: string;
  };
};

/**
 * Re-export StatsigUser for convenience
 */
export type { StatsigUser };
