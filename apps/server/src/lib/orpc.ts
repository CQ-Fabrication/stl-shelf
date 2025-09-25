import { ORPCError, os } from "@orpc/server";
import type { AuthenticatedContext, BaseContext } from "./context";

export const o = os.$context<BaseContext>();

export const publicProcedure = o;

export const protectedProcedure = o.use(({ context, next }) => {
  const session = context.session;

  if (!session?.user?.id) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
    });
  }

  const organizationId = session.session?.activeOrganizationId;
  if (!organizationId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "No active organization",
    });
  }

  return next({
    context: {
      session,
      organizationId,
      ipAddress: context.ipAddress,
    } satisfies AuthenticatedContext,
  });
});
