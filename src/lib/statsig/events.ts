import type { StatsigUser } from "statsig-node";
import { logEvent } from "./client";
import type {
  ActivationStep,
  ErrorCategory,
  EventMetadata,
  MemberRole,
  SubscriptionTier,
} from "./types";

// ============================================================
// Helpers
// ============================================================

/**
 * Sanitize search queries to remove potential PII
 * - Removes email-like patterns
 * - Removes phone number patterns
 * - Truncates to reasonable length
 */
function sanitizeQuery(query: string): string {
  return (
    query
      // Remove email-like patterns
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
      // Remove phone-like patterns (various formats)
      .replace(/[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,4}[-\s.]?[0-9]{3,6}/g, "[PHONE]")
      // Truncate to 200 chars max
      .slice(0, 200)
  );
}

/**
 * Safe wrapper for tracking functions
 * Ensures analytics failures never break business logic
 */
async function safeTrack(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    // Analytics should never break the app - log and continue
    console.warn("[Statsig] Tracking failed:", error);
  }
}

// ============================================================
// Core Actions - Model lifecycle events
// ============================================================

export async function trackModelUploaded(
  user: StatsigUser,
  metadata: EventMetadata["model_uploaded"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "model_uploaded", metadata.fileCount, metadata));
}

export async function trackModelViewed(
  user: StatsigUser,
  metadata: EventMetadata["model_viewed"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "model_viewed", undefined, metadata));
}

export async function trackModelDownloaded(
  user: StatsigUser,
  metadata: EventMetadata["model_downloaded"],
): Promise<void> {
  await safeTrack(async () => {
    await logEvent(user, "model_downloaded", undefined, metadata);

    // Track redownload separately if applicable
    if (metadata.isRedownload) {
      await logEvent(user, "model_redownloaded", undefined, {
        modelId: metadata.modelId,
        downloadCount: 2, // At minimum, this is the 2nd download
        daysSinceFirstDownload: metadata.timeSinceLastDownloadDays ?? 0,
      });
    }
  });
}

export async function trackSearchPerformed(
  user: StatsigUser,
  metadata: EventMetadata["search_performed"],
): Promise<void> {
  // Sanitize query to remove potential PII
  const sanitizedMetadata = {
    ...metadata,
    query: sanitizeQuery(metadata.query),
  };

  await safeTrack(async () => {
    await logEvent(user, "search_performed", metadata.resultsCount, sanitizedMetadata);

    // Track zero-result searches separately for friction analysis
    if (metadata.resultsCount === 0) {
      await logEvent(user, "search_no_results", undefined, {
        query: sanitizedMetadata.query,
        hasFilters: metadata.hasFilters,
      });
    }
  });
}

// Connects search → view funnel (critical for measuring search effectiveness)
export async function trackModelViewFromSearch(
  user: StatsigUser,
  metadata: EventMetadata["model_view_from_search"],
): Promise<void> {
  // Sanitize search query
  const sanitizedMetadata = {
    ...metadata,
    searchQuery: sanitizeQuery(metadata.searchQuery),
  };
  await safeTrack(() =>
    logEvent(user, "model_view_from_search", metadata.resultPosition, sanitizedMetadata),
  );
}

// Churn signal - why are they removing models?
export async function trackModelDeleted(
  user: StatsigUser,
  metadata: EventMetadata["model_deleted"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "model_deleted", undefined, metadata));
}

// ============================================================
// File-Level Events (NEW per PO feedback)
// ============================================================

export async function trackFileDownloaded(
  user: StatsigUser,
  metadata: EventMetadata["file_downloaded"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "file_downloaded", metadata.fileSizeBytes, metadata));
}

export async function trackFileFormatPreference(
  user: StatsigUser,
  metadata: EventMetadata["file_format_preference"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "file_format_preference", metadata.downloadCount, metadata));
}

// ============================================================
// Version Control - 3D printing specific
// ============================================================

export async function trackVersionCreated(
  user: StatsigUser,
  metadata: EventMetadata["version_created"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "version_created", metadata.versionNumber, metadata));
}

export async function trackVersionViewed(
  user: StatsigUser,
  metadata: EventMetadata["version_viewed"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "version_viewed", undefined, metadata));
}

export async function trackOlderVersionDownloaded(
  user: StatsigUser,
  metadata: EventMetadata["older_version_downloaded"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "older_version_downloaded", undefined, metadata));
}

// ============================================================
// Tags - Organization tracking
// ============================================================

export async function trackTagCreated(
  user: StatsigUser,
  metadata: EventMetadata["tag_created"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "tag_created", metadata.totalTagCount, metadata));
}

export async function trackTagApplied(
  user: StatsigUser,
  metadata: EventMetadata["tag_applied"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "tag_applied", metadata.modelTagCount, metadata));
}

export async function trackTagRemoved(
  user: StatsigUser,
  metadata: EventMetadata["tag_removed"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "tag_removed", undefined, metadata));
}

export async function trackTagSearchUsed(
  user: StatsigUser,
  metadata: EventMetadata["tag_search_used"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "tag_search_used", metadata.resultsCount, metadata));
}

// ============================================================
// User Lifecycle - Account and organization events
// ============================================================

export async function trackUserSignedUp(
  user: StatsigUser,
  method: "email" | "magic_link" | "github" | "google",
): Promise<void> {
  await safeTrack(() => logEvent(user, "user_signed_up", undefined, { method }));
}

export async function trackUserOnboarded(user: StatsigUser, stepsCompleted: number): Promise<void> {
  await safeTrack(() => logEvent(user, "user_onboarded", stepsCompleted, { stepsCompleted }));
}

export async function trackUserInvitedMember(
  user: StatsigUser,
  organizationId: string,
  role: MemberRole,
): Promise<void> {
  await safeTrack(() => logEvent(user, "user_invited_member", undefined, { organizationId, role }));
}

export async function trackOrgCreated(
  user: StatsigUser,
  organizationId: string,
  name: string,
): Promise<void> {
  await safeTrack(() => logEvent(user, "org_created", undefined, { organizationId, name }));
}

// ============================================================
// Activation Funnel
// ============================================================

export async function trackActivationStepReached(
  user: StatsigUser,
  step: ActivationStep,
  daysFromSignup: number,
): Promise<void> {
  await safeTrack(() =>
    logEvent(user, "activation_step_reached", undefined, { step, daysFromSignup }),
  );
}

export async function trackUserActivated(
  user: StatsigUser,
  metadata: EventMetadata["user_activated"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "user_activated", metadata.daysToActivation, metadata));
}

// ============================================================
// Engagement & Health
// ============================================================

export async function trackSessionStarted(
  user: StatsigUser,
  isReturningUser: boolean,
  daysSinceLastVisit?: number,
): Promise<void> {
  await safeTrack(() =>
    logEvent(user, "session_started", undefined, { isReturningUser, daysSinceLastVisit }),
  );
}

// Activation signal - came back after 24+ hours
export async function trackReturnVisit(
  user: StatsigUser,
  metadata: EventMetadata["return_visit"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "return_visit", metadata.daysSinceLastVisit, metadata));
}

export async function trackPurposefulReturn(
  user: StatsigUser,
  metadata: EventMetadata["purposeful_return"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "purposeful_return", undefined, metadata));
}

export async function trackFeatureUsed(
  user: StatsigUser,
  featureName: string,
  context?: string,
): Promise<void> {
  await safeTrack(() => logEvent(user, "feature_used", undefined, { featureName, context }));
}

// ============================================================
// Upload Friction
// ============================================================

export async function trackUploadStarted(
  user: StatsigUser,
  metadata: EventMetadata["upload_started"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "upload_started", metadata.fileCount, metadata));
}

export async function trackUploadAbandoned(
  user: StatsigUser,
  metadata: EventMetadata["upload_abandoned"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "upload_abandoned", undefined, metadata));
}

export async function trackUploadError(
  user: StatsigUser,
  metadata: EventMetadata["upload_error"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "upload_error", undefined, metadata));
}

export async function trackUploadRetry(
  user: StatsigUser,
  metadata: EventMetadata["upload_retry"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "upload_retry", metadata.attemptNumber, metadata));
}

// Fixable friction - wrong format, too big
export async function trackUploadValidationFailed(
  user: StatsigUser,
  metadata: EventMetadata["upload_validation_failed"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "upload_validation_failed", undefined, metadata));
}

// ============================================================
// Preview Engagement & Friction
// ============================================================

export async function trackPreviewLoaded(
  user: StatsigUser,
  metadata: EventMetadata["preview_loaded"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "preview_loaded", metadata.loadTimeMs, metadata));
}

export async function trackPreviewToDownload(
  user: StatsigUser,
  metadata: EventMetadata["preview_to_download"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "preview_to_download", undefined, metadata));
}

// Preview friction - broken files or viewer issues
export async function trackPreviewFailed(
  user: StatsigUser,
  metadata: EventMetadata["preview_failed"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "preview_failed", undefined, metadata));
}

// ============================================================
// Conversion Funnel - Billing and subscription events
// ============================================================

export async function trackPricingPageViewed(
  user: StatsigUser,
  currentTier: SubscriptionTier,
  source?: string,
): Promise<void> {
  await safeTrack(() => logEvent(user, "pricing_page_viewed", undefined, { currentTier, source }));
}

export async function trackCheckoutStarted(
  user: StatsigUser,
  targetTier: SubscriptionTier,
  currentTier: SubscriptionTier,
  trigger?: "storage_limit" | "feature_gate" | "organic",
): Promise<void> {
  await safeTrack(() =>
    logEvent(user, "checkout_started", undefined, { targetTier, currentTier, trigger }),
  );
}

export async function trackSubscriptionActivated(
  user: StatsigUser,
  tier: SubscriptionTier,
  previousTier?: SubscriptionTier,
): Promise<void> {
  await safeTrack(() =>
    logEvent(user, "subscription_activated", undefined, { tier, previousTier }),
  );
}

export async function trackSubscriptionCanceled(
  user: StatsigUser,
  tier: SubscriptionTier,
  reason?: string,
): Promise<void> {
  await safeTrack(() => logEvent(user, "subscription_canceled", undefined, { tier, reason }));
}

export async function trackStorageLimitWarning(
  user: StatsigUser,
  metadata: EventMetadata["storage_limit_warning"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "storage_limit_warning", metadata.usagePercent, metadata));
}

export async function trackStorageLimitBlocked(
  user: StatsigUser,
  metadata: EventMetadata["storage_limit_blocked"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "storage_limit_blocked", undefined, metadata));
}

// ============================================================
// Library Health - Periodic snapshots
// ============================================================

export async function trackLibraryHealthSnapshot(
  user: StatsigUser,
  metadata: EventMetadata["library_health_snapshot"],
): Promise<void> {
  await safeTrack(() => logEvent(user, "library_health_snapshot", metadata.totalModels, metadata));
}

// ============================================================
// Errors
// ============================================================

export async function trackErrorEncountered(
  user: StatsigUser,
  errorCategory: ErrorCategory,
  errorType: string,
  errorMessage: string,
  context?: string,
): Promise<void> {
  await safeTrack(() =>
    logEvent(user, "error_encountered", undefined, {
      errorCategory,
      errorType,
      errorMessage,
      context,
    }),
  );
}
