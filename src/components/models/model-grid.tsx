import { Loader2 } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteModels } from "@/hooks/use-infinite-models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";
import { ModelCard } from "./model-card";

export function ModelGrid() {
  const [search] = useQueryState("q", parseAsString.withDefault(""));
  const [tags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  );

  const {
    models,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteModels({ search, tags });

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-destructive">Failed to load models</div>
        <div className="text-muted-foreground text-sm">{error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (models.length === 0) {
    const hasFilters = Boolean(search || tags.length > 0);
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "text-muted-foreground text-sm transition-opacity duration-200",
          isFetching && "opacity-50"
        )}
      >
        Showing {models.length} model{models.length !== 1 ? "s" : ""}
        {isFetching && (
          <span className="ml-2 text-muted-foreground">• Updating...</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-8 flex justify-center" ref={loadMoreRef}>
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more models...</span>
            </div>
          ) : (
            <Button onClick={() => fetchNextPage()} size="lg" variant="outline">
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
