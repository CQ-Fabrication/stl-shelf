import { useInfiniteQuery } from "@tanstack/react-query";
import { listOrgActivity } from "@/server/functions/activity";

export const ORG_ACTIVITY_QUERY_KEY = ["org-activity"] as const;

type ListOrgActivityResult = Awaited<ReturnType<typeof listOrgActivity>>;
type ActivityCursor = NonNullable<ListOrgActivityResult["nextCursor"]>;

export type OrgActivityEvent = ListOrgActivityResult["events"][number];

/**
 * Reverse-chronological feed of destructive org events. Keyset-paginated on the
 * server via {createdAt, id}; the client just threads nextCursor through
 * pageParam. The settings route is already admin+ gated, so no `enabled` guard.
 */
export function useOrgActivity() {
  return useInfiniteQuery({
    queryKey: ORG_ACTIVITY_QUERY_KEY,
    queryFn: ({ pageParam }) => listOrgActivity({ data: { cursor: pageParam ?? undefined } }),
    initialPageParam: undefined as ActivityCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
