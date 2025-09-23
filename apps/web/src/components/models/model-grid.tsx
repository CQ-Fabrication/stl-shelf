import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from 'nuqs';
import { orpc } from '@/utils/orpc';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ModelCard } from './model-card';

const SKELETON_COUNT = 8;
const PAGINATION_DISPLAY_COUNT = 5;
const PAGINATION_EDGE_THRESHOLD = 3;
const PAGINATION_EDGE_OFFSET = 2;

export function ModelGrid() {
  const [search] = useQueryState('q', parseAsString.withDefault(''));
  const [tags] = useQueryState(
    'tags',
    parseAsArrayOf(parseAsString, ',').withDefault([])
  );
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  // Direct useQuery call
  const {
    data: modelsData,
    isLoading,
    error,
  } = useQuery(
    orpc.models.listModels.queryOptions({
      input: {
        page: page || 1,  // Ensure page is never null/undefined
        limit: 12,
        search: search || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }
    })
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    // Clear pagination when filters change - filters are managed by parent
    setPage(1);
  };

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-destructive">Failed to load models</div>
        <div className="text-muted-foreground text-sm">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results summary */}
      {modelsData && (
        <div className="text-muted-foreground text-sm">
          Showing{' '}
          {(modelsData.pagination.page - 1) * modelsData.pagination.limit + 1}-
          {Math.min(
            modelsData.pagination.page * modelsData.pagination.limit,
            modelsData.pagination.totalItems
          )}{' '}
          of {modelsData.pagination.totalItems} models
        </div>
      )}

      {/* Models grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div className="space-y-4" key={`skeleton-${i}`}>
              <Skeleton className="aspect-video rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : modelsData?.models.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-muted-foreground">No models found</div>
          {search || tags.length > 0 ? (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                Try adjusting your search or filters
              </div>
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-muted-foreground">
                No models found. Upload your first model using the button above.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modelsData?.models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {modelsData && modelsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {Array.from(
              {
                length: Math.min(
                  PAGINATION_DISPLAY_COUNT,
                  modelsData.pagination.totalPages
                ),
              },
              (_, i) => {
                const pageIndex = i + 1;
                let displayPage = pageIndex;

                if (
                  modelsData.pagination.totalPages > PAGINATION_DISPLAY_COUNT
                ) {
                  if (page <= PAGINATION_EDGE_THRESHOLD) {
                    displayPage = pageIndex;
                  } else if (
                    page >=
                    modelsData.pagination.totalPages - PAGINATION_EDGE_OFFSET
                  ) {
                    displayPage =
                      modelsData.pagination.totalPages -
                      (PAGINATION_DISPLAY_COUNT - 1) +
                      pageIndex;
                  } else {
                    displayPage = page - PAGINATION_EDGE_OFFSET + pageIndex;
                  }
                }

                return (
                  <Button
                    className="min-w-[40px]"
                    key={displayPage}
                    onClick={() => handlePageChange(displayPage)}
                    size="sm"
                    variant={page === displayPage ? 'default' : 'outline'}
                  >
                    {displayPage}
                  </Button>
                );
              }
            )}
          </div>

          <Button
            disabled={page === modelsData.pagination.totalPages}
            onClick={() => handlePageChange(page + 1)}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
