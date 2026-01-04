import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

/**
 * Get session on the server with proper cookie access.
 *
 * This is required for SSR because the client-side authClient
 * cannot access cookies during server-side rendering. When beforeLoad
 * runs on the server, it needs to use this server function to check
 * the session with the original request's cookies.
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return session;
});

/**
 * List organizations for the current user.
 *
 * Uses the server-side auth API which has access to the full
 * organization data including custom fields.
 */
export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return { organizations: [] };
  }

  const result = await auth.api.listOrganizations({ headers });
  return { organizations: result ?? [] };
});

/**
 * Get the active organization for the current session.
 *
 * Returns the full organization object including custom fields.
 */
export const getActiveOrganizationFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const result = await auth.api.getFullOrganization({ headers });
  return result;
});

/**
 * Set active organization for the current session.
 *
 * This updates the session's activeOrganizationId so subsequent
 * requests know which organization context to use.
 */
export const setActiveOrganizationFn = createServerFn({ method: "POST" })
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    await auth.api.setActiveOrganization({
      headers,
      body: { organizationId: data.organizationId },
    });
    return { success: true };
  });
