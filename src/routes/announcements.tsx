import { infiniteQueryOptions } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { AnnouncementEmptyState } from "@/components/announcements/empty-state";
import { Button } from "@/components/ui/button";
import {
  useInfiniteAnnouncements,
  useMarkAsRead,
  ANNOUNCEMENTS_QUERY_KEY,
} from "@/hooks/use-announcements";
import { getAllAnnouncements } from "@/server/functions/announcements";

const LIMIT = 20;

// Query options for SSR prefetch
export const announcementsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: [...ANNOUNCEMENTS_QUERY_KEY, "all", { limit: LIMIT }],
    queryFn: ({ pageParam }) =>
      getAllAnnouncements({
        data: {
          cursor: pageParam,
          limit: LIMIT,
        },
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

export const Route = createFileRoute("/announcements")({
  loader: async ({ context }) => {
    await context.queryClient.ensureInfiniteQueryData(announcementsQueryOptions());
  },
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { announcements, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteAnnouncements(LIMIT);
  const markAsRead = useMarkAsRead();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Mark unread announcements as read after 3 seconds of visibility
  const unreadIds = announcements.filter((a) => !a.isRead).map((a) => a.id);
  const unreadIdsKey = unreadIds.join(",");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (unreadIds.length === 0) return;

    timerRef.current = setTimeout(() => {
      markAsRead.mutate(unreadIds);
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIdsKey]); // Stable string key to detect changes in unread IDs

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle CTA click - mark single announcement as read
  const handleCtaClick = useCallback(
    (id: string) => {
      markAsRead.mutate([id]);
    },
    [markAsRead],
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">Announcements</h1>
        <p className="text-muted-foreground">
          Stay up to date with the latest news and updates from STL Shelf.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && announcements.length === 0 && <AnnouncementEmptyState variant="page" />}

      {!isLoading && announcements.length > 0 && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              body={announcement.body}
              createdAt={announcement.createdAt}
              ctaLabel={announcement.ctaLabel}
              ctaUrl={announcement.ctaUrl}
              id={announcement.id}
              isRead={announcement.isRead}
              key={announcement.id}
              onCtaClick={handleCtaClick}
              title={announcement.title}
              variant="page"
            />
          ))}

          {/* Load more trigger */}
          <div className="py-4" ref={loadMoreRef}>
            {isFetchingNextPage && (
              <div className="flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <Button className="w-full" onClick={() => fetchNextPage()} variant="outline">
                Load more
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
