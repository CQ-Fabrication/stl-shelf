import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllAnnouncements,
  getRecentAnnouncements,
  getUnreadAnnouncements,
  getUnreadCount,
  markAnnouncementsAsRead,
} from "@/server/functions/announcements";

export const ANNOUNCEMENTS_QUERY_KEY = ["announcements"] as const;

/**
 * Hook to get unread announcements for the dropdown
 */
export function useUnreadAnnouncements() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, "unread"],
    queryFn: () => getUnreadAnnouncements(),
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    announcements: data?.announcements ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get recent announcements for the dropdown
 * Shows unread + recently read (within graceful period)
 * @param limit - Max number of announcements to show (default: 5)
 * @param gracePeriodDays - Days to keep showing read announcements (default: 7)
 */
export function useRecentAnnouncements(limit = 5, gracePeriodDays = 7) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, "recent", { limit, gracePeriodDays }],
    queryFn: () => getRecentAnnouncements({ data: { limit, gracePeriodDays } }),
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    announcements: data?.announcements ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get unread count only (for initial badge)
 */
export function useUnreadCount() {
  const { data, isLoading } = useQuery({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, "count"],
    queryFn: () => getUnreadCount(),
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    count: data?.count ?? 0,
    isLoading,
  };
}

/**
 * Hook for infinite scroll on /announcements page
 */
export function useInfiniteAnnouncements(limit = 20) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: [...ANNOUNCEMENTS_QUERY_KEY, "all", { limit }],
      queryFn: ({ pageParam }) =>
        getAllAnnouncements({
          data: {
            cursor: pageParam,
            limit,
          },
        }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const allAnnouncements = data?.pages.flatMap((page) => page.announcements) ?? [];

  return {
    announcements: allAnnouncements,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  };
}

/**
 * Hook to mark announcements as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (announcementIds: string[]) =>
      markAnnouncementsAsRead({ data: { announcementIds } }),
    onSuccess: () => {
      // Invalidate all announcement queries to refresh data
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
    },
  });
}
