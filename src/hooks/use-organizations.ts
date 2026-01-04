import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getActiveOrganizationFn, listOrganizationsFn } from "@/server/functions/auth";

/**
 * TanStack Query hook for listing organizations.
 *
 * Uses server function instead of Better Auth's nanostores-based hook
 * to properly integrate with TanStack Start's cache invalidation.
 */
export const useOrganizations = () => {
  const { data: session } = authClient.useSession();

  return useQuery({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const result = await listOrganizationsFn();
      return result.organizations;
    },
    enabled: Boolean(session?.user),
  });
};

/**
 * TanStack Query hook for getting the active organization.
 *
 * Uses server function instead of Better Auth's nanostores-based hook
 * to properly integrate with TanStack Start's cache invalidation.
 */
export const useActiveOrganization = () => {
  const { data: session } = authClient.useSession();

  return useQuery({
    queryKey: ["organizations", "active"],
    queryFn: () => getActiveOrganizationFn(),
    enabled: Boolean(session?.user),
  });
};
