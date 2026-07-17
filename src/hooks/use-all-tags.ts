import { queryOptions, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { getAllTags } from "@/server/functions/models";

// Single source of truth for the org tags query key/options, so the SSR
// prefetch in library.tsx and every client consumer share the same cache entry.
export const TAGS_QUERY_KEY = ["tags", "all"] as const;

export const tagsQueryOptions = () =>
  queryOptions({
    queryKey: TAGS_QUERY_KEY,
    queryFn: () => getAllTags(),
  });

/**
 * Hook to fetch all tags for the organization.
 * Only runs when user is authenticated and has an active organization.
 */
export function useAllTags() {
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = useActiveOrganization();

  const { data, isLoading, error } = useQuery({
    ...tagsQueryOptions(),
    enabled: Boolean(session?.user && activeOrg?.id),
  });

  return {
    tags: data ?? [],
    isLoading: !session?.user || !activeOrg?.id || isLoading,
    error,
  };
}
