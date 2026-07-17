import { Link } from "@tanstack/react-router";
import { History, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientAvatar } from "@/components/ui/gradient-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgActivity, type OrgActivityEvent } from "@/hooks/use-org-activity";

/** Relative time (e.g. "2 hours ago"), matching the announcement card convention. */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return date.toLocaleDateString();
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "Just now";
}

function ModelRef({ event }: { event: OrgActivityEvent }) {
  const name = event.model?.name ?? event.modelName ?? "Unknown model";

  if (event.model) {
    return (
      <Link
        className="font-medium hover:text-brand hover:underline"
        params={{ modelId: event.model.id }}
        to="/models/$modelId"
      >
        {name}
      </Link>
    );
  }

  return (
    <span className="font-medium">
      {name} <span className="font-normal text-muted-foreground">(deleted)</span>
    </span>
  );
}

function ActivityRow({ event }: { event: OrgActivityEvent }) {
  const actorName = event.actor?.name ?? "Unknown user";
  const versionLabel = event.version?.label ?? event.versionLabel;
  const absoluteTime = new Date(event.createdAt).toLocaleString();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <GradientAvatar
        id={event.actor?.id ?? "unknown"}
        name={actorName}
        size="sm"
        src={event.actor?.image ?? undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-medium">{actorName}</span>{" "}
          {event.event === "model.deleted" ? (
            <>
              deleted model <ModelRef event={event} />
            </>
          ) : (
            <>
              removed file{" "}
              <span className="font-medium">{event.originalName || event.filename}</span> from{" "}
              <ModelRef event={event} />
              {versionLabel ? (
                <>
                  {" · "}
                  <span className="text-muted-foreground">{versionLabel}</span>
                </>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <span title={absoluteTime}>{formatRelativeTime(event.createdAt)}</span>
          {event.ipAddress ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono">{event.ipAddress}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrganizationActivity() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useOrgActivity();

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "100px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton className="h-16 w-full rounded-lg" key={i} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Failed to load activity. Please try again.
        </CardContent>
      </Card>
    );
  }

  const events = data?.pages.flatMap((page) => page.events) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Destructive actions across your organization show up here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <History className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-sm">No activity yet</p>
            <p className="text-muted-foreground text-sm">
              When files are removed or models are deleted, those actions appear here.
            </p>
          </div>
        ) : (
          <>
            {events.map((event) => (
              <ActivityRow event={event} key={event.id} />
            ))}
            {hasNextPage ? (
              <div className="flex justify-center pt-2" ref={loadMoreRef}>
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more…</span>
                  </div>
                ) : (
                  <Button onClick={() => fetchNextPage()} size="sm" variant="outline">
                    Load more
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
