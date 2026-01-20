/**
 * Print Profiles Server Functions
 *
 * Server functions for managing print profiles (3MF slicer files).
 */

import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { printProfileService } from "@/server/services/models/print-profile.service";
import { logAuditEvent, logErrorEvent, getErrorDetails, shouldLogServerError } from "@/lib/logging";
import { captureServerException } from "@/lib/error-tracking.server";

// ============================================================
// Validators
// ============================================================

const listProfilesSchema = z.object({
  versionId: z.string().uuid(),
});

const deleteProfileSchema = z.object({
  profileId: z.string().uuid(),
});

const submitFeedbackSchema = z.object({
  profileId: z.string().uuid(),
  slicerName: z.string().min(1).max(100),
});

const getDownloadInfoSchema = z.object({
  profileId: z.string().uuid(),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * List all print profiles for a version
 */
export const listPrintProfiles = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listProfilesSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof listProfilesSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        const profiles = await printProfileService.listProfiles(
          data.versionId,
          context.organizationId,
        );

        return { profiles };
      } catch (error) {
        if (shouldLogServerError(error)) {
          logErrorEvent("list_print_profiles_failed", getErrorDetails(error));
          captureServerException(error as Error, {
            extra: { versionId: data.versionId },
          });
        }
        throw error;
      }
    },
  );

/**
 * Upload a new print profile (3MF file)
 * Returns the profile or conflict info if a similar printer exists
 */
export const uploadPrintProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const versionId = input.get("versionId") as string;
    const file = input.get("file") as File | null;

    if (!versionId) {
      throw new Error("Version ID is required");
    }
    if (!file) {
      throw new Error("File is required");
    }

    return { versionId, file };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: { versionId: string; file: File };
      context: AuthenticatedContext;
    }) => {
      try {
        const result = await printProfileService.uploadProfile({
          versionId: data.versionId,
          organizationId: context.organizationId,
          file: data.file,
        });

        if ("success" in result && result.success) {
          logAuditEvent("print_profile_uploaded", {
            profileId: result.profile.id,
            versionId: data.versionId,
            printerName: result.profile.printerName,
            slicerType: result.profile.slicerType,
            userId: context.userId,
            organizationId: context.organizationId,
          });
        }

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          logErrorEvent("upload_print_profile_failed", getErrorDetails(error));
          captureServerException(error as Error, {
            extra: { versionId: data.versionId },
          });
        }
        throw error;
      }
    },
  );

/**
 * Delete a print profile and its associated file
 */
export const deletePrintProfile = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteProfileSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof deleteProfileSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        await printProfileService.deleteProfile(data.profileId, context.organizationId);

        logAuditEvent("print_profile_deleted", {
          profileId: data.profileId,
          userId: context.userId,
          organizationId: context.organizationId,
        });

        return { success: true };
      } catch (error) {
        if (shouldLogServerError(error)) {
          logErrorEvent("delete_print_profile_failed", getErrorDetails(error));
          captureServerException(error as Error, {
            extra: { profileId: data.profileId },
          });
        }
        throw error;
      }
    },
  );

/**
 * Resolve a conflict when uploading a profile with a similar printer name
 */
export const resolveProfileConflict = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const versionId = input.get("versionId") as string;
    const existingProfileId = input.get("existingProfileId") as string;
    const action = input.get("action") as "replace" | "keep_both";
    const file = input.get("file") as File | null;

    if (!versionId) throw new Error("Version ID is required");
    if (!existingProfileId) throw new Error("Existing profile ID is required");
    if (!action || !["replace", "keep_both"].includes(action)) {
      throw new Error("Valid action is required");
    }
    if (!file) throw new Error("File is required");

    return { versionId, existingProfileId, action, file };
  })
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: {
        versionId: string;
        existingProfileId: string;
        action: "replace" | "keep_both";
        file: File;
      };
      context: AuthenticatedContext;
    }) => {
      try {
        const profile = await printProfileService.resolveConflict({
          versionId: data.versionId,
          organizationId: context.organizationId,
          existingProfileId: data.existingProfileId,
          file: data.file,
          action: data.action,
        });

        logAuditEvent("print_profile_conflict_resolved", {
          profileId: profile.id,
          versionId: data.versionId,
          action: data.action,
          existingProfileId: data.existingProfileId,
          userId: context.userId,
          organizationId: context.organizationId,
        });

        return { success: true, profile };
      } catch (error) {
        if (shouldLogServerError(error)) {
          logErrorEvent("resolve_profile_conflict_failed", getErrorDetails(error));
          captureServerException(error as Error, {
            extra: { versionId: data.versionId, action: data.action },
          });
        }
        throw error;
      }
    },
  );

/**
 * Submit feedback when a 3MF file's slicer couldn't be detected
 */
export const submitSlicerFeedback = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(submitFeedbackSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof submitFeedbackSchema>;
      context: AuthenticatedContext;
    }) => {
      // Log the feedback for future slicer support
      logAuditEvent("unknown_slicer_feedback", {
        profileId: data.profileId,
        reportedSlicer: data.slicerName,
        userId: context.userId,
        organizationId: context.organizationId,
      });

      return { success: true };
    },
  );

/**
 * Get download info for a profile (presigned URL)
 */
export const getProfileDownloadInfo = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getDownloadInfoSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof getDownloadInfoSchema>;
      context: AuthenticatedContext;
    }) => {
      try {
        const downloadInfo = await printProfileService.getProfileDownloadInfo(
          data.profileId,
          context.organizationId,
        );

        return downloadInfo;
      } catch (error) {
        if (shouldLogServerError(error)) {
          logErrorEvent("get_profile_download_info_failed", getErrorDetails(error));
          captureServerException(error as Error, {
            extra: { profileId: data.profileId },
          });
        }
        throw error;
      }
    },
  );
