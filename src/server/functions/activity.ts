import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { canAccessOrgSettings, type Role } from "@/lib/permissions";
import type { AuthenticatedContext } from "@/server/middleware/auth";
import { authMiddleware } from "@/server/middleware/auth";
import { activityService } from "@/server/services/models/activity.service";

const activityCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

const listOrgActivitySchema = z.object({
  cursor: activityCursorSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
});

// The activity feed is admin+ only, matching the settings route guard
// (canAccessSettings). It's a read, so there's no write gate — admins can
// review destructive history even while the org is in grace/deletion.
function assertCanViewActivity(context: AuthenticatedContext): void {
  if (!canAccessOrgSettings(context.memberRole as Role)) {
    throw new Error("You don't have permission to view organization activity");
  }
}

// Reverse-chronological feed of destructive events, org-scoped via context only.
export const listOrgActivity = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(listOrgActivitySchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof listOrgActivitySchema>;
      context: AuthenticatedContext;
    }) => {
      assertCanViewActivity(context);

      return await activityService.listOrgActivity({
        organizationId: context.organizationId,
        cursor: data.cursor,
        limit: data.limit,
      });
    },
  );
