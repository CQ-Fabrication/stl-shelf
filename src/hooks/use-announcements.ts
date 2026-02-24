import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllAnnouncements,
  getRecentAnnouncements,
  getUnreadAnnouncements,
  getUnreadCount,
  markAnnouncementsAsRead,
} from "@/server/functions/announcements";

export const ANNOUNCEMENTS_QUERY_KEY = ["announcements"] as const;

type ReadLikeAnnouncement = {
  id: string;
  isRead?: boolean;
  readAt?: string | null;
};

type AnnouncementsResponse = {
  announcements: ReadLikeAnnouncement[];
  unreadCount?: number;
};

type InfiniteAnnouncementsResponse = {
  pages: AnnouncementsResponse[];
  pageParams: unknown[];
  unreadCount?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function markReadInAnnouncements(
  announcements: ReadLikeAnnouncement[],
  announcementIdSet: Set<string>,
  readAtIso: string,
) {
  const hasReadStatus = announcements.some(
    (announcement) => typeof announcement.isRead === "boolean",
  );

  if (!hasReadStatus) {
    let removedCount = 0;
    const filtered = announcements.filter((announcement) => {
      const shouldRemove = announcementIdSet.has(announcement.id);
      if (shouldRemove) {
        removedCount += 1;
      }
      return !shouldRemove;
    });

    return {
      announcements: removedCount > 0 ? filtered : announcements,
      unreadMarkedCount: removedCount,
    };
  }

  let unreadMarkedCount = 0;
  const mapped = announcements.map((announcement) => {
    if (!announcementIdSet.has(announcement.id) || announcement.isRead) {
      return announcement;
    }

    unreadMarkedCount += 1;
    return {
      ...announcement,
      isRead: true,
      readAt: announcement.readAt ?? readAtIso,
    };
  });

  return {
    announcements: unreadMarkedCount > 0 ? mapped : announcements,
    unreadMarkedCount,
  };
}

function patchAnnouncementsData(
  currentData: unknown,
  announcementIdSet: Set<string>,
  readAtIso: string,
) {
  if (!isObject(currentData)) {
    return currentData;
  }

  if (Array.isArray(currentData.pages)) {
    const infiniteData = currentData as InfiniteAnnouncementsResponse;
    let totalUnreadMarked = 0;
    let didChange = false;

    const nextPages = infiniteData.pages.map((page) => {
      if (!isObject(page) || !Array.isArray(page.announcements)) {
        return page;
      }

      const { announcements, unreadMarkedCount } = markReadInAnnouncements(
        page.announcements,
        announcementIdSet,
        readAtIso,
      );

      if (unreadMarkedCount === 0) {
        return page;
      }

      didChange = true;
      totalUnreadMarked += unreadMarkedCount;
      return {
        ...page,
        announcements,
        unreadCount:
          typeof page.unreadCount === "number"
            ? Math.max(0, page.unreadCount - unreadMarkedCount)
            : page.unreadCount,
      };
    });

    if (!didChange) {
      return currentData;
    }

    return {
      ...infiniteData,
      pages: nextPages,
      unreadCount:
        typeof infiniteData.unreadCount === "number"
          ? Math.max(0, infiniteData.unreadCount - totalUnreadMarked)
          : infiniteData.unreadCount,
    };
  }

  if (!Array.isArray(currentData.announcements)) {
    return currentData;
  }

  const announcementsData = currentData as AnnouncementsResponse;
  const { announcements, unreadMarkedCount } = markReadInAnnouncements(
    announcementsData.announcements,
    announcementIdSet,
    readAtIso,
  );

  if (unreadMarkedCount === 0) {
    return currentData;
  }

  return {
    ...announcementsData,
    announcements,
    unreadCount:
      typeof announcementsData.unreadCount === "number"
        ? Math.max(0, announcementsData.unreadCount - unreadMarkedCount)
        : announcementsData.unreadCount,
  };
}

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
    mutationFn: (announcementIds: string[]) => {
      const uniqueIds = Array.from(new Set(announcementIds));

      if (uniqueIds.length === 0) {
        return Promise.resolve({ success: true });
      }

      return markAnnouncementsAsRead({ data: { announcementIds: uniqueIds } });
    },
    onMutate: async (announcementIds) => {
      const uniqueIds = Array.from(new Set(announcementIds));
      if (uniqueIds.length === 0) {
        return { previousQueries: [] as Array<[readonly unknown[], unknown]> };
      }

      await queryClient.cancelQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });

      const previousQueries = queryClient.getQueriesData({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
      });
      const announcementIdSet = new Set(uniqueIds);
      const readAtIso = new Date().toISOString();

      queryClient.setQueriesData({ queryKey: ANNOUNCEMENTS_QUERY_KEY }, (currentData) =>
        patchAnnouncementsData(currentData, announcementIdSet, readAtIso),
      );

      return { previousQueries };
    },
    onError: (_error, _announcementIds, context) => {
      context?.previousQueries.forEach(([queryKey, previousData]) => {
        queryClient.setQueryData(queryKey, previousData);
      });
    },
    onSettled: () => {
      // Sync with authoritative server state after optimistic update.
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY });
    },
  });
}
