import { Link } from "@tanstack/react-router";
import { AlertCircle, Megaphone, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAsRead, useRecentAnnouncements } from "@/hooks/use-announcements";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { trackAnnouncementOpened, trackAnnouncementRead } from "@/lib/openpanel/client-events";
import { cn } from "@/lib/utils";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementEmptyState } from "./empty-state";

const READ_DELAY_MS = 3000;

export function AnnouncementDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { client } = useOpenPanelClient();

  // Snapshot of announcements shown while dropdown is open
  // This prevents UI from updating when markAsRead invalidates the query
  const [displayedAnnouncements, setDisplayedAnnouncements] = useState<
    Array<{
      id: string;
      title: string;
      body: string | null;
      ctaUrl: string | null;
      ctaLabel: string | null;
      createdAt: string;
      isRead: boolean;
    }>
  >([]);

  // Use recent announcements (unread + recently read within graceful period)
  const { announcements, unreadCount, isLoading, error, refetch } = useRecentAnnouncements(5, 7);
  const { mutate: markAsReadMutate } = useMarkAsRead();

  // Track if we've already snapshotted for this open session
  const hasSnapshotRef = useRef(false);
  // Prevent duplicate tracking/mutations while optimistic state is in flight.
  const readRequestedIdsRef = useRef<Set<string>>(new Set());

  // Snapshot announcements when dropdown opens
  useEffect(() => {
    if (isOpen && announcements.length > 0 && !hasSnapshotRef.current) {
      setDisplayedAnnouncements(announcements);
      hasSnapshotRef.current = true;
    }
    // Clear snapshot when dropdown closes
    if (!isOpen && hasSnapshotRef.current) {
      setDisplayedAnnouncements([]);
      hasSnapshotRef.current = false;
      readRequestedIdsRef.current.clear();
    }
  }, [isOpen, announcements]);

  // Track if we should show bounce animation (new announcements since last check)
  const prevCountRef = useRef(unreadCount);
  const shouldBounce = !hasAnimated && unreadCount > 0 && unreadCount !== prevCountRef.current;

  useEffect(() => {
    if (shouldBounce) {
      setHasAnimated(true);
      prevCountRef.current = unreadCount;
    }
  }, [shouldBounce, unreadCount]);

  // Handle the 3-second timer for marking unread as read
  useEffect(() => {
    const unreadIds = displayedAnnouncements
      .filter((a) => !a.isRead && !readRequestedIdsRef.current.has(a.id))
      .map((a) => a.id);

    if (!isOpen || unreadIds.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      const uniqueIds = Array.from(new Set(unreadIds)).filter(
        (id) => !readRequestedIdsRef.current.has(id),
      );
      if (uniqueIds.length === 0) return;

      uniqueIds.forEach((id) => {
        readRequestedIdsRef.current.add(id);
      });

      const uniqueIdSet = new Set(uniqueIds);
      setDisplayedAnnouncements((current) =>
        current.map((announcement) =>
          uniqueIdSet.has(announcement.id) && !announcement.isRead
            ? { ...announcement, isRead: true }
            : announcement,
        ),
      );

      trackAnnouncementRead(client, {
        location: "dropdown",
        source: "auto",
        count: uniqueIds.length,
      });
      markAsReadMutate(uniqueIds, {
        onError: () => {
          uniqueIds.forEach((id) => {
            readRequestedIdsRef.current.delete(id);
          });
          setDisplayedAnnouncements((current) =>
            current.map((announcement) =>
              uniqueIdSet.has(announcement.id) ? { ...announcement, isRead: false } : announcement,
            ),
          );
        },
      });
    }, READ_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [client, isOpen, displayedAnnouncements, markAsReadMutate]);

  const markAnnouncementsRead = useCallback(
    (ids: string[], source: "cta" | "view_all", announcementId?: string) => {
      const unreadIdSet = new Set(
        displayedAnnouncements.filter((announcement) => !announcement.isRead).map((a) => a.id),
      );
      const uniqueIds = Array.from(new Set(ids)).filter(
        (id) => unreadIdSet.has(id) && !readRequestedIdsRef.current.has(id),
      );
      if (uniqueIds.length === 0) return;

      uniqueIds.forEach((id) => {
        readRequestedIdsRef.current.add(id);
      });

      const uniqueIdSet = new Set(uniqueIds);
      setDisplayedAnnouncements((current) =>
        current.map((announcement) =>
          uniqueIdSet.has(announcement.id) && !announcement.isRead
            ? { ...announcement, isRead: true }
            : announcement,
        ),
      );

      trackAnnouncementRead(client, {
        location: "dropdown",
        source,
        count: uniqueIds.length,
        announcementId,
      });

      markAsReadMutate(uniqueIds, {
        onError: () => {
          uniqueIds.forEach((id) => {
            readRequestedIdsRef.current.delete(id);
          });
          setDisplayedAnnouncements((current) =>
            current.map((announcement) =>
              uniqueIdSet.has(announcement.id) ? { ...announcement, isRead: false } : announcement,
            ),
          );
        },
      });
    },
    [client, displayedAnnouncements, markAsReadMutate],
  );

  // Handle CTA click - mark single announcement as read
  const handleCtaClick = useCallback(
    (id: string) => {
      markAnnouncementsRead([id], "cta", id);
      setIsOpen(false);
    },
    [markAnnouncementsRead],
  );

  // Handle "View all" click - mark all unread as read
  const handleViewAllClick = useCallback(() => {
    const unreadIds = displayedAnnouncements
      .filter((a) => !a.isRead && !readRequestedIdsRef.current.has(a.id))
      .map((a) => a.id);
    if (unreadIds.length > 0) {
      markAnnouncementsRead(unreadIds, "view_all");
    }
  }, [displayedAnnouncements, markAnnouncementsRead]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen);
      if (nextOpen) {
        trackAnnouncementOpened(client, {
          location: "dropdown",
          unreadCount,
          visibleCount: announcements.length,
        });
      }
    },
    [announcements.length, client, unreadCount],
  );

  const announcementsLabel =
    unreadCount > 0 ? "Announcements, " + unreadCount + " unread" : "Announcements";

  return (
    <DropdownMenu onOpenChange={handleOpenChange} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={announcementsLabel}
          className={cn("relative", shouldBounce && "animate-bounce")}
          size="icon"
          variant="ghost"
        >
          <Megaphone className="h-[1.2rem] w-[1.2rem]" />
          {/* Unread dot indicator */}
          {unreadCount > 0 && (
            <span className="-top-0.5 -right-0.5 absolute h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Announcements</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
              {unreadCount} new
            </span>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-destructive text-sm">Failed to load announcements</p>
                <p className="text-muted-foreground text-xs">Please try again</p>
              </div>
              <Button onClick={() => refetch()} size="sm" variant="outline">
                <RefreshCw className="mr-2 h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && displayedAnnouncements.length === 0 && (
            <AnnouncementEmptyState variant="dropdown" />
          )}

          {!isLoading && !error && displayedAnnouncements.length > 0 && (
            <div className="divide-y">
              {displayedAnnouncements.map((announcement) => (
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
                  variant="dropdown"
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Link
            className="flex w-full items-center justify-center py-1 text-primary text-sm hover:underline"
            onClick={handleViewAllClick}
            to="/announcements"
          >
            View all announcements
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
