import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema/auth";
import { canManageTags, type Role } from "@/lib/permissions";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logAuditEvent, logErrorEvent, shouldLogServerError } from "@/lib/logging";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { assertWriteAllowed } from "@/server/services/billing/retention.service";
import { TagNameTakenError, tagService } from "@/server/services/tags/tag.service";

const TAG_NAME_MAX = 64;

const renameTagSchema = z.object({
  tagId: z.string().uuid(),
  newName: z.string().min(1).max(TAG_NAME_MAX),
});

const mergeTagsSchema = z.object({
  sourceTagId: z.string().uuid(),
  targetTagId: z.string().uuid(),
});

const deleteTagSchema = z.object({
  tagId: z.string().uuid(),
});

const updateTagColorSchema = z.object({
  tagId: z.string().uuid(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a #rrggbb hex value"),
});

// Shared authorization for org tag management. Tag operations are org-wide
// (not per-model), so there's no ownership check — just org resolution, the
// write gate, and the admin+ role check (mirrors assertCanEditModel's shape).
async function assertCanManageTags(context: AuthenticatedContext): Promise<void> {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, context.organizationId),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  assertWriteAllowed({
    graceDeadline: org.graceDeadline,
    accountDeletionDeadline: org.accountDeletionDeadline ?? context.accountDeletionDeadline,
  });

  if (!canManageTags(context.memberRole as Role)) {
    throw new Error("You don't have permission to manage tags");
  }
}

// List all org tags (incl. orphans, with ids) for the tag manager.
export const getOrgTags = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    await assertCanManageTags(context);
    return await tagService.getOrgTags(context.organizationId);
  });

// Rename a tag. Returns a discriminated result so the UI can offer a merge on a
// name collision instead of failing — the service never auto-merges.
export const renameTag = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(renameTagSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof renameTagSchema>;
      context: AuthenticatedContext;
    }) => {
      await assertCanManageTags(context);

      try {
        const result = await tagService.renameTag({
          tagId: data.tagId,
          newName: data.newName,
          organizationId: context.organizationId,
        });

        if (result.status === "renamed") {
          logAuditEvent("tag.renamed", {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
            tagId: data.tagId,
            newName: data.newName.trim().toLowerCase(),
          });
        }

        return result;
      } catch (error) {
        if (error instanceof TagNameTakenError) {
          return { status: "name_taken" as const, existingTagId: error.existingTagId };
        }

        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
            tagId: data.tagId,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.tag.rename_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Merge the source tag into the target (relink models, delete source, recount).
export const mergeTags = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(mergeTagsSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof mergeTagsSchema>;
      context: AuthenticatedContext;
    }) => {
      await assertCanManageTags(context);

      try {
        const result = await tagService.mergeTags({
          sourceTagId: data.sourceTagId,
          targetTagId: data.targetTagId,
          organizationId: context.organizationId,
        });

        logAuditEvent("tag.merged", {
          organizationId: context.organizationId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          sourceTagId: data.sourceTagId,
          targetTagId: data.targetTagId,
          modelsRelinked: result.modelsRelinked,
          alreadyHadTarget: result.alreadyHadTarget,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
            sourceTagId: data.sourceTagId,
            targetTagId: data.targetTagId,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.tag.merge_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Delete a tag (cascade removes its model links). Returns the affected-model
// count captured before deletion for the confirmation toast.
export const deleteTag = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteTagSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof deleteTagSchema>;
      context: AuthenticatedContext;
    }) => {
      await assertCanManageTags(context);

      try {
        const result = await tagService.deleteTag({
          tagId: data.tagId,
          organizationId: context.organizationId,
        });

        logAuditEvent("tag.deleted", {
          organizationId: context.organizationId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          tagId: data.tagId,
          affectedModels: result.affectedModels,
        });

        return result;
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
            tagId: data.tagId,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.tag.delete_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );

// Update a tag's color (#rrggbb hex).
export const updateTagColor = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(updateTagColorSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof updateTagColorSchema>;
      context: AuthenticatedContext;
    }) => {
      await assertCanManageTags(context);

      try {
        await tagService.updateTagColor({
          tagId: data.tagId,
          color: data.color,
          organizationId: context.organizationId,
        });

        logAuditEvent("tag.color_updated", {
          organizationId: context.organizationId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          tagId: data.tagId,
          color: data.color,
        });

        return { success: true };
      } catch (error) {
        if (shouldLogServerError(error)) {
          const errorContext = {
            organizationId: context.organizationId,
            userId: context.userId,
            ipAddress: context.ipAddress,
            tagId: data.tagId,
          };
          captureServerException(error, errorContext);
          logErrorEvent("error.tag.color_update_failed", {
            ...errorContext,
            ...getErrorDetails(error),
          });
        }
        throw error;
      }
    },
  );
